/**
 * Auth API: identity (guest token), send OTP, verify OTP, refresh.
 * Three tokens: guestToken (anonymous only), accessToken (short-lived), refreshToken (refresh only).
 * Prefer structured error codes over message matching.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

/** Backend error code for token version mismatch → treat as logout. */
export const ERROR_CODE_TOKEN_VERSION_MISMATCH = "TOKEN_VERSION_MISMATCH";

export type AuthError = Error & { statusCode?: number; errorCode?: string };

/** Parse error response; prefer errorCode when present. */
export function parseAuthError(text: string, statusCode: number): AuthError {
  let message = "Request failed";
  let errorCode: string | undefined;
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    errorCode = typeof data.errorCode === "string" ? data.errorCode : undefined;
    if (!errorCode && typeof data.code === "string") errorCode = data.code;
    const m = data.message ?? data.error;
    if (typeof m === "string" && m.trim()) message = m;
    else if (Array.isArray(m)) message = m.map(String).join(" ");
    else if (m && typeof m === "object" && typeof (m as { message?: unknown }).message === "string")
      message = (m as { message: string }).message;
  } catch {
    if (text.length < 300) message = text;
  }
  const err = new Error(message) as AuthError;
  err.statusCode = statusCode;
  if (errorCode) err.errorCode = errorCode;
  return err;
}

export function isTokenVersionMismatch(err: unknown): boolean {
  const code = (err as AuthError).errorCode;
  if (code === ERROR_CODE_TOKEN_VERSION_MISMATCH) return true;
  if (typeof code === "string" && /version|mismatch/i.test(code)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /version|mismatch|invalid token/i.test(msg);
}

/** Backend error code for unauthorized → treat as invalid guest session (logout + identity). */
export const ERROR_CODE_UNAUTHORIZED = "UNAUTHORIZED";

/**
 * True if error should be treated as invalid guest session during OTP/login.
 * Then: logout → clear all tokens/role/hub → call Identity API → LoginOtpScreen with message.
 * No retry, no refresh. Covers: HTTP 401, errorCode UNAUTHORIZED, Token Version Mismatch,
 * Invalid guest token, Session expired, network error during OTP verify.
 */
export function isInvalidGuestSessionError(err: unknown): boolean {
  const e = err as AuthError;
  if (e?.statusCode === 401) return true;
  if (e?.errorCode === ERROR_CODE_UNAUTHORIZED) return true;
  if (isTokenVersionMismatch(err)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (/token version mismatch|invalid guest token|session expired/i.test(msg)) return true;
  if (/failed to fetch|network request failed|network error/i.test(msg)) return true;
  return false;
}

import { getApiUrl } from "@/api/requestClient";
import {
  IDENTITY_PATH,
  LOGIN_OTP_PATH,
  LOGIN_OTP_VERIFY_PATH,
  REFRESH_TOKEN_PATH,
  IDENTITY_APP_TYPE,
  APP_TYPE,
  APP_VERSION,
} from "./api-endpoints";
import { isServerUnavailableError, SERVER_UNAVAILABLE_MSG } from "./server-unavailable";
import { showServerUnavailable } from "./server-unavailable-bridge";

const DEVICE_ID_KEY = "@entry_app_device_id";

async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (id?.trim()) return id.trim();
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  await AsyncStorage.setItem(DEVICE_ID_KEY, uuid);
  return uuid;
}

export async function getDeviceId(): Promise<string> {
  return getOrCreateDeviceId();
}

export type IdentityRequestBody = {
  appType: string;
  appVersion: number;
  lastLoginUserId: string | null;
  guestToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenVersion: number;
  macId: string;
};

export type IdentityResponse = {
  success: boolean;
  data?: {
    guestToken: string;
    id: string;
  };
};

/** Call identity API to get or validate guest token. Pass stored tokens or empty strings. */
export async function fetchIdentity(params: {
  guestToken: string;
  accessToken?: string;
  refreshToken?: string;
  lastLoginUserId?: string;
  tokenVersion?: number;
}): Promise<IdentityResponse["data"]> {
  const macId = await getOrCreateDeviceId();
  const body: IdentityRequestBody = {
    appType: IDENTITY_APP_TYPE,
    appVersion: APP_VERSION,
    lastLoginUserId: params.lastLoginUserId?.trim() || null,
    guestToken: params.guestToken?.trim() || null,
    accessToken: params.accessToken?.trim() || null,
    refreshToken: params.refreshToken?.trim() || null,
    tokenVersion: params.tokenVersion ?? 1,
    macId,
  };

  const baseUrl = getApiUrl();
  let res: Response;
  try {
    res = await fetch(new URL(IDENTITY_PATH, baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    throw parseAuthError(text, res.status);
  }

  const json = JSON.parse(text) as IdentityResponse;
  if (!json.success || !json.data?.guestToken) {
    throw new Error("Invalid identity response");
  }
  return json.data;
}

export type RefreshResponse = {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
  };
};

/** Call refresh API to get new access (and optionally refresh) token. Sends token in body and as Bearer header for backend compatibility. */
export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const token = String(refreshToken).trim();
  const baseUrl = getApiUrl();
  let res: Response;
  try {
    res = await fetch(new URL(REFRESH_TOKEN_PATH, baseUrl).href, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ refreshToken: token, refresh_token: token }),
    });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    throw parseAuthError(text, res.status);
  }

  const json = JSON.parse(text) as RefreshResponse;
  if (!json.success || !json.data?.accessToken) {
    throw new Error("Invalid refresh response");
  }
  return {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken ?? json.data.accessToken,
  };
}

