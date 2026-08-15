import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ValuationTrendChart } from "./ValuationTrendChart";

const valuation = {
  valuation_id: "v1",
  player_id: "p1",
  valuation_amount: 10_000_000,
  currency: "EUR",
  valuation_date: "2026-01-01",
  data_source: "transfermarkt",
};

describe("ValuationTrendChart", () => {
  it("renders a skeleton while loading", () => {
    render(<ValuationTrendChart valuations={[]} status="loading" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error alert with retry", async () => {
    const onRetry = vi.fn();
    render(<ValuationTrendChart valuations={[]} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when there is no valuation history", () => {
    render(<ValuationTrendChart valuations={[]} status="success" />);
    expect(screen.getByText("No market valuation history recorded yet.")).toBeInTheDocument();
  });

  it("renders the accessible history table", () => {
    render(<ValuationTrendChart valuations={[valuation]} status="success" />);
    expect(screen.getByText("transfermarkt")).toBeInTheDocument();
  });
});
