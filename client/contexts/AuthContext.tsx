/**
 * Auth state machine: loading | guest | authenticated | unauthenticated.
 * Registers refresh and unauthorized handlers for requestClient.
 * Identity runs ONLY in one guarded useEffect (no identity in logout, refresh, requestClient, or retry handler).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  fetchIdentity,
  refreshToken,
  type VerifyOtpResponseData,
} from "@/lib/auth";
import {
  loadAuth,
  saveAuth,
  clearAuth,
  defaultStored,
  type StoredAuth,
  type DefaultRoleOrHub,
} from "@/lib/storage";
import { setHubId } from "@/lib/hub-bridge";
import {
  ServerUnavailableError,
  isServerUnavailableError,
} from "@/lib/server-unavailable";

export type AuthStatus =
  | "loading"
  | "guest"
  | "authenticated"
  | "unauthenticated";

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

function getAllowedRole(roleName: string | undefined): AllowedRole | null {
  const r = (roleName ?? "").trim().toLowerCase();
  if (r === "guard") return "guard";
  if (r === "hub_manager" || r === "hm") return "hub_manager";
  if (ALLOWED_ROLES.includes(r as AllowedRole)) return r as AllowedRole;
  return null;
}

export function getRoleAndHubFromVerifyData(data: VerifyOtpResponseData): {
  allowedRole: AllowedRole | null;
  hasHub: boolean;
} {
  return {
    allowedRole: getAllowedRole(data.user.defaultRole?.name),
    hasHub: !!data.user.defaultHub?.id?.trim(),
  };
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
  sessionExpired: boolean;
  clearSessionExpiredFlag: () => void;
  /** True when user got 403 (e.g. role has no access). Show Access Denied UI, not Session Expired. */
  accessDenied: boolean;
  accessDeniedMessage: string | null;
  clearAccessDeniedFlag: () => void;
  /** Clear tokens and set accessDenied so UI shows Access Denied screen instead of Session Expired. */
  setAccessDenied: (message?: string) => Promise<void>;
  isAuthenticated: boolean;
  user: AuthUser | null;
  guestToken: string | null;
  accessToken: string | null;
  /** From OTP verify; used for role checks and APIs. */
  defaultRole: DefaultRoleOrHub | null;
  /** From OTP verify; hub id is passed in APIs via hub-bridge. */
  defaultHub: DefaultRoleOrHub | null;
  allowedRole: AllowedRole | null;
  hasValidRole: boolean;
  hasHub: boolean;
  ensureGuestToken: () => Promise<void>;
  setTokensAfterVerify: (data: VerifyOtpResponseData) => Promise<void>;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
  clearAuth: () => void;
  /** Clears session and storage without showing session-expired UI (e.g. voluntary logout → go to login screen). */
  logoutToLoginScreen: () => void;
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
  accessDenied: false,
  accessDeniedMessage: null,
  clearAccessDeniedFlag: () => {},
  setAccessDenied: () => Promise.resolve(),
  isAuthenticated: false,
  user: null,
  guestToken: null,
  accessToken: null,
  defaultRole: null,
  defaultHub: null,
  allowedRole: null,
  hasValidRole: false,
  hasHub: false,
  ensureGuestToken: async () => {},
  setTokensAfterVerify: () => Promise.resolve(),
  setAccessToken: () => {},
  logout: () => {},
  clearAuth: () => {},
  logoutToLoginScreen: () => {},
  retryGuestIdentity: () => {},
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isRestored, setIsRestored] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [accessDenied, setAccessDeniedState] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
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

  const clearAccessDeniedFlag = useCallback(() => {
    setAccessDeniedState(false);
    setAccessDeniedMessage(null);
  }, []);

  /** Clear session and show Access Denied (403) — do not set sessionExpired. */
  const setAccessDenied = useCallback(
    async (message?: string) => {
      setHubId(null);
      setAuthError(null);
      setSessionExpired(false);
      setAccessDeniedState(true);
      setAccessDeniedMessage(
        message ?? "You do not have access to this application.",
      );
      setStatus("unauthenticated");
      identityStartedRef.current = false;
      await clearAuth(stored.identityId);
      setStored({
        ...defaultStored,
        guestToken: "",
        identityId: stored.identityId,
      });
    },
    [stored.identityId],
  );

  const logout = useCallback(async () => {
    setHubId(null);
    setAccessDeniedState(false);
    setAccessDeniedMessage(null);
    setAuthError("Your session expired. Please sign in again.");
    setSessionExpired(true);
    setStatus("unauthenticated");
    identityStartedRef.current = false;
    await clearAuth(stored.identityId);
    setStored({
      ...defaultStored,
      guestToken: "",
      identityId: stored.identityId,
    });
    // Do NOT call fetchIdentity here. Identity runs only in the single guarded useEffect.
  }, [stored.identityId]);

  /** Voluntary logout: clear session and go to login screen without showing session-expired message. */
  const logoutToLoginScreen = useCallback(async () => {
    setHubId(null);
    setAuthError(null);
    setSessionExpired(false);
    setAccessDeniedState(false);
    setAccessDeniedMessage(null);
    setStatus("unauthenticated");
    identityStartedRef.current = false;
    await clearAuth(stored.identityId);
    setStored({
      ...defaultStored,
      guestToken: "",
      identityId: stored.identityId,
    });
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
        if (e instanceof ServerUnavailableError || isServerUnavailableError(e))
          throw e;
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
      if (s.defaultHub?.id?.trim()) setHubId(s.defaultHub.id);
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
    return () => {
      cancelled = true;
    };
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
        const next: StoredAuth = {
          ...defaultStored,
          guestToken: data.guestToken,
          identityId: data.id,
        };
        setStored(next);
        saveAuth(next);
        setStatus("guest");
      })
      .catch((e) => {
        if (cancelled) return;
        if (
          e instanceof ServerUnavailableError ||
          isServerUnavailableError(e)
        ) {
          identityStartedRef.current = false;
        } else {
          setAuthError("Failed to prepare login");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    isRestored,
    stored.accessToken,
    stored.refreshToken,
    stored.guestToken,
    stored.tokenVersion,
    retryIdentityKey,
  ]);

  const retryGuestIdentity = useCallback(() => {
    const hasAccess = !!stored.accessToken?.trim();
    const hasRefresh = !!stored.refreshToken?.trim();
    if (hasAccess || hasRefresh) return;
    identityStartedRef.current = false;
    setRetryIdentityKey((k) => k + 1);
  }, [stored.accessToken, stored.refreshToken]);

  const ensureGuestToken = useCallback(async () => {
    setAuthError(null);
    const hasAuth = !!(
      stored.accessToken?.trim() && stored.refreshToken?.trim()
    );
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
            },
      );
      if (!data?.guestToken || !data?.id) {
        setStatus("guest");
        return;
      }
      if (hasAuth) persist({ ...stored, identityId: data.id });
      else
        persist({
          ...stored,
          guestToken: data.guestToken,
          identityId: data.id,
        });
      setStatus("guest");
    } catch (e) {
      if (e instanceof ServerUnavailableError || isServerUnavailableError(e))
        return;
      if (isTokenVersionMismatch(e)) {
        logout();
        return;
      }
      setAuthError(
        e instanceof Error ? e.message : "Failed to get guest token",
      );
      setStatus("guest");
    }
  }, [stored, persist, logout]);

  const setTokensAfterVerify = useCallback(
    async (data: VerifyOtpResponseData): Promise<void> => {
      const primaryPhone =
        data.user.phoneNo && String(data.user.phoneNo).trim();
      const user: AuthUser = {
        id: data.user.id,
        name: data.user.name?.trim() ?? "",
        phone: primaryPhone ?? "",
        userType: data.user.userType,
      };
      const defaultRole = data.user.defaultRole?.id?.trim()
        ? {
            id: data.user.defaultRole.id.trim(),
            name:
              (data.user.defaultRole.name ?? "").trim() ||
              data.user.defaultRole.id.trim(),
          }
        : null;
      const defaultHub = data.user.defaultHub?.id?.trim()
        ? {
            id: data.user.defaultHub.id.trim(),
            name:
              (data.user.defaultHub.name ?? "").trim() ||
              data.user.defaultHub.id.trim(),
          }
        : null;
      const next: StoredAuth = {
        ...stored,
        guestToken: "",
        identityId: data.identity?.id ?? stored.identityId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenVersion: stored.tokenVersion + 1,
        user,
        defaultRole,
        defaultHub,
      };
      await persist(next);
      setHubId(defaultHub?.id ?? null);
      setStatus("authenticated");
    },
    [stored, persist],
  );

  const setAccessToken = useCallback(
    (accessToken: string) => {
      persist({ ...stored, accessToken: accessToken.trim() });
    },
    [stored, persist],
  );

  const allowedRole = getAllowedRole(stored.defaultRole?.name);
  const value: AuthContextValue = {
    status,
    isRestored,
    isGuestReady,
    authError,
    sessionExpired,
    clearSessionExpiredFlag,
    accessDenied,
    accessDeniedMessage,
    clearAccessDeniedFlag,
    setAccessDenied,
    isAuthenticated,
    user: stored.user,
    guestToken: stored.guestToken || null,
    accessToken: stored.accessToken || null,
    defaultRole: stored.defaultRole ?? null,
    defaultHub: stored.defaultHub ?? null,
    allowedRole,
    hasValidRole: allowedRole != null,
    hasHub: !!stored.defaultHub?.id?.trim(),
    ensureGuestToken,
    setTokensAfterVerify,
    setAccessToken,
    logout,
    clearAuth: logout,
    logoutToLoginScreen,
    retryGuestIdentity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultValue;
}
