/**
 * React Query configuration only. No fetch, no auth, no server-unavailable logic.
 * Screens call apis/ (e.g. getTicketCounts, getTicketList, createTicket); those use the single engine in api/requestClient.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
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
