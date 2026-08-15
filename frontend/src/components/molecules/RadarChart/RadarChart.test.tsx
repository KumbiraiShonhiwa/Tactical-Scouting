import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RadarChart } from "./RadarChart";

const series = [{ label: "Test United", color: "#1F3864", values: { possession_share: 0.6 } }];

describe("RadarChart", () => {
  it("renders a skeleton while loading", () => {
    render(<RadarChart series={[]} status="loading" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error alert with retry", async () => {
    const onRetry = vi.fn();
    render(<RadarChart series={[]} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when there is no series data", () => {
    render(<RadarChart series={[]} status="success" />);
    expect(screen.getByText("No tactical profile data available yet.")).toBeInTheDocument();
  });

  it("renders the accessible data-table fallback alongside the chart", () => {
    render(<RadarChart series={series} status="success" />);
    expect(screen.getByText("Possession share")).toBeInTheDocument();
    expect(screen.getByText("Test United")).toBeInTheDocument();
  });

  it("toggles to a visible table view on request", async () => {
    render(<RadarChart series={series} status="success" title="Club profile" />);
    await userEvent.click(screen.getByRole("button", { name: "Show as table" }));
    expect(screen.getByRole("button", { name: "Show chart" })).toBeInTheDocument();
  });
});
