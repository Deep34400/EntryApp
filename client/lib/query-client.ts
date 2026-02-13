import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { ENTRY_APP_COUNTS_PATH, getDriverDetailsPath } from "./api-endpoints";
import { tryRefreshToken } from "./auth-bridge";

/**
 * API base URL — set EXPO_PUBLIC_API_URL in .env to your backend (e.g. http://localhost:8080).
 * Endpoints in api-endpoints.ts.
 */
export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("Set EXPO_PUBLIC_API_URL in .env to your backend base URL");
  }
  const parsed = new URL(url);
  return parsed.href.replace(/\/$/, "");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        const data = JSON.parse(text) as Record<string, unknown>;
        const apiMessage = data.message as string | undefined;
        const apiError = data.error as string | undefined;
        const stack = data.stack as string | undefined;
        if (typeof stack === "string" && stack.trim()) {
          const firstLine = stack.split("\n")[0]?.trim().replace(/^Error:\s*/, "");
          if (firstLine) message = firstLine;
        } else if (typeof apiMessage === "string" && apiMessage.trim()) {
          message = apiMessage;
        } else if (typeof apiError === "string" && apiError.trim()) {
          message = apiError;
        } else if (text.length < 300) {
          message = text;
        }
      } catch {
        if (text.length < 300) message = text;
      }
    }
    throw new Error(message);
  }
}

export const UNAUTHORIZED_MSG = "UNAUTHORIZED";

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "omit", // avoid CORS preflight issues; use "include" only if backend sends cookies
  });

  await throwIfResNotOk(res);
  return res;
}

let refreshPromise: Promise<string | null> | null = null;

/** Single-flight refresh. Returns new access token or null (session expired). Never uses guestToken. */
async function getNewAccessTokenAfter401(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = tryRefreshToken();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/** Authenticated request: adds Authorization Bearer token. Throws Error(UNAUTHORIZED_MSG) on 401. */
export async function apiRequestWithAuth(
  method: string,
  route: string,
  data?: unknown | undefined,
  accessToken?: string | null,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (accessToken?.trim()) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "omit",
  });

  if (res.status === 401) {
    throw new Error(UNAUTHORIZED_MSG);
  }

  await throwIfResNotOk(res);
  return res;
}

/** Authenticated request with retry: use accessToken only. On 401 try refresh once and retry with new accessToken. No fallback to guest. */
export async function apiRequestWithAuthRetry(
  method: string,
  route: string,
  data?: unknown | undefined,
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

/** Driver details from API: results.driver_name, results.phone, results.vehicles[0].reg_number */
export type DriverDetails = {
  driver_name: string;
  phone: string;
  reg_number?: string;
};

/** Fetch driver details by reg_number or phone. GET .../ticket/driverDetails?reg_number=... or ?phone=... */
export async function fetchDriverDetails(params: {
  reg_number?: string;
  phone?: string;
}): Promise<DriverDetails | null> {
  const path = getDriverDetailsPath(params);
  if (path === "/api/v1/testRoutes/ticket/driverDetails") return null;
  try {
    const res = await apiRequest("GET", path);
    const data = (await res.json()) as {
      status?: string;
      results?: {
        driver_name?: string;
        phone?: string;
        vehicles?: Array<{ reg_number?: string }>;
      };
    };
    const results = data.results;
    if (!results || typeof results.driver_name !== "string" || typeof results.phone !== "string")
      return null;
    const reg_number =
      results.vehicles?.[0]?.reg_number != null
        ? String(results.vehicles[0].reg_number).trim()
        : undefined;
    return {
      driver_name: String(results.driver_name).trim(),
      phone: String(results.phone).trim(),
      ...(reg_number ? { reg_number } : {}),
    };
  } catch {
    return null;
  }
}

/** GET request with optional auth; on 401 tries refresh once and retries. Returns response. */
export async function fetchWithAuthRetry(
  route: string,
  accessToken?: string | null,
): Promise<Response> {
  if (accessToken?.trim()) {
    return apiRequestWithAuthRetry("GET", route, undefined, accessToken);
  }
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  return fetch(url.toString(), { method: "GET", credentials: "omit" });
}

/** Fetch open/closed counts. GET /api/v1/entry-app?view=counts → { success, data: { open, closed } }. On 401 tries refresh then retries. */
export async function fetchTicketCountsSafe(
  _hubId?: string,
  accessToken?: string | null,
): Promise<{ open: number; closed: number }> {
  try {
    const res = await fetchWithAuthRetry(ENTRY_APP_COUNTS_PATH, accessToken);
    if (!res.ok) return { open: 0, closed: 0 };
    const json = (await res.json()) as { success?: boolean; data?: { open?: number; closed?: number } };
    const data = json.data;
    const open = Number(data?.open ?? 0) || 0;
    const closed = Number(data?.closed ?? 0) || 0;
    return { open, closed };
  } catch {
    return { open: 0, closed: 0 };
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "omit",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
