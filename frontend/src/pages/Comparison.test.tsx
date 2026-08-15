import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Comparison } from "./Comparison";
import { mockPlayer } from "../test/mocks/handlers";

function renderComparison(route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Comparison />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Comparison", () => {
  it("renders an empty state when no players are selected", () => {
    renderComparison("/compare");
    expect(screen.getByText(/No players selected/)).toBeInTheDocument();
  });

  it("renders the selected player's name in the comparison table", async () => {
    renderComparison(`/compare?players=${mockPlayer.player_id}`);
    await waitFor(() =>
      expect(screen.getAllByText(mockPlayer.full_name).length).toBeGreaterThan(0),
    );
  });
});