/** Send OTP to phone. Requires guest token in Authorization header. */
export async function sendOtp(phoneNo: string, guestToken: string): Promise<void> {
  const deviceId = await getOrCreateDeviceId();
  const baseUrl = getApiUrl();
  let res: Response;
  try {
    res = await fetch(new URL(LOGIN_OTP_PATH, baseUrl).href, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "device-id": deviceId,
        "app-type": APP_TYPE,
        "app-version": String(APP_VERSION),
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({ phoneNo: String(phoneNo).trim() }),
    });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    throw parseAuthError(text, res.status);
  }
}

/** Verify OTP and return user + tokens. Roles/hubs: source of truth for global role and hub (array-based). */
export type VerifyOtpResponse = {
  success: boolean;
  data?: {
    user: {
      id: string;
      name: string;
      userType?: string;
      status?: string;
      userContacts?: Array<{ phoneNo: string; isPrimary?: boolean }>;
      /** Role names; allowed: guard, hm (normalized to lowercase). */
      roles?: Array<{ name: string }>;
      /** Alternative: userRoles[].role.name */
      userRoles?: Array<{ role: { name: string } }>;
      /** Hub ids; we use index 0 only for selectedHubId. */
      hubs?: Array<{ id: string }>;
      userHubs?: Array<{ hubId?: string; hub?: { id: string } }>;
    };
    accessToken: string;
    refreshToken: string;
    identity?: { id: string };
    isNewUser?: boolean;
  };
};

export async function verifyOtp(
  phoneNo: string,
  otp: string,
  guestToken: string,
): Promise<VerifyOtpResponse["data"]> {
  const deviceId = await getOrCreateDeviceId();
  const baseUrl = getApiUrl();
  let res: Response;
  try {
    res = await fetch(new URL(LOGIN_OTP_VERIFY_PATH, baseUrl).href, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "device-id": deviceId,
        "app-type": APP_TYPE,
        "app-version": String(APP_VERSION),
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        phoneNo: String(phoneNo).trim(),
        otp: String(otp).trim(),
      }),
    });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    throw parseAuthError(text, res.status);
  }

  const json = JSON.parse(text) as VerifyOtpResponse;
  if (!json.success || !json.data?.accessToken || !json.data?.refreshToken) {
    throw new Error("Invalid verify response");
  }
  return json.data;
}
