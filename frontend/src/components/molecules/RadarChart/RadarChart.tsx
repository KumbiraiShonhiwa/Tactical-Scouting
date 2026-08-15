import { useState } from "react";
import { Radar } from "react-chartjs-2";
import "../chartSetup";
import { ResponsiveChartContainer } from "../ResponsiveChartContainer";
import { Skeleton } from "../../atoms/Skeleton";
import { EmptyState } from "../../atoms/EmptyState";
import { ErrorState } from "../../atoms/ErrorState";
import { buildRadarChartData, buildRadarTableRows, type RadarSeries } from "../../../lib/radarChart.utils";
import { TACTICAL_DIMENSIONS } from "./dimensions";
import { Button } from "../../atoms/Button";

export type RadarChartStatus = "loading" | "error" | "success";

export function RadarChart({
  series,
  status = "success",
  onRetry,
  title = "Tactical profile",
}: {
  series: RadarSeries[];
  status?: RadarChartStatus;
  onRetry?: () => void;
  title?: string;
}) {
  const [showTable, setShowTable] = useState(false);

  if (status === "loading") {
    return <Skeleton className="h-72 w-full" />;
  }

  if (status === "error") {
    return <ErrorState message="Tactical profile temporarily unavailable" onRetry={onRetry} />;
  }

  if (series.length === 0) {
    return <EmptyState message="No tactical profile data available yet." />;
  }

  const chartData = buildRadarChartData(TACTICAL_DIMENSIONS, series);
  const tableRows = buildRadarTableRows(TACTICAL_DIMENSIONS, series);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold text-primary-900">{title}</h3>
        <Button
          variant="secondary"
          className="text-xs"
          aria-pressed={showTable}
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? "Show chart" : "Show as table"}
        </Button>
      </div>

      {showTable ? (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title} — per-dimension values by series</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 pr-4">
                Dimension
              </th>
              {series.map((s) => (
                <th key={s.label} scope="col" className="py-1 pr-4">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.dimension} className="border-t border-neutral-100">
                <th scope="row" className="py-1 pr-4 font-normal">
                  {row.dimension}
                </th>
                {series.map((s) => (
                  <td key={s.label} className="py-1 pr-4 tabular-nums">
                    {row[s.label]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <ResponsiveChartContainer>
            <Radar
              data={chartData}
              options={{ responsive: true, maintainAspectRatio: false }}
              aria-label={title}
              role="img"
            />
          </ResponsiveChartContainer>
          {/* Screen-reader-reachable fallback kept in the DOM even while the chart is shown. */}
          <table className="sr-only-table">
            <caption>{title} — per-dimension values by series</caption>
            <thead>
              <tr>
                <th scope="col">Dimension</th>
                {series.map((s) => (
                  <th key={s.label} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.dimension}>
                  <th scope="row">{row.dimension}</th>
                  {series.map((s) => (
                    <td key={s.label}>{row[s.label]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
