import { Skeleton } from "../atoms/Skeleton";
import { EmptyState } from "../atoms/EmptyState";
import { ErrorState } from "../atoms/ErrorState";
import type { FitBreakdownResponse, Player, PlayerStatistics } from "../../lib/types";

export function PlayerStatsPanel({
  player,
  statistics,
  breakdown,
  status = "success",
  onRetry,
}: {
  player?: Player;
  statistics?: PlayerStatistics;
  breakdown?: FitBreakdownResponse;
  status?: "loading" | "error" | "success";
  onRetry?: () => void;
}) {
  if (status === "loading") {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState message="Player statistics temporarily unavailable" onRetry={onRetry} />;
  }

  if (!player || !statistics) {
    return <EmptyState message="No statistics recorded for this player yet." />;
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-primary-900">{player.full_name}</h3>
      <p className="text-xs text-neutral-700">
        {player.position} · {player.current_club ?? "Unattached"} ·{" "}
        {player.nationality ?? "Nationality unknown"}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-neutral-700">Minutes played</dt>
        <dd className="tabular-nums">{statistics.minutes_played}</dd>
        <dt className="text-neutral-700">Progressive passes/90</dt>
        <dd className="tabular-nums">{statistics.progressive_passes_per90 ?? "—"}</dd>
        <dt className="text-neutral-700">Defensive actions/90</dt>
        <dd className="tabular-nums">{statistics.defensive_actions_per90 ?? "—"}</dd>
        <dt className="text-neutral-700">Pressures/90</dt>
        <dd className="tabular-nums">{statistics.pressures_per90 ?? "—"}</dd>
        <dt className="text-neutral-700">Crosses/90</dt>
        <dd className="tabular-nums">{statistics.crosses_per90 ?? "—"}</dd>
        <dt className="text-neutral-700">Goals/90</dt>
        <dd className="tabular-nums">{statistics.goals_per90 ?? "—"}</dd>
        <dt className="text-neutral-700">Assists/90</dt>
        <dd className="tabular-nums">{statistics.assists_per90 ?? "—"}</dd>
      </dl>
      <p className="mt-2 text-xs text-neutral-700">
        Source: {statistics.data_source}, retrieved{" "}
        {new Date(statistics.retrieved_at).toLocaleDateString()}
      </p>

      {breakdown && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-primary-900">
            Why this score — {(breakdown.overall_score * 100).toFixed(0)}% fit
          </h4>
          <ul className="mt-2 space-y-1 text-sm">
            {breakdown.contributing_metrics.map((m) => (
              <li key={m.metric} className="flex justify-between border-b border-neutral-100 py-1">
                <span>{m.label}</span>
                <span className="tabular-nums text-neutral-700">
                  {m.player_value ?? "—"} vs. target {m.club_target_value} (weight{" "}
                  {(m.weight * 100).toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
