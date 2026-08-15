import type { ChartData } from "chart.js";

export interface RadarDimension {
  key: string;
  label: string;
}

export interface RadarSeries {
  label: string;
  color: string;
  values: Record<string, number | null | undefined>;
}

const CHART_COLORS = ["#1F3864", "#0F766E", "#2E74B5"] as const;

export function seriesColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function buildRadarChartData(
  dimensions: RadarDimension[],
  series: RadarSeries[],
): ChartData<"radar"> {
  return {
    labels: dimensions.map((d) => d.label),
    datasets: series.map((s) => ({
      label: s.label,
      data: dimensions.map((d) => s.values[d.key] ?? 0),
      backgroundColor: `${s.color}33`,
      borderColor: s.color,
      pointBackgroundColor: s.color,
    })),
  };
}

export interface RadarTableRow {
  dimension: string;
  [seriesLabel: string]: string | number;
}

// Accessible data-table fallback (Frontend Design Doc §7) built from the same data the chart
// consumes, not a separate data path.
export function buildRadarTableRows(
  dimensions: RadarDimension[],
  series: RadarSeries[],
): RadarTableRow[] {
  return dimensions.map((d) => {
    const row: RadarTableRow = { dimension: d.label };
    for (const s of series) {
      row[s.label] = s.values[d.key] ?? 0;
    }
    return row;
  });
}
