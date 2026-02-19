/**
 * Auth lifecycle: one AuthContext, one identity effect, single-flight refresh, atomic logout.
 *
 * Token model:
 * - Guest: Identity / Send OTP / Verify OTP only. Invalid → logout + identity effect re-runs when needsGuest.
 * - Access: All authenticated APIs. 401 + TOKEN_EXPIRED → refresh once → retry once (requestClient). Else logout.
 * - Refresh: Only to get new access token. Fail → logout. Never retry refresh. Never refresh while serverUnavailable.
 *
 * Server vs auth: Server errors (5xx/HTML/CORS/fetch) → show Server Unavailable, never logout. Auth errors (401, refresh fail) → doLogout, never server screen. handleUnauthorized no-ops when isServerUnavailableActive().
 *
 * Identity: Runs only when no access, no refresh, no guest, and !identityInFlight (module-level). One effect; retryGuestIdentity() is a one-off call with same guard. No retry trigger; no loop.
 *
 * Logout: doLogout clears state; performLogout() guards with logoutInProgress so multiple calls are no-ops. Server errors never call logout.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchIdentity, refreshTokens, isTokenVersionMismatch, type VerifyOtpResponse } from "@/lib/auth-api";
import {
  setRefreshHandler,
  setOnUnauthorizedHandler,
  getIdentityInFlight,
  setIdentityInFlight,
  getLogoutInProgress,
  setLogoutInProgress,
} from "@/lib/auth-bridge";
import { setHubId } from "@/lib/hub-bridge";
import { isServerUnavailableError } from "@/lib/server-unavailable";
import { isServerUnavailableActive } from "@/lib/server-unavailable-bridge";

const AUTH_STORAGE_KEY = "@entry_app_auth";

/** Allowed app roles (lowercase). If ANY role in user array matches, user is allowed. */
const ALLOWED_ROLES = ["guard", "hub_manager"] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  userType?: string;
};

type StoredAuth = {
  guestToken: string;
  identityId: string;
  accessToken: string;
  refreshToken: string;
  tokenVersion: number;
  user: AuthUser | null;
  /** Normalized role names (lowercase). Source: user.roles[].name or user.userRoles[].role.name. */
  roles: string[];
  /** Hub id at index 0 only. Source: user.hubs[0] or user.userHubs[0]. */
  selectedHubId: string | null;
};

const defaultStored: StoredAuth = {
  guestToken: "",
  identityId: "",
  accessToken: "",
  refreshToken: "",
  tokenVersion: 1,
  user: null,
  roles: [],
  selectedHubId: null,
};

/** After logout/session expired: no guestToken (must fetch new one). Clear hub globally. */
function clearedStored(keepIdentityId = ""): StoredAuth {
  return { ...defaultStored, guestToken: "", identityId: keepIdentityId };
}

/** Extract role names from verify response user; normalize to lowercase. */
function extractRoles(user: NonNullable<VerifyOtpResponse["data"]>["user"]): string[] {
  const fromRoles = user.roles?.map((r) => (r.name ?? "").trim().toLowerCase()).filter(Boolean) ?? [];
  const fromUserRoles = user.userRoles?.map((ur) => (ur.role?.name ?? "").trim().toLowerCase()).filter(Boolean) ?? [];
  const set = new Set<string>([...fromRoles, ...fromUserRoles]);
  return Array.from(set);
}

/** Pick hub at index 0 only. */
function extractSelectedHubId(user: NonNullable<VerifyOtpResponse["data"]>["user"]): string | null {
  const fromHubs = user.hubs?.[0]?.id?.trim();
  if (fromHubs) return fromHubs;
  const first = user.userHubs?.[0];
  if (first?.hubId?.trim()) return first.hubId.trim();
  if (first?.hub?.id?.trim()) return first.hub.id.trim();
  return null;
}

/** First allowed role in array (guard or hm/hub_manager); used globally for navigation. "hm" normalized to hub_manager. */
function getAllowedRole(roles: string[]): AllowedRole | null {
  for (const r of roles) {
    if (r === "guard") return "guard";
    if (r === "hub_manager" || r === "hm") return "hub_manager";
    if (ALLOWED_ROLES.includes(r as AllowedRole)) return r as AllowedRole;
  }
  return null;
}

