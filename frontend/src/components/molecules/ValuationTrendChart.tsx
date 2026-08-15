import { Line } from "react-chartjs-2";
import "./chartSetup";
import { ResponsiveChartContainer } from "./ResponsiveChartContainer";
import { Skeleton } from "../atoms/Skeleton";
import { EmptyState } from "../atoms/EmptyState";
import { ErrorState } from "../atoms/ErrorState";
import type { MarketValuation } from "../../lib/types";

export function ValuationTrendChart({
  valuations,
  status = "success",
  onRetry,
}: {
  valuations: MarketValuation[];
  status?: "loading" | "error" | "success";
  onRetry?: () => void;
}) {
  if (status === "loading") return <Skeleton className="h-56 w-full" />;
  if (status === "error")
    return <ErrorState message="Valuation history temporarily unavailable" onRetry={onRetry} />;
  if (valuations.length === 0)
    return <EmptyState message="No market valuation history recorded yet." />;

  return (
    <div>
      <h3 className="mb-2 text-base font-semibold text-primary-900">Valuation trend</h3>
      <ResponsiveChartContainer minHeight={220}>
        <Line
          role="img"
          aria-label="Market valuation over time"
          data={{
            labels: valuations.map((v) => v.valuation_date),
            datasets: [
              {
                label: `Valuation (${valuations[0].currency})`,
                data: valuations.map((v) => v.valuation_amount),
                borderColor: "#0F766E",
                backgroundColor: "#0F766E33",
                tension: 0.2,
              },
            ],
          }}
          options={{ responsive: true, maintainAspectRatio: false }}
        />
      </ResponsiveChartContainer>
      <table className="sr-only-table">
        <caption>Market valuation history</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Valuation</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {valuations.map((v) => (
            <tr key={v.valuation_id}>
              <td>{v.valuation_date}</td>
              <td>
                {v.valuation_amount} {v.currency}
              </td>
              <td>{v.data_source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
