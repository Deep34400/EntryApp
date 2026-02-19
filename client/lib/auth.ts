/**
 * Auth API only: identity, send OTP, verify OTP, refresh.
 * 5xx / HTML / CORS / fetch failure → showServerUnavailable() then throw ServerUnavailableError.
 * Never logout. Never touch storage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/api-url";
import {
  IDENTITY_PATH,
  LOGIN_OTP_PATH,
  LOGIN_OTP_VERIFY_PATH,
  REFRESH_TOKEN_PATH,
  IDENTITY_APP_TYPE,
  APP_TYPE,
  APP_VERSION,
} from "@/lib/api-endpoints";
import {
  isServerUnavailableError,
  showServerUnavailable,
  ServerUnavailableError,
} from "@/lib/server-unavailable";

const DEVICE_ID_KEY = "@entry_app_device_id";

function isHtmlBody(text: string): boolean {
  const t = (text ?? "").trim();
  return !!(t && (/^\s*<(!doctype|html)\s/i.test(t) || t.toLowerCase().startsWith("<html")));
}

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

export type IdentityResponseData = {
  guestToken: string;
  id: string;
};

export async function fetchIdentity(params: {
  guestToken: string;
  accessToken?: string;
  refreshToken?: string;
  lastLoginUserId?: string;
  tokenVersion?: number;
}): Promise<IdentityResponseData> {
  const macId = await getOrCreateDeviceId();
  const body = {
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
      throw new ServerUnavailableError();
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status >= 500 || isHtmlBody(text)) {
      showServerUnavailable();
      throw new ServerUnavailableError();
    }
    throw parseAuthError(text, res.status);
  }

  const json = JSON.parse(text) as { success?: boolean; data?: IdentityResponseData };
  if (!json.success || !json.data?.guestToken) {
    throw new Error("Invalid identity response");
  }
  return json.data;
}

export type AuthError = Error & { statusCode?: number; errorCode?: string };

function parseAuthError(text: string, statusCode: number): AuthError {
  let message = "Request failed";
  let errorCode: string | undefined;
  try {
    if (isHtmlBody(text)) {
      const err = new Error("Service temporarily unavailable. Please try again.") as AuthError;
      err.statusCode = statusCode;
      return err;
    }
    const data = JSON.parse(text) as Record<string, unknown>;
    errorCode = typeof data.errorCode === "string" ? data.errorCode : undefined;
    if (!errorCode && typeof data.code === "string") errorCode = data.code;
    const m = data.message ?? data.error;
    if (typeof m === "string" && m.trim()) message = m;
    else if (Array.isArray(m)) message = m.map(String).join(" ");
    else if (m && typeof m === "object" && typeof (m as { message?: unknown }).message === "string")
      message = (m as { message: string }).message;
  } catch {
    if (!isHtmlBody(text) && text.length < 300) message = text;
  }
  const err = new Error(message) as AuthError;
  err.statusCode = statusCode;
  if (errorCode) err.errorCode = errorCode;
  return err;
}

/**
 * Refresh: POST with Authorization: Bearer <refresh_token> only. No body/payload.
 * On 401/invalid → throws; caller (AuthContext) logs out and triggers identity.
 */
export async function refreshToken(
  refreshTokenValue: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const token = String(refreshTokenValue).trim();
  const baseUrl = getApiUrl();
  let res: Response;
  try {
    res = await fetch(new URL(REFRESH_TOKEN_PATH, baseUrl).href, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: undefined,
    });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new ServerUnavailableError();
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status >= 500 || isHtmlBody(text)) {
      showServerUnavailable();
      throw new ServerUnavailableError();
    }
    throw parseAuthError(text, res.status);
  }

  const json = JSON.parse(text) as {
    success?: boolean;
    data?: { accessToken: string; refreshToken: string };
  };
  if (!json.success || !json.data?.accessToken) {
    throw new Error("Invalid refresh response");
  }
  return {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken ?? json.data.accessToken,
  };
}

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
      throw new ServerUnavailableError();
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status >= 500 || isHtmlBody(text)) {
      showServerUnavailable();
      throw new ServerUnavailableError();
    }
    throw parseAuthError(text, res.status);
  }
}

/** Backend may return tokens at data level and/or inside data.identity. We normalize to top-level. */
export type VerifyOtpResponseData = {
  user: {
    id: string;
    name: string;
    userType?: string;
    status?: string;
    userContacts?: Array<{ phoneNo: string; isPrimary?: boolean }>;
    roles?: Array<{ name: string }>;
    userRoles?: Array<{ role: { name: string } }>;
    hubs?: Array<{ id: string }>;
    userHubs?: Array<{ hubId?: string; hub?: { id: string } }>;
  };
  accessToken: string;
  refreshToken: string;
  identity?: { id: string; guestToken?: string; accessToken?: string; refreshToken?: string };
  isNewUser?: boolean;
};

export async function verifyOtp(
  phoneNo: string,
  otp: string,
  guestToken: string
): Promise<VerifyOtpResponseData> {
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
      throw new ServerUnavailableError();
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status >= 500 || isHtmlBody(text)) {
      showServerUnavailable();
      throw new ServerUnavailableError();
    }
    throw parseAuthError(text, res.status);
  }

  const json = JSON.parse(text) as {
    success?: boolean;
    data?: VerifyOtpResponseData & { identity?: { accessToken?: string; refreshToken?: string; guestToken?: string } };
  };
  const raw = json.data;
  if (!json.success || !raw?.user) throw new Error("Invalid verify response");

  // Prefer top-level tokens; fallback to data.identity for backend consistency
  const accessToken =
    (raw as { accessToken?: string }).accessToken ?? raw.identity?.accessToken ?? "";
  const refreshToken =
    (raw as { refreshToken?: string }).refreshToken ?? raw.identity?.refreshToken ?? "";
  if (!accessToken || !refreshToken) throw new Error("Invalid verify response: missing tokens");

  return {
    user: raw.user,
    accessToken,
    refreshToken,
    identity: raw.identity ? { id: raw.identity.id } : undefined,
    isNewUser: raw.isNewUser,
  };
}
