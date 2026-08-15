import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FitValueScatter } from "./FitValueScatter";
import { mockRecommendation } from "../../test/mocks/handlers";

describe("FitValueScatter", () => {
  it("renders a skeleton while loading", () => {
    render(<FitValueScatter players={[]} status="loading" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error alert with retry", async () => {
    const onRetry = vi.fn();
    render(<FitValueScatter players={[]} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when no player has a valuation to plot", () => {
    render(
      <FitValueScatter
        players={[{ ...mockRecommendation, current_valuation: null }]}
        status="success"
      />,
    );
    expect(screen.getByText("No players match these filters")).toBeInTheDocument();
  });

  it("renders the accessible fallback table when players are plottable", () => {
    render(<FitValueScatter players={[mockRecommendation]} status="success" />);
    expect(screen.getByText(mockRecommendation.full_name)).toBeInTheDocument();
  });
});
