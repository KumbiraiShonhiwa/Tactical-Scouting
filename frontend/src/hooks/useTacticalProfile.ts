import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { queryKeys } from "../lib/queryKeys";
import type { TacticalProfile } from "../lib/types";

export function useTacticalProfile(clubId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tacticalProfile(clubId ?? ""),
    queryFn: async (): Promise<TacticalProfile> => {
      const { data, error } = await supabase
        .from("tactical_profile")
        .select("*")
        .eq("club_id", clubId)
        .eq("is_current", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(clubId),
  });
}
