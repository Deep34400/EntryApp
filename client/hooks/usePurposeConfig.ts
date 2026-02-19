import { useQuery } from "@tanstack/react-query";
import { getPurposeConfig } from "@/apis";
import { useAuth } from "@/contexts/AuthContext";
import type { PurposeConfigValue } from "@/types/purposeConfig";

const PURPOSE_CONFIG_STALE_MS = 5 * 60 * 1000; // 5 min — config changes rarely

export function usePurposeConfig(): {
  data: PurposeConfigValue | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { accessToken } = useAuth();
  const {
    data,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["purpose-config", accessToken],
    queryFn: () => getPurposeConfig(accessToken),
    staleTime: PURPOSE_CONFIG_STALE_MS,
    retry: 1,
  });

  return {
    data,
    isLoading,
    isRefetching,
    isError,
    error: error as Error | null,
    refetch,
  };
}
