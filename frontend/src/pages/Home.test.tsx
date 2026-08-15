import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { Home } from "./Home";
import { renderWithAuth } from "../test/renderWithAuth";
import { server } from "../test/mocks/server";
import { mockClub } from "../test/mocks/handlers";

describe("Home", () => {
  it("renders a card for each club once loaded", async () => {
    renderWithAuth(<Home />);
    await waitFor(() => expect(screen.getByText(mockClub.name)).toBeInTheDocument());
  });

  it("renders an empty state when there are no clubs", async () => {
    server.use(http.get("http://localhost:54321/rest/v1/club", () => HttpResponse.json([])));
    renderWithAuth(<Home />);
    await waitFor(() =>
      expect(screen.getByText("No clubs are configured yet.")).toBeInTheDocument(),
    );
  });

  it("renders an error state when the club list fails to load", async () => {
    server.use(
      http.get("http://localhost:54321/rest/v1/club", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    renderWithAuth(<Home />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
