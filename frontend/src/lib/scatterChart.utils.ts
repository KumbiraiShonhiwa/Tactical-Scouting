import type { ChartData } from "chart.js";
import type { PlayerRecommendation } from "./types";

export interface ScatterPoint {
  x: number;
  y: number;
  playerId: string;
  fullName: string;
  recommended: boolean;
}

// Fit-vs-value scatter (DV-03): x = fit score, y = current market valuation. Players with no
// valuation yet are excluded from the chart (nothing to plot on the y-axis) but still appear
// in RankedPlayerTable — this filtering is the reason it's a pure, independently-tested
// function rather than inline chart-config code.
export function toScatterPoints(players: PlayerRecommendation[]): ScatterPoint[] {
  return players
    .filter((p): p is PlayerRecommendation & { current_valuation: number } =>
      p.current_valuation !== null,
    )
    .map((p) => ({
      x: p.fit_score,
      y: p.current_valuation,
      playerId: p.player_id,
      fullName: p.full_name,
      recommended: p.recommended,
    }));
}

export function buildScatterChartData(players: PlayerRecommendation[]): ChartData<"scatter"> {
  const points = toScatterPoints(players);
  return {
    datasets: [
      {
        label: "Recommended",
        data: points.filter((p) => p.recommended),
        backgroundColor: "#0F9D58",
      },
      {
        label: "Other candidates",
        data: points.filter((p) => !p.recommended),
        backgroundColor: "#2E74B5",
      },
    ],
  };
}
