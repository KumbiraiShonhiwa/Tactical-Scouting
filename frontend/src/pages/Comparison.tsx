import { useQueries } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { queryKeys } from "../lib/queryKeys";
import { RadarChart } from "../components/molecules/RadarChart";
import { Button } from "../components/atoms/Button";
import { EmptyState } from "../components/atoms/EmptyState";
import { Skeleton } from "../components/atoms/Skeleton";
import { seriesColor } from "../lib/radarChart.utils";
import type { Player, PlayerStatistics } from "../lib/types";
import type { RadarSeries } from "../lib/radarChart.utils";

interface ComparisonEntry {
  player: Player;
  statistics: PlayerStatistics | undefined;
}

export function Comparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const playerIds = (searchParams.get("players") ?? "").split(",").filter(Boolean);

  const queries = useQueries({
    queries: playerIds.map((playerId) => ({
      queryKey: queryKeys.player(playerId),
      queryFn: async (): Promise<ComparisonEntry> => {
        const [{ data: player, error: playerError }, { data: stats, error: statsError }] =
          await Promise.all([
            supabase.from("player").select("*").eq("player_id", playerId).single(),
            supabase
              .from("player_statistics")
              .select("*")
              .eq("player_id", playerId)
              .order("season", { ascending: false })
              .limit(1),
          ]);
        if (playerError) throw playerError;
        if (statsError) throw statsError;
        return { player, statistics: stats?.[0] };
      },
    })),
  });

  function removePlayer(playerId: string) {
    setSearchParams({ players: playerIds.filter((id) => id !== playerId).join(",") });
  }

  if (playerIds.length === 0) {
    return (
      <EmptyState message="No players selected. Add players to compare from a club's ranked list or a player's detail page." />
    );
  }

  if (queries.some((q) => q.isPending)) {
    return <Skeleton className="h-96 w-full" />;
  }

  const entries = queries
    .filter((q): q is typeof q & { data: ComparisonEntry } => Boolean(q.data))
    .map((q) => q.data);

  const radarSeries: RadarSeries[] = entries
    .filter((e) => e.statistics)
    .map((e, index) => ({
      label: e.player.full_name,
      color: seriesColor(index),
      values: {
        possession_share: e.statistics!.possession_involvement_pct ?? 0,
        ppda: e.statistics!.defensive_actions_per90 ?? 0,
        buildup_speed:
          (e.statistics!.progressive_passes_per90 ?? 0) +
          (e.statistics!.progressive_carries_per90 ?? 0),
        defensive_line_height: 0,
        crossing_frequency: e.statistics!.crosses_per90 ?? 0,
        pressing_intensity: e.statistics!.pressures_per90 ?? 0,
      },
    }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-primary-900">Player Comparison</h1>

      <RadarChart title="Overlapping tactical profile" series={radarSeries} />

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Side-by-side player statistics</caption>
          <thead>
            <tr className="border-b border-neutral-100 text-xs uppercase text-neutral-700">
              <th scope="col" className="py-2 pr-4">
                Metric
              </th>
              {entries.map((e) => (
                <th key={e.player.player_id} scope="col" className="py-2 pr-4">
                  {e.player.full_name}
                  <Button
                    variant="secondary"
                    className="ml-2 text-xs"
                    aria-label={`Remove ${e.player.full_name} from comparison`}
                    onClick={() => removePlayer(e.player.player_id)}
                  >
                    Remove
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-100">
              <th scope="row" className="py-2 pr-4 font-normal">
                Position
              </th>
              {entries.map((e) => (
                <td key={e.player.player_id} className="py-2 pr-4">
                  {e.player.position}
                </td>
              ))}
            </tr>
            <tr className="border-b border-neutral-100">
              <th scope="row" className="py-2 pr-4 font-normal">
                Minutes played
              </th>
              {entries.map((e) => (
                <td key={e.player.player_id} className="py-2 pr-4 tabular-nums">
                  {e.statistics?.minutes_played ?? "—"}
                </td>
              ))}
            </tr>
            <tr className="border-b border-neutral-100">
              <th scope="row" className="py-2 pr-4 font-normal">
                Goals/90
              </th>
              {entries.map((e) => (
                <td key={e.player.player_id} className="py-2 pr-4 tabular-nums">
                  {e.statistics?.goals_per90 ?? "—"}
                </td>
              ))}
            </tr>
            <tr className="border-b border-neutral-100">
              <th scope="row" className="py-2 pr-4 font-normal">
                Assists/90
              </th>
              {entries.map((e) => (
                <td key={e.player.player_id} className="py-2 pr-4 tabular-nums">
                  {e.statistics?.assists_per90 ?? "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
