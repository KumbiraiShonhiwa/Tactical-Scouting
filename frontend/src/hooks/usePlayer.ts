import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { queryKeys } from "../lib/queryKeys";
import type { MarketValuation, Player, PlayerStatistics } from "../lib/types";

export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.player(playerId ?? ""),
    queryFn: async (): Promise<Player> => {
      const { data, error } = await supabase
        .from("player")
        .select("*")
        .eq("player_id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(playerId),
  });
}

export function usePlayerStatistics(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.playerStatistics(playerId ?? ""),
    queryFn: async (): Promise<PlayerStatistics[]> => {
      const { data, error } = await supabase
        .from("player_statistics")
        .select("*")
        .eq("player_id", playerId)
        .order("season", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(playerId),
  });
}

export function useMarketValuations(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.marketValuations(playerId ?? ""),
    queryFn: async (): Promise<MarketValuation[]> => {
      const { data, error } = await supabase
        .from("market_valuation")
        .select("*")
        .eq("player_id", playerId)
        .order("valuation_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(playerId),
  });
}
