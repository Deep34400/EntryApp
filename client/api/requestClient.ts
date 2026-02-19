/**
 * Central API client. Single-flight refresh, strict server vs auth separation.
 *
 * Lifecycle:
 * 1. Before any 401: if isServerUnavailableActive() → showServerUnavailable(), throw. Never notifyUnauthorized when server screen is active.
 * 2. 5xx / Content-Type text/html / body starts with <html → server error → showServerUnavailable(), throw. Do not reach 401 logic.
 * 3. 401 with HTML body → server error (gateway) → showServerUnavailable(), throw.
 * 4. 401 (real): Auth/OTP/identity/refresh routes → notifyUnauthorized(), throw (no refresh). Other routes: if TOKEN_EXPIRED → refresh once (single flight), retry once; if still 401 or generic 401 → notifyUnauthorized(), throw.
 *
 * Server errors never logout. Auth errors always logout (via notifyUnauthorized). No infinite retry; one refresh in flight, one retry per request.
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
import {
  showServerUnavailable,
  isServerUnavailableActive,
} from "@/lib/server-unavailable-bridge";

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

/**
 * True if response is an HTML error page (e.g. proxy/gateway 503).
 * We treat these as SERVER_UNAVAILABLE and never as auth failure.
 */
function isHtmlContentType(res: Response): boolean {
  const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
  return ct.includes("text/html");
}

/**
 * True if response body looks like HTML (e.g. <html> or <!DOCTYPE).
 * Used to avoid treating gateway/proxy HTML error pages as auth failures.
 */
async function isHtmlResponseBody(res: Response): Promise<boolean> {
  try {
    const text = await res.clone().text();
    const trimmed = (text ?? "").trim();
    if (!trimmed) return false;
    return /^\s*<(!doctype|html)\s/i.test(trimmed) || trimmed.toLowerCase().startsWith("<html");
  } catch {
    return false;
  }
}

/**
 * True if status indicates server/gateway error. These must NEVER trigger logout.
 */
function isServerErrorStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

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

// ----- Single-flight refresh: one refresh at a time; concurrent 401s wait; no nested refresh, no infinite retry -----
let refreshPromise: Promise<string | null> | null = null;

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

  // --- SERVER ERROR PATH: return immediately. Do NOT reach 401 logic. Do NOT call notifyUnauthorized(). ---
  if (isServerErrorStatus(res.status) || isHtmlContentType(res)) {
    showServerUnavailable();
    throw new Error(SERVER_UNAVAILABLE_MSG);
  }
  if (res.status === 401 && (await isHtmlResponseBody(res))) {
    showServerUnavailable();
    throw new Error(SERVER_UNAVAILABLE_MSG);
  }

  // --- AUTH PATH: only real 401 (JSON, non-HTML). Skip auth/logout if Server Unavailable is already active (prevents race). ---
  if (res.status === 401) {
    if (isServerUnavailableActive()) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
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
    if (isServerUnavailableActive()) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    if (res.status === 401) {
      notifyUnauthorized();
      throw new Error(UNAUTHORIZED_MSG);
    }
  }

  await throwIfResNotOk(res);
  return res;
}
