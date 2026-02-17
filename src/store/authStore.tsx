/**
 * Auth state: guest token, access/refresh, user. Persisted to AsyncStorage.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchIdentity,
  refreshTokens,
  isTokenVersionMismatch,
  type VerifyOtpResponse,
} from "@/services/authService";
import { setRefreshHandler } from "@/services/apiClient";

const AUTH_STORAGE_KEY = "@entry_app_auth";

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
};

const defaultStored: StoredAuth = {
  guestToken: "",
  identityId: "",
  accessToken: "",
  refreshToken: "",
  tokenVersion: 1,
  user: null,
};

function clearedStored(keepIdentityId = ""): StoredAuth {
  return { ...defaultStored, guestToken: "", identityId: keepIdentityId };
}

export type AuthContextValue = {
  isRestored: boolean;
  isGuestReady: boolean;
  authError: string | null;
  sessionExpired: boolean;
  clearSessionExpiredFlag: () => void;
  isAuthenticated: boolean;
  user: AuthUser | null;
  guestToken: string | null;
  accessToken: string | null;
  ensureGuestToken: () => Promise<void>;
  setTokensAfterVerify: (
    data: NonNullable<VerifyOtpResponse["data"]>
  ) => Promise<void>;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): Promise<StoredAuth> {
  return AsyncStorage.getItem(AUTH_STORAGE_KEY).then((raw) => {
    if (!raw) return defaultStored;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredAuth>;
      return {
        guestToken: typeof parsed.guestToken === "string" ? parsed.guestToken : "",
        identityId: typeof parsed.identityId === "string" ? parsed.identityId : "",
        accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : "",
        refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : "",
        tokenVersion: typeof parsed.tokenVersion === "number" ? parsed.tokenVersion : 1,
        user:
          parsed.user && parsed.user.id && parsed.user.name ? parsed.user : null,
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

  const clearSessionExpiredFlag = useCallback(() => setSessionExpired(false), []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    const refreshToken = stored.refreshToken?.trim();
    if (!refreshToken) {
      setAuthError("Your session expired. Please sign in again.");
      setSessionExpired(true);
      setIsGuestReady(false);
      persist(clearedStored(stored.identityId));
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
        });
        return tokens.accessToken;
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 401 || isTokenVersionMismatch(e)) {
          setAuthError("Your session expired. Please sign in again.");
          setSessionExpired(true);
          setIsGuestReady(false);
          persist(clearedStored(stored.identityId));
          return null;
        }
        throw e;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = promise;
    return promise;
  }, [stored, persist]);

  useEffect(() => {
    setRefreshHandler(refreshAccessToken);
    return () => setRefreshHandler(null);
  }, [refreshAccessToken]);

  useEffect(() => {
    const needsGuest =
      isRestored &&
      !stored.accessToken?.trim() &&
      !stored.refreshToken?.trim() &&
      !stored.guestToken?.trim() &&
      !isGuestReady;
    if (!needsGuest) return;
    let cancelled = false;
    fetchIdentity({
      guestToken: "",
      accessToken: undefined,
      refreshToken: undefined,
      tokenVersion: 1,
    })
      .then((data) => {
        if (cancelled || !data?.guestToken || !data?.id) return;
        const next: StoredAuth = {
          ...defaultStored,
          guestToken: data.guestToken,
          identityId: data.id,
        };
        setStored(next);
        saveStored(next);
      })
      .catch(() => {
        if (!cancelled) setAuthError("Failed to prepare login");
      })
      .finally(() => {
        if (!cancelled) setIsGuestReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isRestored, stored.accessToken, stored.refreshToken, stored.guestToken]);

  const ensureGuestToken = useCallback(async () => {
    setAuthError(null);
    const hasAuth = !!(stored.accessToken?.trim() && stored.refreshToken?.trim());
    try {
      const params = hasAuth
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
            tokenVersion: stored.tokenVersion,
          };
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
      if (isTokenVersionMismatch(e)) {
        setSessionExpired(true);
        setIsGuestReady(false);
        persist(clearedStored(stored.identityId));
      } else {
        setAuthError(e instanceof Error ? e.message : "Failed to get guest token");
      }
      setIsGuestReady(true);
    }
  }, [stored, persist]);

  useEffect(() => {
    let cancelled = false;
    loadStored().then((s) => {
      if (cancelled) return;
      setStored(s);
      setIsRestored(true);
      setAuthError(null);
      const hasRefresh = !!s.refreshToken?.trim();
      const hasGuest = !!s.guestToken?.trim();
      if (hasRefresh) {
        setIsGuestReady(true);
        return;
      }
      if (!hasGuest) {
        setIsGuestReady(false);
        return;
      }
      fetchIdentity({
        guestToken: s.guestToken!,
        accessToken: undefined,
        refreshToken: undefined,
        tokenVersion: s.tokenVersion,
      })
        .then((data) => {
          if (cancelled || !data?.guestToken || !data?.id) return;
          const next: StoredAuth = { ...s, guestToken: data.guestToken, identityId: data.id };
          setStored(next);
          saveStored(next);
        })
        .catch((e) => {
          if (cancelled) return;
          if (isTokenVersionMismatch(e)) {
            const next = clearedStored(s.identityId);
            setStored(next);
            saveStored(next);
            setSessionExpired(true);
            setIsGuestReady(false);
          } else {
            setAuthError(e instanceof Error ? e.message : "Failed to get guest token");
          }
          setIsGuestReady(true);
        })
        .finally(() => {
          if (!cancelled) setIsGuestReady(true);
        });
    });
    return () => {
      cancelled = true;
    };
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
      const next: StoredAuth = {
        ...stored,
        guestToken: "",
        identityId: data.identity?.id ?? stored.identityId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenVersion: stored.tokenVersion + 1,
        user,
      };
      await persist(next);
    },
    [stored, persist]
  );

  const logout = useCallback(() => {
    setIsGuestReady(false);
    persist(clearedStored(stored.identityId));
  }, [stored.identityId, persist]);

  const setAccessToken = useCallback(
    (accessToken: string) => {
      persist({ ...stored, accessToken: accessToken.trim() });
    },
    [stored, persist]
  );

  const value: AuthContextValue = {
    isRestored,
    isGuestReady,
    authError,
    sessionExpired,
    clearSessionExpiredFlag,
    isAuthenticated: !!(stored.accessToken?.trim() && stored.user),
    user: stored.user,
    guestToken: stored.guestToken || null,
    accessToken: stored.accessToken || null,
    ensureGuestToken,
    setTokensAfterVerify,
    setAccessToken,
    logout,
    clearAuth: logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

const defaultAuth: AuthContextValue = {
  isRestored: true,
  isGuestReady: false,
  authError: null,
  sessionExpired: false,
  clearSessionExpiredFlag: () => {},
  isAuthenticated: false,
  user: null,
  guestToken: null,
  accessToken: null,
  ensureGuestToken: async () => {},
  setTokensAfterVerify: () => Promise.resolve(),
  setAccessToken: () => {},
  logout: () => {},
  clearAuth: () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuth;
}
