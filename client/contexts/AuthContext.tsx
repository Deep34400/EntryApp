/**
 * Auth state machine: loading | guest | authenticated | unauthenticated.
 * Registers refresh and unauthorized handlers for requestClient.
 * Identity runs ONLY in one guarded useEffect (no identity in logout, refresh, requestClient, or retry handler).
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchIdentity, refreshToken, type VerifyOtpResponseData } from "@/lib/auth";
import { loadAuth, saveAuth, clearAuth, defaultStored, type StoredAuth } from "@/lib/storage";
import { setHubId } from "@/lib/hub-bridge";
import { ServerUnavailableError, isServerUnavailableError } from "@/lib/server-unavailable";

export type AuthStatus = "loading" | "guest" | "authenticated" | "unauthenticated";

const ALLOWED_ROLES = ["guard", "hub_manager"] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  userType?: string;
};

// ----- Callbacks for requestClient (no bridge). AuthContext sets these on mount. -----
type RefreshFn = () => Promise<string | null>;
let refreshHandler: RefreshFn | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function registerRefreshHandler(fn: RefreshFn | null): void {
  refreshHandler = fn;
}

export function getRefreshHandler(): RefreshFn | null {
  return refreshHandler;
}

export function registerUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}

// ----- Helpers -----
function extractRoles(user: VerifyOtpResponseData["user"]): string[] {
  const fromRoles = user.roles?.map((r) => (r.name ?? "").trim().toLowerCase()).filter(Boolean) ?? [];
  const fromUserRoles = user.userRoles?.map((ur) => (ur.role?.name ?? "").trim().toLowerCase()).filter(Boolean) ?? [];
  return Array.from(new Set([...fromRoles, ...fromUserRoles]));
}

function extractSelectedHubId(user: VerifyOtpResponseData["user"]): string | null {
  const fromHubs = user.hubs?.[0]?.id?.trim();
  if (fromHubs) return fromHubs;
  const first = user.userHubs?.[0];
  return first?.hubId?.trim() ?? first?.hub?.id?.trim() ?? null;
}

function getAllowedRole(roles: string[]): AllowedRole | null {
  for (const r of roles) {
    if (r === "guard") return "guard";
    if (r === "hub_manager" || r === "hm") return "hub_manager";
    if (ALLOWED_ROLES.includes(r as AllowedRole)) return r as AllowedRole;
  }
  return null;
}

export function getRoleAndHubFromVerifyData(data: VerifyOtpResponseData): {
  allowedRole: AllowedRole | null;
  hasHub: boolean;
} {
  const roles = extractRoles(data.user);
  const selectedHubId = extractSelectedHubId(data.user);
  return { allowedRole: getAllowedRole(roles), hasHub: !!selectedHubId };
}

function isTokenVersionMismatch(err: unknown): boolean {
  const e = err as { errorCode?: string; message?: string };
  if (e?.errorCode === "TOKEN_VERSION_MISMATCH") return true;
  const msg = e?.message ?? "";
  return /version|mismatch|invalid token/i.test(msg);
}

type AuthContextValue = {
  status: AuthStatus;
  isRestored: boolean;
  isGuestReady: boolean;
  authError: string | null;
  /** Set on logout so SessionExpiredHandler can redirect to login once. */
  sessionExpired: boolean;
  clearSessionExpiredFlag: () => void;
  isAuthenticated: boolean;
  user: AuthUser | null;
  guestToken: string | null;
  accessToken: string | null;
  allowedRole: AllowedRole | null;
  selectedHubId: string | null;
  hasValidRole: boolean;
  hasHub: boolean;
  ensureGuestToken: () => Promise<void>;
  setTokensAfterVerify: (data: VerifyOtpResponseData) => Promise<void>;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
  /** Alias for logout (clear session and get new guest). */
  clearAuth: () => void;
  retryGuestIdentity: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultValue: AuthContextValue = {
  status: "loading",
  isRestored: false,
  isGuestReady: false,
  authError: null,
  sessionExpired: false,
  clearSessionExpiredFlag: () => {},
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
  retryGuestIdentity: () => {},
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isRestored, setIsRestored] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [stored, setStored] = useState<StoredAuth>(defaultStored);
  const [retryIdentityKey, setRetryIdentityKey] = useState(0);
  const identityStartedRef = useRef(false);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const isGuestReady = status === "guest" || status === "authenticated";
  const isAuthenticated = status === "authenticated";

  const persist = useCallback((next: StoredAuth) => {
    setStored(next);
    return saveAuth(next);
  }, []);

  const clearSessionExpiredFlag = useCallback(() => {
    setSessionExpired(false);
    setAuthError(null);
  }, []);

  const logout = useCallback(async () => {
    setHubId(null);
    setAuthError("Your session expired. Please sign in again.");
    setSessionExpired(true);
    setStatus("unauthenticated");
    identityStartedRef.current = false;
    await clearAuth(stored.identityId);
    setStored({ ...defaultStored, guestToken: "", identityId: stored.identityId });
    // Do NOT call fetchIdentity here. Identity runs only in the single guarded useEffect.
  }, [stored.identityId]);

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  /**
   * Single-flight refresh. On success: save only new access token; keep existing refresh token (longer validity).
   * On failure (e.g. 401/expired): return null → requestClient calls notifyUnauthorized() → logout → identity → user logs in again (phone → OTP).
   */
  const refreshAccessToken = useCallback((): Promise<string | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    const refreshTokenValue = stored.refreshToken?.trim();
    if (!refreshTokenValue) {
      return Promise.resolve(null);
    }
    const promise = (async (): Promise<string | null> => {
      try {
        const tokens = await refreshToken(refreshTokenValue);
        const next: StoredAuth = {
          ...stored,
          accessToken: tokens.accessToken,
          refreshToken: refreshTokenValue,
          guestToken: "",
        };
        setStored(next);
        await saveAuth(next);
        return tokens.accessToken;
      } catch (e) {
        if (e instanceof ServerUnavailableError || isServerUnavailableError(e)) throw e;
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = promise;
    return promise;
  }, [stored]);

  useEffect(() => {
    registerRefreshHandler(refreshAccessToken);
    return () => registerRefreshHandler(null);
  }, [refreshAccessToken]);

  useEffect(() => {
    registerUnauthorizedHandler(handleUnauthorized);
    return () => registerUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  // Startup: load from storage. If access → authenticated; else if guest → guest; else run identity once.
  useEffect(() => {
    let cancelled = false;
    loadAuth().then((s) => {
      if (cancelled) return;
      setStored(s);
      setIsRestored(true);
      if (s.selectedHubId?.trim()) setHubId(s.selectedHubId);
      const hasAccess = !!s.accessToken?.trim();
      const hasRefresh = !!s.refreshToken?.trim();
      const hasGuest = !!s.guestToken?.trim();
      if (hasAccess && hasRefresh) setStatus("authenticated");
      else if (hasGuest) setStatus("guest");
      else {
        setStatus("unauthenticated");
        identityStartedRef.current = false;
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Identity: ONLY place that runs fetchIdentity for initial guest. Never in logout/refresh/requestClient.
  // Runs when: storage restored, no access, no refresh, no guest, identityStartedRef false.
  useEffect(() => {
    if (!isRestored) return;
    const hasAccess = !!stored.accessToken?.trim();
    const hasRefresh = !!stored.refreshToken?.trim();
    const hasGuest = !!stored.guestToken?.trim();
    const needsGuest = !hasAccess && !hasRefresh && !hasGuest;
    if (!needsGuest || identityStartedRef.current) return;

    identityStartedRef.current = true;
    let cancelled = false;
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
        saveAuth(next);
        setStatus("guest");
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ServerUnavailableError || isServerUnavailableError(e)) {
          identityStartedRef.current = false;
        } else {
          setAuthError("Failed to prepare login");
        }
      });
    return () => { cancelled = true; };
  }, [isRestored, stored.accessToken, stored.refreshToken, stored.guestToken, stored.tokenVersion, retryIdentityKey]);

  const retryGuestIdentity = useCallback(() => {
    const hasAccess = !!stored.accessToken?.trim();
    const hasRefresh = !!stored.refreshToken?.trim();
    if (hasAccess || hasRefresh) return;
    identityStartedRef.current = false;
    setRetryIdentityKey((k) => k + 1);
  }, [stored.accessToken, stored.refreshToken]);

  const ensureGuestToken = useCallback(async () => {
    setAuthError(null);
    const hasAuth = !!(stored.accessToken?.trim() && stored.refreshToken?.trim());
    try {
      const data = await fetchIdentity(
        hasAuth
          ? {
              guestToken: "",
              accessToken: stored.accessToken!,
              refreshToken: stored.refreshToken!,
              lastLoginUserId: stored.user?.id,
              tokenVersion: stored.tokenVersion,
            }
          : {
              guestToken: stored.guestToken || "",
              accessToken: undefined,
              refreshToken: undefined,
              tokenVersion: stored.tokenVersion ?? 1,
            }
      );
      if (!data?.guestToken || !data?.id) {
        setStatus("guest");
        return;
      }
      if (hasAuth) persist({ ...stored, identityId: data.id });
      else persist({ ...stored, guestToken: data.guestToken, identityId: data.id });
      setStatus("guest");
    } catch (e) {
      if (e instanceof ServerUnavailableError || isServerUnavailableError(e)) return;
      if (isTokenVersionMismatch(e)) {
        logout();
        return;
      }
      setAuthError(e instanceof Error ? e.message : "Failed to get guest token");
      setStatus("guest");
    }
  }, [stored, persist, logout]);

  const setTokensAfterVerify = useCallback(
    async (data: VerifyOtpResponseData): Promise<void> => {
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
      setStatus("authenticated");
    },
    [stored, persist]
  );

  const setAccessToken = useCallback(
    (accessToken: string) => {
      persist({ ...stored, accessToken: accessToken.trim() });
    },
    [stored, persist]
  );

  const allowedRole = getAllowedRole(stored.roles);
  const value: AuthContextValue = {
    status,
    isRestored,
    isGuestReady,
    authError,
    sessionExpired,
    clearSessionExpiredFlag,
    isAuthenticated,
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
    retryGuestIdentity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultValue;
}
