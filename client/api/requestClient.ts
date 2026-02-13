/**
 * Central API client with auth retry (interceptor-style).
 * - Single-flight refresh: multiple 401s share one refresh call.
 * - On 401: refresh once, retry original request with new token.
 * - On refresh failure: auth-bridge returns null; AuthContext clears state and sets sessionExpired → redirect to Login.
 */

import { tryRefreshToken } from "@/lib/auth-bridge";
import { parseApiErrorFromResponse } from "@/lib/api-error";

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

// ----- Refresh queue: only one refresh in flight -----
let refreshPromise: Promise<string | null> | null = null;

/** Single-flight refresh. All concurrent 401s wait on the same promise. Returns new access token or null (session expired). */
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
 * Authenticated request with 401 → refresh → retry.
 * - Request is sent with Authorization: Bearer <accessToken>.
 * - On 401: runs refresh once (shared across concurrent calls), then retries this request once with new token.
 * - If still 401 after retry (or refresh failed), throws Error(UNAUTHORIZED_MSG). AuthContext/sessionExpired flow handles redirect.
 */
export async function requestWithAuthRetry(
  method: string,
  route: string,
  data?: unknown,
  accessToken?: string | null,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const doRequest = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
    if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;
    return fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "omit",
    });
  };

  let res = await doRequest(accessToken ?? null);
  if (res.status === 401) {
    const newToken = await getNewAccessTokenAfter401();
    if (newToken) {
      res = await doRequest(newToken);
    }
    if (res.status === 401) {
      throw new Error(UNAUTHORIZED_MSG);
    }
  }

  await throwIfResNotOk(res);
  return res;
}
