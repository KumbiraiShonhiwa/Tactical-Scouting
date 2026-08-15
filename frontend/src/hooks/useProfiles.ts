import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { queryKeys } from "../lib/queryKeys";
import type { Profile } from "../lib/types";

// Read-only per the Phase 4 plan's "Admin Users scope" decision — no write path exists yet.
export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
