import { useState } from "react";
import { Scatter } from "react-chartjs-2";
import "../molecules/chartSetup";
import { ResponsiveChartContainer } from "../molecules/ResponsiveChartContainer";
import { Skeleton } from "../atoms/Skeleton";
import { EmptyState } from "../atoms/EmptyState";
import { ErrorState } from "../atoms/ErrorState";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { buildScatterChartData } from "../../lib/scatterChart.utils";
import type { PlayerRecommendation } from "../../lib/types";

export function FitValueScatter({
  players,
  status = "success",
  onRetry,
  onClearFilters,
}: {
  players: PlayerRecommendation[];
  status?: "loading" | "error" | "success";
  onRetry?: () => void;
  onClearFilters?: () => void;
}) {
  const [listView, setListView] = useState(false);

  if (status === "loading") return <Skeleton className="h-72 w-full" />;
  if (status === "error")
    return <ErrorState message="Fit-vs-value chart temporarily unavailable" onRetry={onRetry} />;

  const plottable = players.filter((p) => p.current_valuation !== null);
  if (plottable.length === 0) {
    return (
      <EmptyState
        message="No players match these filters"
        actionLabel={onClearFilters ? "Clear filters" : undefined}
        onAction={onClearFilters}
      />
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold text-primary-900">Fit vs. market value</h3>
        {/* Narrow-viewport list-view toggle (Frontend Design Doc §6.1), always available. */}
        <Button
          variant="secondary"
          className="text-xs sm:hidden"
          aria-pressed={listView}
          onClick={() => setListView((v) => !v)}
        >
          {listView ? "Show chart" : "Show as list"}
        </Button>
      </div>

      {listView ? (
        <ul className="space-y-1 text-sm">
          {plottable.map((p) => (
            <li key={p.player_id} className="flex items-center justify-between border-b border-neutral-100 py-1">
              <span>{p.full_name}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {p.fit_score.toFixed(2)} · {p.current_valuation?.toLocaleString()}{" "}
                {p.valuation_currency}
                {p.recommended && <Badge tone="success">Recommended</Badge>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <ResponsiveChartContainer>
            <Scatter
              role="img"
              aria-label="Fit score versus market value scatter plot"
              data={buildScatterChartData(players)}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: { display: true, text: "Fit score" }, min: 0, max: 1 },
                  y: { title: { display: true, text: "Market valuation" } },
                },
              }}
            />
          </ResponsiveChartContainer>
        </div>
      )}

      <table className="sr-only-table">
        <caption>Fit score versus market valuation, by player</caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Fit score</th>
            <th scope="col">Valuation</th>
            <th scope="col">Recommended</th>
          </tr>
        </thead>
        <tbody>
          {plottable.map((p) => (
            <tr key={p.player_id}>
              <td>{p.full_name}</td>
              <td>{p.fit_score}</td>
              <td>
                {p.current_valuation} {p.valuation_currency}
              </td>
              <td>{p.recommended ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
