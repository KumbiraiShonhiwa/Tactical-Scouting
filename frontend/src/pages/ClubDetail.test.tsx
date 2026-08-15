import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ClubDetail } from "./ClubDetail";
import { mockClub, mockRecommendation } from "../test/mocks/handlers";

function renderClubDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/clubs/${mockClub.club_id}`]}>
        <Routes>
          <Route path="/clubs/:clubId" element={<ClubDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ClubDetail", () => {
  it("renders the club name and its ranked candidates once loaded", async () => {
    renderClubDetail();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: mockClub.name })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: mockRecommendation.full_name }),
      ).toBeInTheDocument(),
    );
  });
});
