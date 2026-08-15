import { describe, expect, it } from "vitest";
import {
  buildRadarChartData,
  buildRadarTableRows,
  seriesColor,
  type RadarDimension,
  type RadarSeries,
} from "./radarChart.utils";

const dimensions: RadarDimension[] = [
  { key: "a", label: "Dimension A" },
  { key: "b", label: "Dimension B" },
];

const series: RadarSeries[] = [
  { label: "Club", color: "#1F3864", values: { a: 0.5, b: 0.2 } },
  { label: "Player", color: "#0F766E", values: { a: 0.9 } },
];

describe("seriesColor", () => {
  it("cycles through the fixed palette", () => {
    expect(seriesColor(0)).toBe("#1F3864");
    expect(seriesColor(3)).toBe(seriesColor(0));
  });
});

describe("buildRadarChartData", () => {
  it("maps dimension labels to chart labels", () => {
    const data = buildRadarChartData(dimensions, series);
    expect(data.labels).toEqual(["Dimension A", "Dimension B"]);
  });

  it("defaults a series' missing dimension value to 0", () => {
    const data = buildRadarChartData(dimensions, series);
    expect(data.datasets[1].data).toEqual([0.9, 0]);
  });

  it("carries the series color into border/background/point colors", () => {
    const data = buildRadarChartData(dimensions, series);
    expect(data.datasets[0].borderColor).toBe("#1F3864");
    expect(data.datasets[0].pointBackgroundColor).toBe("#1F3864");
  });
});

describe("buildRadarTableRows", () => {
  it("builds one row per dimension with each series' value keyed by label", () => {
    const rows = buildRadarTableRows(dimensions, series);
    expect(rows).toEqual([
      { dimension: "Dimension A", Club: 0.5, Player: 0.9 },
      { dimension: "Dimension B", Club: 0.2, Player: 0 },
    ]);
  });

  it("returns an empty array for no dimensions", () => {
    expect(buildRadarTableRows([], series)).toEqual([]);
  });
});
