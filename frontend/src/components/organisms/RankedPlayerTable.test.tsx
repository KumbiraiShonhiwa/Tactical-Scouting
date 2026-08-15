import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RankedPlayerTable } from "./RankedPlayerTable";
import { mockRecommendation } from "../../test/mocks/handlers";

function renderTable(props: Partial<ComponentProps<typeof RankedPlayerTable>> = {}) {
  return render(
    <MemoryRouter>
      <RankedPlayerTable clubId="club-1" players={[]} {...props} />
    </MemoryRouter>,
  );
}

describe("RankedPlayerTable", () => {
  it("renders skeletons in the loading state", () => {
    renderTable({ status: "loading" });
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("renders an error alert with retry in the error state", async () => {
    const onRetry = vi.fn();
    renderTable({ status: "error", onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Player recommendations temporarily unavailable",
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state with a clear-filters action when there are no players", async () => {
    const onClearFilters = vi.fn();
    renderTable({ status: "success", players: [], onClearFilters });
    expect(screen.getByText("No players match these filters")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("renders a populated row with the player's name and fit score", () => {
    renderTable({ status: "success", players: [mockRecommendation] });
    expect(screen.getByRole("link", { name: mockRecommendation.full_name })).toBeInTheDocument();
    expect(screen.getByText("0.82")).toBeInTheDocument();
  });

  it("shows a Recommended badge only for recommended players", () => {
    renderTable({ status: "success", players: [mockRecommendation] });
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("calls onAddToComparison when the Compare action is clicked", async () => {
    const onAddToComparison = vi.fn();
    renderTable({ status: "success", players: [mockRecommendation], onAddToComparison });
    await userEvent.click(screen.getByRole("button", { name: /Add .* to comparison/ }));
    expect(onAddToComparison).toHaveBeenCalledWith(mockRecommendation.player_id);
  });

  it("renders pagination controls and calls onPageChange", async () => {
    const onPageChange = vi.fn();
    renderTable({
      status: "success",
      players: [mockRecommendation],
      pagination: { page: 2, page_size: 25, total_count: 100, total_pages: 4 },
      onPageChange,
    });
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