/** Given verify response data, return allowedRole and whether user has a hub. Use after setTokensAfterVerify to decide navigation without waiting for context update. */
export function getRoleAndHubFromVerifyData(data: NonNullable<VerifyOtpResponse["data"]>): {
  allowedRole: AllowedRole | null;
  hasHub: boolean;
} {
  const roles = extractRoles(data.user);
  const selectedHubId = extractSelectedHubId(data.user);
  return { allowedRole: getAllowedRole(roles), hasHub: !!selectedHubId };
}

type AuthContextValue = {
  /** Restored from storage. */
  isRestored: boolean;
  /** Guest token is ready (identity API succeeded). Required before send OTP. */
  isGuestReady: boolean;
  /** Identity API or storage load failed. */
  authError: string | null;
  /** Set when refresh failed (401 or token version mismatch); app should redirect to login. */
  sessionExpired: boolean;
  /** Clear sessionExpired after redirecting to LoginOtp. */
  clearSessionExpiredFlag: () => void;
  /** Re-run guest identity fetch (e.g. after Retry on Server Unavailable). */
  retryGuestIdentity: () => void;
  /** True when user is logged in (has access token and user). */
  isAuthenticated: boolean;
  /** Logged-in user (from OTP verify). Null when only guest. */
  user: AuthUser | null;
  /** Valid guest token (after ensureGuestToken). Use for send OTP / verify OTP. */
  guestToken: string | null;
  /** Valid access token when logged in. Use for authenticated API calls. */
  accessToken: string | null;
  /** Role used for global navigation: guard | hm | null. From roles[] (any match allows). */
  allowedRole: AllowedRole | null;
  /** Hub id at index 0; attached as x-hub-id on API requests. */
  selectedHubId: string | null;
  /** True if allowedRole is guard or hm. */
  hasValidRole: boolean;
  /** True if selectedHubId is set (required for app usage). */
  hasHub: boolean;
  /** Ensure we have a valid guest token (call identity if needed). Call once at app start / before login. */
  ensureGuestToken: () => Promise<void>;
  /** After OTP verify: save user + tokens and persist. Returns a Promise; await so storage is written before navigating. */
  setTokensAfterVerify: (data: NonNullable<VerifyOtpResponse["data"]>) => Promise<void>;
  /** Update access token (e.g. after refresh). Persists to storage. */
  setAccessToken: (accessToken: string) => void;
  /** Logout: clear tokens and user from memory and storage. Redirect to login via sessionExpired/fetch-guest flow. */
  logout: () => void;
  /** @deprecated Use logout(). Logout: clear tokens and user. */
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): Promise<StoredAuth> {
  return AsyncStorage.getItem(AUTH_STORAGE_KEY).then((raw) => {
    if (!raw) return defaultStored;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredAuth>;
      const roles = Array.isArray(parsed.roles) ? parsed.roles.filter((r) => typeof r === "string") : [];
      const selectedHubId = typeof parsed.selectedHubId === "string" && parsed.selectedHubId.trim() ? parsed.selectedHubId.trim() : null;
      return {
        guestToken: typeof parsed.guestToken === "string" ? parsed.guestToken : "",
        identityId: typeof parsed.identityId === "string" ? parsed.identityId : "",
        accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : "",
        refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : "",
        tokenVersion: typeof parsed.tokenVersion === "number" ? parsed.tokenVersion : 1,
        user: parsed.user && parsed.user.id && parsed.user.name ? parsed.user : null,
        roles,
        selectedHubId,
      };
    } catch {
      return defaultStored;
    }
  });
}

