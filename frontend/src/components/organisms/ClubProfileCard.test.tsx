import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ClubProfileCard } from "./ClubProfileCard";
import { mockClub } from "../../test/mocks/handlers";

function renderCard(props: Partial<ComponentProps<typeof ClubProfileCard>> = {}) {
  return render(
    <MemoryRouter>
      <ClubProfileCard {...props} />
    </MemoryRouter>,
  );
}

describe("ClubProfileCard", () => {
  it("renders a skeleton while loading", () => {
    renderCard({ status: "loading" });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error alert with retry", async () => {
    const onRetry = vi.fn();
    renderCard({ status: "error", onRetry });
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the club name linking to its detail page", () => {
    renderCard({ club: mockClub, status: "success" });
    const link = screen.getByRole("link", { name: new RegExp(mockClub.name) });
    expect(link).toHaveAttribute("href", `/clubs/${mockClub.club_id}`);
  });

  it("renders initials when no crest is available", () => {
    renderCard({ club: mockClub, status: "success" });
    expect(screen.getByText("TE")).toBeInTheDocument();
  });
});
