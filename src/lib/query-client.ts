import { QueryClient } from "@tanstack/react-query";
import { getApiUrl, throwIfResNotOk, requestWithAuthRetry } from "@/services/apiClient";
import { ENTRY_APP_COUNTS_PATH } from "@/lib/api-endpoints";

export { getApiUrl, UNAUTHORIZED_MSG } from "@/services/apiClient";

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "omit",
  });
  await throwIfResNotOk(res);
  return res;
}

export async function apiRequestWithAuthRetry(
  method: string,
  route: string,
  data?: unknown,
  accessToken?: string | null
): Promise<Response> {
  return requestWithAuthRetry(method, route, data, accessToken);
}

export async function fetchWithAuthRetry(
  route: string,
  accessToken?: string | null
): Promise<Response> {
  if (accessToken?.trim()) {
    return requestWithAuthRetry("GET", route, undefined, accessToken);
  }
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  return fetch(url.toString(), { method: "GET", credentials: "omit" });
}

/** Fetch open/closed/delayed counts. On 401 tries refresh then retries. */
export async function fetchTicketCountsSafe(
  _hubId?: string,
  accessToken?: string | null
): Promise<{ open: number; closed: number; delayed: number }> {
  try {
    const res = await fetchWithAuthRetry(ENTRY_APP_COUNTS_PATH, accessToken);
    if (!res.ok) return { open: 0, closed: 0, delayed: 0 };
    const json = (await res.json()) as { success?: boolean; data?: { open?: number; closed?: number; delayed?: number } };
    const data = json.data;
    return {
      open: Number(data?.open ?? 0) || 0,
      closed: Number(data?.closed ?? 0) || 0,
      delayed: Number(data?.delayed ?? 0) || 0,
    };
  } catch {
    return { open: 0, closed: 0, delayed: 0 };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: { retry: false },
  },
});
