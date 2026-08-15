import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { queryKeys } from "../lib/queryKeys";
import type { RecommendationsFilters } from "../lib/types";

export function useRecommendations(
  clubId: string | undefined,
  filters: RecommendationsFilters,
) {
  return useQuery({
    queryKey: queryKeys.recommendations(clubId ?? "", filters),
    queryFn: () => apiClient.getRecommendations(clubId as string, filters),
    enabled: Boolean(clubId),
  });
}
