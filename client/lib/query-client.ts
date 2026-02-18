import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl, throwIfResNotOk, UNAUTHORIZED_MSG, requestWithAuthRetry } from "@/api/requestClient";
import { ENTRY_APP_COUNTS_PATH, getDriverDetailsPath } from "./api-endpoints";
import { isServerUnavailableError, SERVER_UNAVAILABLE_MSG } from "./server-unavailable";
import { showServerUnavailable } from "./server-unavailable-bridge";

// Re-export for callers that still use query-client for URL/errors
export { getApiUrl, UNAUTHORIZED_MSG } from "@/api/requestClient";
export { SERVER_UNAVAILABLE_MSG } from "./server-unavailable";

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "omit",
    });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }

  await throwIfResNotOk(res);
  return res;
}

/** Authenticated request: adds Authorization Bearer token. Throws Error(UNAUTHORIZED_MSG) on 401. No retry. */
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

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "omit",
    });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }

  if (res.status === 401) {
    throw new Error(UNAUTHORIZED_MSG);
  }

  await throwIfResNotOk(res);
  return res;
}

/** Authenticated request with retry: on 401 refresh once and retry. See api/requestClient.ts for queue and redirect behavior. */
export async function apiRequestWithAuthRetry(
  method: string,
  route: string,
  data?: unknown | undefined,
  accessToken?: string | null,
): Promise<Response> {
  return requestWithAuthRetry(method, route, data, accessToken);
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
  try {
    return await fetch(url.toString(), { method: "GET", credentials: "omit" });
  } catch (e) {
    if (isServerUnavailableError(e)) {
      showServerUnavailable();
      throw new Error(SERVER_UNAVAILABLE_MSG);
    }
    throw e;
  }
}

/** Fetch open/closed/delayed counts. GET /api/v1/entry-app?view=counts → { success, data: { open, closed, delayed } }. On 401 tries refresh then retries. */
export async function fetchTicketCountsSafe(
  _hubId?: string,
  accessToken?: string | null,
): Promise<{ open: number; closed: number; delayed: number }> {
  try {
    const res = await fetchWithAuthRetry(ENTRY_APP_COUNTS_PATH, accessToken);
    if (!res.ok) return { open: 0, closed: 0, delayed: 0 };
    const json = (await res.json()) as { success?: boolean; data?: { open?: number; closed?: number; delayed?: number } };
    const data = json.data;
    const open = Number(data?.open ?? 0) || 0;
    const closed = Number(data?.closed ?? 0) || 0;
    const delayed = Number(data?.delayed ?? 0) || 0;
    return { open, closed, delayed };
  } catch {
    return { open: 0, closed: 0, delayed: 0 };
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
