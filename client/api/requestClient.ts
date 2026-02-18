/**
 * Central API client with auth retry (interceptor-style).
 * - Single-flight refresh: multiple 401s share one refresh call.
 * - On 401 + TOKEN_EXPIRED only: refresh once, retry original request. No refresh on 403, 500, 503, offline.
 * - On refresh failure: auth-bridge returns null; AuthContext clears state and sets sessionExpired → redirect to Login.
 */

import { tryRefreshToken, notifyUnauthorized } from "@/lib/auth-bridge";
import { getHubId } from "@/lib/hub-bridge";
import { parseApiErrorFromResponse } from "@/lib/api-error";
import {
  IDENTITY_PATH,
  LOGIN_OTP_PATH,
  LOGIN_OTP_VERIFY_PATH,
  REFRESH_TOKEN_PATH,
} from "@/lib/api-endpoints";
import { isRefreshable401Code } from "@/lib/auth-error-codes";
import {
  isServerUnavailableError,
  SERVER_UNAVAILABLE_MSG,
} from "@/lib/server-unavailable";
import { showServerUnavailable } from "@/lib/server-unavailable-bridge";

/** Backend error code indicating access token expiry. Keep in sync with client/lib/auth-error-codes.ts REFRESH_ON_401_CODES. */
export const ERROR_CODE_TOKEN_EXPIRED = "TOKEN_EXPIRED";

/** Base URL from EXPO_PUBLIC_API_URL. */
export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("Set EXPO_PUBLIC_API_URL in .env to your backend base URL");
  }
  const parsed = new URL(url);
  return parsed.href.replace(/\/$/, "");
}

export const UNAUTHORIZED_MSG = "UNAUTHORIZED";

/** On non-2xx: parses response body and throws ApiError (title, message, statusCode). No raw JSON or technical details. */
export async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    throw await parseApiErrorFromResponse(res);
  }
}

/** OTP/login/identity/refresh APIs: excluded from refresh and retry. 401 → hard stop (reject), no interceptor replay. */
function isAuthApi(route: string): boolean {
  return (
    route.includes(IDENTITY_PATH) ||
    route.includes(LOGIN_OTP_PATH) ||
    route.includes(LOGIN_OTP_VERIFY_PATH) ||
    route.includes(REFRESH_TOKEN_PATH)
  );
}

/**
 * Parse 401 response body: return true only when backend code is in REFRESH_ON_401_CODES (e.g. TOKEN_EXPIRED).
 * To add more "refresh on this code" → edit client/lib/auth-error-codes.ts REFRESH_ON_401_CODES.
 */
export async function is401TokenExpired(res: Response): Promise<boolean> {
  try {
    const text = await res.clone().text();
    if (!text?.trim()) return false;
    const body = JSON.parse(text) as Record<string, unknown>;
    const code =
      (typeof body.errorCode === "string" ? body.errorCode : null) ??
      (typeof body.code === "string" ? body.code : null);
    return isRefreshable401Code(code);
  } catch {
    return false;
  }
}

// ----- Refresh queue: only one refresh in flight -----
let refreshPromise: Promise<string | null> | null = null;

/** Single-flight refresh. All concurrent 401s (with TOKEN_EXPIRED) wait on the same promise. Returns new access token or null (session expired). */
async function getNewAccessTokenAfter401(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = tryRefreshToken();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Authenticated request with 401 + TOKEN_EXPIRED → refresh → retry (once).
 * - Request is sent with Authorization: Bearer <accessToken>. Hub id is sent in payload (body or query), NOT in header.
 * - On 401: only if response body indicates TOKEN_EXPIRED we refresh once and retry. Otherwise throw (logout, no refresh).
 * - Do NOT refresh on 403, 500, 503, or offline/timeout.
 */
export async function requestWithAuthRetry(
  method: string,
  route: string,
  data?: unknown,
  accessToken?: string | null,
  hubId?: string | null,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const effectiveHubId = (hubId ?? getHubId())?.trim() || null;

  const doRequest = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;

    const isGet = method.toUpperCase() === "GET";
    if (isGet) {
      if (effectiveHubId) {
        url.searchParams.set("hubId", effectiveHubId);
        url.searchParams.set("hub_id", effectiveHubId);
      }
      return fetch(url.toString(), {
        method,
        headers,
        credentials: "omit",
      });
    }

    if (data != null && typeof data === "object" && !Array.isArray(data)) {
      headers["Content-Type"] = "application/json";
      const payload = { ...(data as Record<string, unknown>) };
      if (effectiveHubId) {
        payload.hubId = effectiveHubId;
        payload.hub_id = effectiveHubId;
      }
      return fetch(url.toString(), {
        method,
        headers,
        body: JSON.stringify(payload),
        credentials: "omit",
      });
    }

    headers["Content-Type"] = "application/json";
    const body =
      data != null
        ? JSON.stringify(data)
        : effectiveHubId
          ? JSON.stringify({ hubId: effectiveHubId, hub_id: effectiveHubId })
          : undefined;
    return fetch(url.toString(), {
      method,
      headers,
      body,
      credentials: "omit",
    });
  };

  let res: Response;
  try {
    res = await doRequest(accessToken ?? null);
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }
  if (res.status === 401) {
    // Auth/OTP/identity/refresh APIs: never refresh, never retry. Fail-safe → logout.
    if (isAuthApi(route)) {
      notifyUnauthorized();
      throw new Error(UNAUTHORIZED_MSG);
    }
    const shouldRefresh = await is401TokenExpired(res);
    if (shouldRefresh) {
      try {
        const newToken = await getNewAccessTokenAfter401();
        if (newToken) {
          res = await doRequest(newToken);
        }
      } catch (e) {
        if (isServerUnavailableError(e)) {
          showServerUnavailable();
          throw new Error(SERVER_UNAVAILABLE_MSG);
        }
        throw e;
      }
    }
    // Generic 401 or retry still 401 → clear session and redirect to Login.
    if (res.status === 401) {
      notifyUnauthorized();
      throw new Error(UNAUTHORIZED_MSG);
    }
  }

  await throwIfResNotOk(res);
  return res;
}
