import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PlayerDetail } from "./PlayerDetail";
import { mockClub, mockPlayer } from "../test/mocks/handlers";

function renderPlayerDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[`/players/${mockPlayer.player_id}?club_id=${mockClub.club_id}`]}
      >
        <Routes>
          <Route path="/players/:playerId" element={<PlayerDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PlayerDetail", () => {
  it("renders the player's name once loaded", async () => {
    renderPlayerDetail();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: mockPlayer.full_name })).toBeInTheDocument(),
    );
  });

  it("renders a back-link to the referring club", async () => {
    renderPlayerDetail();
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Back to/ })).toHaveAttribute(
        "href",
        `/clubs/${mockClub.club_id}`,
      ),
    );
  });
});
