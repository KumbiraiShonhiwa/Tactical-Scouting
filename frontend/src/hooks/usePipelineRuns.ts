import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { queryKeys } from "../lib/queryKeys";
import type { PipelineRun } from "../lib/types";

export function usePipelineRuns() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.pipelineRuns(),
    queryFn: async (): Promise<PipelineRun[]> => {
      const { data, error } = await supabase
        .from("pipeline_run")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Realtime-subscribed per the Frontend Design Doc §4.3 — a run's status updates live while
  // an admin is watching it, without a page refresh. Requires pipeline_run to be added to the
  // supabase_realtime publication (see the Realtime migration).
  useEffect(() => {
    const channel = supabase
      .channel("pipeline_run-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pipeline_run" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.pipelineRuns() });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
