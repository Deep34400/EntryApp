/**
 * Shared React Query hook for referral/agent names. Single API call per session;
 * all consumers (e.g. ReferralSection) share the same cache to avoid duplicate calls.
 * Pass enabled: true only when the UI actually needs the list (e.g. referral === "yes").
 */

import { useQuery } from "@tanstack/react-query";
import { getReferralNames } from "@/apis";
import { useAuth } from "@/contexts/AuthContext";

const REFERRAL_NAMES_STALE_MS = 10 * 60 * 1000; // 10 min

export function useReferralNames(options?: { enabled?: boolean }): {
  data: Awaited<ReturnType<typeof getReferralNames>>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { accessToken } = useAuth();
  const enabled = options?.enabled !== false && !!accessToken;
  const query = useQuery({
    queryKey: ["referral-names", accessToken ?? ""],
    queryFn: () => getReferralNames(accessToken),
    staleTime: REFERRAL_NAMES_STALE_MS,
    enabled,
  });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