function saveStored(s: StoredAuth): Promise<void> {
  return AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(s));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isRestored, setIsRestored] = useState(false);
  const [isGuestReady, setIsGuestReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [stored, setStored] = useState<StoredAuth>(defaultStored);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const persist = useCallback((next: StoredAuth): Promise<void> => {
    setStored(next);
    return saveStored(next);
  }, []);

  const clearSessionExpiredFlag = useCallback(() => {
    setSessionExpired(false);
    setAuthError(null);
  }, []);

  /** Inner: clear tokens, hub, user, roles; set sessionExpired. No guard. */
  const doLogout = useCallback(() => {
    setHubId(null);
    setAuthError("Your session expired. Please sign in again.");
    setSessionExpired(true);
    setIsGuestReady(false);
    persist(clearedStored(stored.identityId));
  }, [stored.identityId, persist]);

  /** Logout with guard: prevents multiple simultaneous logouts (module-level logoutInProgress). */
  const performLogout = useCallback(() => {
    if (getLogoutInProgress()) return;
    setLogoutInProgress(true);
    doLogout();
    setTimeout(() => setLogoutInProgress(false), 0);
  }, [doLogout]);

  /** Single-flight refresh: one refresh in flight; concurrent 401s wait. Server error → rethrow (no logout). */
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    const refreshToken = stored.refreshToken?.trim();
    if (!refreshToken) {
      performLogout();
      return null;
    }
    const promise = (async (): Promise<string | null> => {
      try {
        const tokens = await refreshTokens(refreshToken);
        persist({
          ...stored,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: stored.user,
          tokenVersion: stored.tokenVersion,
          guestToken: "",
          identityId: stored.identityId,
          roles: stored.roles,
          selectedHubId: stored.selectedHubId,
        });
        return tokens.accessToken;
      } catch (e) {
        if (isServerUnavailableError(e)) throw e;
        performLogout();
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = promise;
    return promise;
  }, [stored, persist, performLogout]);

  useEffect(() => {
    setRefreshHandler(refreshAccessToken);
    return () => setRefreshHandler(null);
  }, [refreshAccessToken]);

  /** 401 / refresh failed: logout only if Server Unavailable not active. Uses same performLogout guard. */
  const handleUnauthorized = useCallback(() => {
    if (isServerUnavailableActive()) return;
    performLogout();
  }, [performLogout]);

  useEffect(() => {
    setOnUnauthorizedHandler(handleUnauthorized);
    return () => setOnUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  /**
   * Identity runs only once per session when: no access, no refresh, no guest, and not already in-flight.
   * Module-level identityInFlight prevents multiple effect runs from starting parallel requests (fixes infinite loop).
   */
  useEffect(() => {
    const hasAccess = !!stored.accessToken?.trim();
    const hasRefresh = !!stored.refreshToken?.trim();
    const hasGuest = !!stored.guestToken?.trim();
    const needsGuest = isRestored && !hasAccess && !hasRefresh && !hasGuest;
    if (!needsGuest || getIdentityInFlight()) return;

    let cancelled = false;
    let wasServerError = false;
    setIdentityInFlight(true);
    fetchIdentity({
      guestToken: "",
      accessToken: undefined,
      refreshToken: undefined,
      tokenVersion: stored.tokenVersion ?? 1,
    })
      .then((data) => {
        if (cancelled || !data?.guestToken || !data?.id) return;
        const next: StoredAuth = { ...defaultStored, guestToken: data.guestToken, identityId: data.id };
        setStored(next);
        saveStored(next);
      })
      .catch((e) => {
        if (cancelled) return;
        if (isServerUnavailableError(e)) wasServerError = true;
        else setAuthError("Failed to prepare login");
      })
      .finally(() => {
        setIdentityInFlight(false);
        if (!cancelled && !wasServerError) setIsGuestReady(true);
      });
    return () => { cancelled = true; };
  }, [isRestored, stored.accessToken, stored.refreshToken, stored.guestToken]);

  /** Fetch or validate guest token. When we have access+refresh we only validate (do not store guestToken). When we have no access+refresh we fetch guest token. On 5xx/HTML/CORS/fetch failure: do NOT set sessionExpired, authError, or isGuestReady (showServerUnavailable already called). */
  const ensureGuestToken = useCallback(async () => {
    setAuthError(null);
    const hasAuth = !!(stored.accessToken?.trim() && stored.refreshToken?.trim());
    try {
      const params = hasAuth
        ? { guestToken: "", accessToken: stored.accessToken!, refreshToken: stored.refreshToken!, lastLoginUserId: stored.user?.id, tokenVersion: stored.tokenVersion }
        : { guestToken: stored.guestToken || "", accessToken: undefined, refreshToken: undefined, lastLoginUserId: undefined, tokenVersion: stored.tokenVersion };
      const data = await fetchIdentity(params);
      if (!data?.guestToken || !data?.id) {
        setIsGuestReady(true);
        return;
      }
      if (hasAuth) {
        persist({ ...stored, identityId: data.id });
      } else {
        persist({ ...stored, guestToken: data.guestToken, identityId: data.id });
      }
      setIsGuestReady(true);
    } catch (e) {
      if (isServerUnavailableError(e)) return;
      if (isTokenVersionMismatch(e)) {
        performLogout();
        return;
      }
      setAuthError(e instanceof Error ? e.message : "Failed to get guest token");
      setIsGuestReady(true);
    }
  }, [stored, persist, performLogout]);

  /** One-off identity call (e.g. after Retry on Server Unavailable). Guarded by identityInFlight so never stacks. */
  const retryGuestIdentity = useCallback(() => {
    if (getIdentityInFlight()) return;
    let wasServerError = false;
    setIdentityInFlight(true);
    fetchIdentity({
      guestToken: stored.guestToken?.trim() || "",
      accessToken: undefined,
      refreshToken: undefined,
      tokenVersion: stored.tokenVersion ?? 1,
    })
      .then((data) => {
        if (!data?.guestToken || !data?.id) return;
        const next: StoredAuth = { ...defaultStored, guestToken: data.guestToken, identityId: data.id };
        setStored(next);
        saveStored(next);
      })
      .catch((e) => {
        if (isServerUnavailableError(e)) wasServerError = true;
        else setAuthError(e instanceof Error ? e.message : "Failed to prepare login");
      })
      .finally(() => {
        setIdentityInFlight(false);
        if (!wasServerError) setIsGuestReady(true);
      });
  }, [stored.guestToken, stored.tokenVersion]);

  /**
   * App start: load auth from storage only. No identity call here.
   * - If we have refreshToken → treat as ready (refresh only when API returns 401).
   * - If we have guestToken → treat as ready (identity effect runs only when no guest; see below).
   * - If no guest → set isGuestReady false so single identity effect can run when needsGuest.
   */
  useEffect(() => {
    let cancelled = false;
    loadStored().then((s) => {
      if (cancelled) return;
      setStored(s);
      setIsRestored(true);
      setAuthError(null);
      if (s.selectedHubId?.trim()) setHubId(s.selectedHubId);
      const hasRefresh = !!s.refreshToken?.trim();
      const hasGuest = !!s.guestToken?.trim();
      if (hasRefresh || hasGuest) setIsGuestReady(true);
      else setIsGuestReady(false);
    });
    return () => { cancelled = true; };
  }, []);

  const setTokensAfterVerify = useCallback(
    async (data: NonNullable<VerifyOtpResponse["data"]>): Promise<void> => {
      const primaryPhone =
        data.user.userContacts?.find((c) => c.isPrimary)?.phoneNo ||
        data.user.userContacts?.[0]?.phoneNo ||
        data.user.name;
      const user: AuthUser = {
        id: data.user.id,
        name: data.user.name?.trim() || primaryPhone,
        phone: primaryPhone,
        userType: data.user.userType,
      };
      const roles = extractRoles(data.user);
      const selectedHubId = extractSelectedHubId(data.user);
      const next: StoredAuth = {
        ...stored,
        guestToken: "",
        identityId: data.identity?.id ?? stored.identityId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenVersion: stored.tokenVersion + 1,
        user,
        roles,
        selectedHubId,
      };
      await persist(next);
      setHubId(selectedHubId);
    },
    [stored, persist],
  );

  /** Logout: guarded so multiple calls are no-ops. Identity effect will run once when needsGuest (no access/refresh/guest). */
  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  const setAccessToken = useCallback(
    (accessToken: string) => {
      const next: StoredAuth = { ...stored, accessToken: accessToken.trim() };
      persist(next);
    },
    [stored, persist],
  );

  const allowedRole = getAllowedRole(stored.roles);
  const value: AuthContextValue = {
    isRestored,
    isGuestReady,
    authError,
    sessionExpired,
    clearSessionExpiredFlag,
    retryGuestIdentity,
    isAuthenticated: !!(stored.accessToken?.trim() && stored.user),
    user: stored.user,
    guestToken: stored.guestToken || null,
    accessToken: stored.accessToken || null,
    allowedRole,
    selectedHubId: stored.selectedHubId ?? null,
    hasValidRole: allowedRole != null,
    hasHub: !!(stored.selectedHubId?.trim()),
    ensureGuestToken,
    setTokensAfterVerify,
    setAccessToken,
    logout,
    clearAuth: logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      isRestored: true,
      isGuestReady: false,
      authError: null,
      sessionExpired: false,
      clearSessionExpiredFlag: () => {},
      retryGuestIdentity: () => {},
      isAuthenticated: false,
      user: null,
      guestToken: null,
      accessToken: null,
      allowedRole: null,
      selectedHubId: null,
      hasValidRole: false,
      hasHub: false,
      ensureGuestToken: async () => {},
      setTokensAfterVerify: () => Promise.resolve(),
      setAccessToken: () => {},
      logout: () => {},
      clearAuth: () => {},
    };
  }
  return ctx;
}
