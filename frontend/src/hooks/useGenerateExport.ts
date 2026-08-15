import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import type { GenerateExportResponse, RecommendationsFilters } from "../lib/types";

// Phase 5: the additive "get a shareable link" action alongside ExportButton's existing
// instant client-side CSV download (Phase 4) — calls the generate-export Edge Function, which
// re-fetches the authoritative ranked list server-side and returns a short-lived signed URL to
// a CSV in the private "exports" Storage bucket.
export function useGenerateExport(clubId: string) {
  return useMutation<GenerateExportResponse, Error, RecommendationsFilters>({
    mutationFn: async (filters) => {
      const { data, error } = await supabase.functions.invoke<GenerateExportResponse>(
        "generate-export",
        { body: { club_id: clubId, filters } },
      );
      if (error) throw error;
      if (!data) throw new Error("generate-export returned no data");
      return data;
    },
  });
}
