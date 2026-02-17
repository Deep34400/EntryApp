import { QueryClient } from "@tanstack/react-query";
import { getApiUrl, throwIfResNotOk, requestWithAuthRetry } from "@/services/apiClient";

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
