/**
 * Central API client: base URL, auth retry, error parsing.
 */

import { parseApiErrorFromResponse } from "./apiError";

export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("Set EXPO_PUBLIC_API_URL in .env to your backend base URL");
  }
  const parsed = new URL(url);
  return parsed.href.replace(/\/$/, "");
}

export const UNAUTHORIZED_MSG = "UNAUTHORIZED";

export async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    throw await parseApiErrorFromResponse(res);
  }
}

let refreshPromise: Promise<string | null> | null = null;

export type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;

export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function getRefreshHandler(): RefreshHandler | null {
  return refreshHandler;
}

export async function tryRefreshToken(): Promise<string | null> {
  const fn = getRefreshHandler();
  if (!fn) return null;
  return fn();
}

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
 * Authenticated request with 401 → refresh → retry once.
 */
export async function requestWithAuthRetry(
  method: string,
  route: string,
  data?: unknown,
  accessToken?: string | null
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const doRequest = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = data
      ? { "Content-Type": "application/json" }
      : {};
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
