import { describe, expect, it } from "vitest";
import { buildScatterChartData, toScatterPoints } from "./scatterChart.utils";
import type { PlayerRecommendation } from "./types";

function makePlayer(overrides: Partial<PlayerRecommendation>): PlayerRecommendation {
  return {
    player_id: "p1",
    full_name: "Test Player",
    position: "CM",
    age: 25,
    minutes_played: 1000,
    fit_score: 0.7,
    undervaluation_index: 1.2,
    recommended: false,
    current_valuation: 1_000_000,
    valuation_currency: "EUR",
    ...overrides,
  };
}

describe("toScatterPoints", () => {
  it("excludes players with no current valuation", () => {
    const points = toScatterPoints([
      makePlayer({ player_id: "a", current_valuation: null }),
      makePlayer({ player_id: "b", current_valuation: 5_000_000 }),
    ]);
    expect(points.map((p) => p.playerId)).toEqual(["b"]);
  });

  it("maps fit_score to x and current_valuation to y", () => {
    const [point] = toScatterPoints([makePlayer({ fit_score: 0.6, current_valuation: 2_000_000 })]);
    expect(point.x).toBe(0.6);
    expect(point.y).toBe(2_000_000);
  });
});

describe("buildScatterChartData", () => {
  it("splits players into a recommended and an other-candidates dataset", () => {
    const data = buildScatterChartData([
      makePlayer({ player_id: "rec", recommended: true }),
      makePlayer({ player_id: "other", recommended: false }),
    ]);
    expect(data.datasets[0].label).toBe("Recommended");
    expect(data.datasets[0].data).toHaveLength(1);
    expect(data.datasets[1].label).toBe("Other candidates");
    expect(data.datasets[1].data).toHaveLength(1);
  });

  it("produces empty datasets when there are no plottable players", () => {
    const data = buildScatterChartData([makePlayer({ current_valuation: null })]);
    expect(data.datasets[0].data).toHaveLength(0);
    expect(data.datasets[1].data).toHaveLength(0);
  });
});
