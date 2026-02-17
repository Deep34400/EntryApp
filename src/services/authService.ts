/**
 * Auth API: identity (guest token), send OTP, verify OTP, refresh.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/services/apiClient";
import {
  IDENTITY_PATH,
  LOGIN_OTP_PATH,
  LOGIN_OTP_VERIFY_PATH,
  REFRESH_TOKEN_PATH,
} from "@/constants/api";
import { APP_TYPE, APP_VERSION } from "@/constants/app";

const DEVICE_ID_KEY = "@entry_app_device_id";

export const ERROR_CODE_TOKEN_VERSION_MISMATCH = "TOKEN_VERSION_MISMATCH";
export type AuthError = Error & { statusCode?: number; errorCode?: string };

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
    else if (
      m &&
      typeof m === "object" &&
      typeof (m as { message?: unknown }).message === "string"
    )
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
  data?: { guestToken: string; id: string };
};

export async function fetchIdentity(params: {
  guestToken: string;
  accessToken?: string;
  refreshToken?: string;
  lastLoginUserId?: string;
  tokenVersion?: number;
}): Promise<IdentityResponse["data"]> {
  const macId = await getOrCreateDeviceId();
  const body: IdentityRequestBody = {
    appType: APP_TYPE,
    appVersion: APP_VERSION,
    lastLoginUserId: params.lastLoginUserId?.trim() || null,
    guestToken: params.guestToken?.trim() || null,
    accessToken: params.accessToken?.trim() || null,
    refreshToken: params.refreshToken?.trim() || null,
    tokenVersion: params.tokenVersion ?? 1,
    macId,
  };

  const baseUrl = getApiUrl();
  const res = await fetch(new URL(IDENTITY_PATH, baseUrl).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw parseAuthError(text, res.status);

  const json = JSON.parse(text) as IdentityResponse;
  if (!json.success || !json.data?.guestToken) {
    throw new Error("Invalid identity response");
  }
  return json.data;
}

export type RefreshResponse = {
  success: boolean;
  data?: { accessToken: string; refreshToken: string };
};

export async function refreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const token = String(refreshToken).trim();
  const baseUrl = getApiUrl();
  const res = await fetch(new URL(REFRESH_TOKEN_PATH, baseUrl).href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ refreshToken: token, refresh_token: token }),
  });

  const text = await res.text();
  if (!res.ok) throw parseAuthError(text, res.status);

  const json = JSON.parse(text) as RefreshResponse;
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
  const res = await fetch(new URL(LOGIN_OTP_PATH, baseUrl).href, {
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

  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      const m = (data.message ?? data.error) as string | undefined;
      if (typeof m === "string" && m.trim()) message = m;
    } catch {
      if (text.length < 300) message = text;
    }
    throw new Error(message);
  }
}

export type VerifyOtpResponse = {
  success: boolean;
  data?: {
    user: {
      id: string;
      name: string;
      userType?: string;
      status?: string;
      userContacts?: Array<{ phoneNo: string; isPrimary?: boolean }>;
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
  guestToken: string
): Promise<VerifyOtpResponse["data"]> {
  const deviceId = await getOrCreateDeviceId();
  const baseUrl = getApiUrl();
  const res = await fetch(new URL(LOGIN_OTP_VERIFY_PATH, baseUrl).href, {
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

  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      const m = (data.message ?? data.error) as string | undefined;
      if (typeof m === "string" && m.trim()) message = m;
    } catch {
      if (text.length < 300) message = text;
    }
    throw new Error(message);
  }

  const json = JSON.parse(text) as VerifyOtpResponse;
  if (!json.success || !json.data?.accessToken || !json.data?.refreshToken) {
    throw new Error("Invalid verify response");
  }
  return json.data;
}
