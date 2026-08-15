import { Link, useParams, useSearchParams } from "react-router-dom";
import { usePlayer, usePlayerStatistics, useMarketValuations } from "../hooks/usePlayer";
import { useFitBreakdown } from "../hooks/useFitBreakdown";
import { useClub } from "../hooks/useClubs";
import { useTacticalProfile } from "../hooks/useTacticalProfile";
import { useComparisonList } from "../hooks/useComparisonList";
import { RadarChart } from "../components/molecules/RadarChart";
import { ValuationTrendChart } from "../components/molecules/ValuationTrendChart";
import { PlayerStatsPanel } from "../components/organisms/PlayerStatsPanel";
import { Button } from "../components/atoms/Button";
import { Skeleton } from "../components/atoms/Skeleton";
import { ErrorState } from "../components/atoms/ErrorState";
import { seriesColor } from "../lib/radarChart.utils";
import type { RadarSeries } from "../lib/radarChart.utils";

function statusOf(query: { isPending: boolean; isError: boolean }): "loading" | "error" | "success" {
  if (query.isPending) return "loading";
  if (query.isError) return "error";
  return "success";
}

export function PlayerDetail() {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get("club_id") ?? undefined;

  const playerQuery = usePlayer(playerId);
  const statsQuery = usePlayerStatistics(playerId);
  const valuationsQuery = useMarketValuations(playerId);
  const breakdownQuery = useFitBreakdown(playerId, clubId);
  const clubQuery = useClub(clubId);
  const profileQuery = useTacticalProfile(clubId);
  const comparison = useComparisonList();

  if (!playerId) return <ErrorState message="No player specified." />;

  if (playerQuery.isPending) return <Skeleton className="h-96 w-full" />;
  if (playerQuery.isError || !playerQuery.data)
    return <ErrorState message="Player not found." onRetry={() => playerQuery.refetch()} />;

  const latestStats = statsQuery.data?.[0];

  const radarSeries: RadarSeries[] = [];
  if (latestStats) {
    radarSeries.push({
      label: playerQuery.data.full_name,
      color: seriesColor(0),
      values: {
        possession_share: latestStats.possession_involvement_pct ?? 0,
        ppda: latestStats.defensive_actions_per90 ?? 0,
        buildup_speed:
          (latestStats.progressive_passes_per90 ?? 0) + (latestStats.progressive_carries_per90 ?? 0),
        defensive_line_height: 0,
        crossing_frequency: latestStats.crosses_per90 ?? 0,
        pressing_intensity: latestStats.pressures_per90 ?? 0,
      },
    });
  }
  if (profileQuery.data && clubQuery.data) {
    radarSeries.push({
      label: clubQuery.data.name,
      color: seriesColor(1),
      values: profileQuery.data.weightings,
    });
  }

  return (
    <div>
      {clubId && (
        <Link
          to={`/clubs/${clubId}`}
          className="interactive-control text-sm text-accent-teal underline-offset-2 hover:underline"
        >
          ← Back to {clubQuery.data?.name ?? "club"}
        </Link>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-900">{playerQuery.data.full_name}</h1>
        <Button
          variant="secondary"
          disabled={comparison.playerIds.includes(playerId) || comparison.isFull}
          onClick={() => comparison.add(playerId)}
        >
          {comparison.playerIds.includes(playerId) ? "Added to comparison" : "Add to comparison"}
        </Button>
      </div>

      {/* Three-column band: radar / fit breakdown / valuation trend (Frontend Design Doc §4.2),
          stacked vertically on mobile via the grid collapsing below md. */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <RadarChart
            title="Player vs. club profile"
            series={radarSeries}
            status={statusOf(statsQuery)}
            onRetry={() => statsQuery.refetch()}
          />
        </div>
        <div>
          <PlayerStatsPanel
            player={playerQuery.data}
            statistics={latestStats}
            breakdown={breakdownQuery.data}
            status={statusOf(statsQuery)}
            onRetry={() => statsQuery.refetch()}
          />
        </div>
        <div>
          <ValuationTrendChart
            valuations={valuationsQuery.data ?? []}
            status={statusOf(valuationsQuery)}
            onRetry={() => valuationsQuery.refetch()}
          />
        </div>
      </div>
    </div>
  );
}
