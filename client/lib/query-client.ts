import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { TICKET_STATS_PATH } from "./api-endpoints";

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

/** Fetch open/closed counts. Your API: GET /api/v1/testRoutes/tickets/stats. */
export async function fetchTicketCountsSafe(): Promise<{
  open: number;
  closed: number;
}> {
  try {
    const baseUrl = getApiUrl();
    const url = new URL(TICKET_STATS_PATH, baseUrl);
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return { open: 0, closed: 0 };
    const data = (await res.json()) as Record<string, unknown>;
    const results = data.results as Record<string, unknown> | undefined;
    const open = Number(results?.open ?? results?.openCount ?? 0) || 0;
    const closed = Number(results?.closed ?? results?.closedCount ?? 0) || 0;
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
