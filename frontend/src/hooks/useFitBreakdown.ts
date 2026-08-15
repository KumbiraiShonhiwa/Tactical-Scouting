import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { queryKeys } from "../lib/queryKeys";

export function useFitBreakdown(playerId: string | undefined, clubId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.fitBreakdown(playerId ?? "", clubId ?? ""),
    queryFn: () => apiClient.getFitBreakdown(playerId as string, clubId as string),
    enabled: Boolean(playerId && clubId),
  });
}
