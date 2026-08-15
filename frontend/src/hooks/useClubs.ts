import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { queryKeys } from "../lib/queryKeys";
import type { Club } from "../lib/types";

export function useClubs() {
  return useQuery({
    queryKey: queryKeys.clubs(),
    queryFn: async (): Promise<Club[]> => {
      const { data, error } = await supabase.from("club").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useClub(clubId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.club(clubId ?? ""),
    queryFn: async (): Promise<Club> => {
      const { data, error } = await supabase
        .from("club")
        .select("*")
        .eq("club_id", clubId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(clubId),
  });
}
