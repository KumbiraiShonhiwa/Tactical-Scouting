import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { queryKeys } from "../lib/queryKeys";
import type { TacticalDimension, WeightingsResponse } from "../lib/types";

export function useSaveWeightings(clubId: string, accessToken: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<WeightingsResponse, Error, Record<TacticalDimension, number>>({
    mutationFn: (weightings) => {
      if (!accessToken) throw new Error("Not authenticated");
      return apiClient.saveWeightings(clubId, { weightings }, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tacticalProfile(clubId) });
      queryClient.invalidateQueries({ queryKey: ["recommendations", clubId] });
    },
  });
}

export function useTriggerPipeline(accessToken: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!accessToken) throw new Error("Not authenticated");
      return apiClient.triggerPipeline(accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineRuns() });
    },
  });
}
