/**
 * API client: inject access token; on 401 (non-auth routes) → refresh once, retry once.
 * Uses HTTP status code only — no message or errorCode from body.
 * One API call per request; at most one retry after refresh (no duplicate calls).
 * Single-flight refresh. Never logout or clear storage from here (notifyUnauthorized only).
 */

import { getApiUrl } from "@/lib/api-url";
import { getHubId } from "@/lib/hub-bridge";

export { getApiUrl } from "@/lib/api-url";
import { getRefreshHandler, notifyUnauthorized } from "@/contexts/AuthContext";
import { parseApiErrorFromResponse } from "@/lib/api-error";
import {
  IDENTITY_PATH,
  LOGIN_OTP_PATH,
  LOGIN_OTP_VERIFY_PATH,
  REFRESH_TOKEN_PATH,
} from "@/lib/api-endpoints";
import {
  isServerUnavailableError,
  showServerUnavailable,
  ServerUnavailableError,
} from "@/lib/server-unavailable";

function isHtmlContentType(res: Response): boolean {
  const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
  return ct.includes("text/html");
}

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

function isServerErrorStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

export async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    throw await parseApiErrorFromResponse(res);
  }
}

function isAuthApi(route: string): boolean {
  return (
    route.includes(IDENTITY_PATH) ||
    route.includes(LOGIN_OTP_PATH) ||
    route.includes(LOGIN_OTP_VERIFY_PATH) ||
    route.includes(REFRESH_TOKEN_PATH)
  );
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Single-flight refresh: only one refresh runs at a time; all concurrent 401s wait for the same promise.
 * Clears refreshPromise on failure so subsequent 401s can trigger a new refresh; clears on success after return.
 */
async function getNewAccessToken(): Promise<string | null> {
  const refresh = getRefreshHandler();
  if (!refresh) return null;
  if (refreshPromise) return refreshPromise;
  const promise = refresh();
  refreshPromise = promise;
  try {
    return await promise;
  } finally {
    if (refreshPromise === promise) refreshPromise = null;
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

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
      return fetch(url.toString(), { method, headers, credentials: "omit" });
    }

    if (data != null && typeof data === "object" && !Array.isArray(data)) {
      headers["Content-Type"] = "application/json";
      const payload = { ...(data as Record<string, unknown>) };
      if (effectiveHubId) {
        payload.hubId = effectiveHubId;
        payload.hub_id = effectiveHubId;
      }
      return fetch(url.toString(), { method, headers, body: JSON.stringify(payload), credentials: "omit" });
    }

    headers["Content-Type"] = "application/json";
    const body =
      data != null
        ? JSON.stringify(data)
        : effectiveHubId
          ? JSON.stringify({ hubId: effectiveHubId, hub_id: effectiveHubId })
          : undefined;
    return fetch(url.toString(), { method, headers, body, credentials: "omit" });
  };

  let hasRetried = false;
  let res: Response;
  try {
    res = await doRequest(accessToken ?? null);
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new ServerUnavailableError();
    }
    throw e;
  }

  if (isServerErrorStatus(res.status) || isHtmlContentType(res)) {
    showServerUnavailable();
    throw new ServerUnavailableError();
  }
  if (res.status === 401 && (await isHtmlResponseBody(res))) {
    showServerUnavailable();
    throw new ServerUnavailableError();
  }

  // 401 handling: use status code only. Do not read message or errorCode from body — message can be anything.
  if (res.status === 401) {
    if (isAuthApi(route)) {
      notifyUnauthorized();
      throw new UnauthorizedError();
    }
    if (hasRetried) {
      notifyUnauthorized();
      throw new UnauthorizedError();
    }
    try {
      const newToken = await getNewAccessToken();
      if (!newToken) {
        notifyUnauthorized();
        throw new UnauthorizedError();
      }
      hasRetried = true;
      res = await doRequest(newToken);
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
      if (e instanceof ServerUnavailableError || isServerUnavailableError(e)) {
        showServerUnavailable();
        throw new ServerUnavailableError();
      }
      notifyUnauthorized();
      throw new UnauthorizedError();
    }
    if (res.status === 401) {
      notifyUnauthorized();
      throw new UnauthorizedError();
    }
  }

  await throwIfResNotOk(res);
  return res;
}

