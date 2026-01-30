import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * API base URL — set EXPO_PUBLIC_API_URL in .env to your own backend (e.g. https://your-api.com).
 * Endpoints (paths) are in api-endpoints.ts — same GET/POST paths and shapes for your backend.
 */
export function getApiUrl(): string {
  // 1) Direct API URL — use this to point at your backend (local or deployed)
  const directUrl = process.env.EXPO_PUBLIC_API_URL;
  if (directUrl) {
    const url = new URL(directUrl);
    return url.href.replace(/\/$/, "");
  }

  // 2) Replit-style: host only → https://${host}
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  if (host) {
    const url = new URL(`https://${host}`);
    return url.href.replace(/\/$/, "");
  }

  throw new Error(
    "Set EXPO_PUBLIC_API_URL (e.g. http://localhost:5000) or EXPO_PUBLIC_DOMAIN in .env or when running the app"
  );
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

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
