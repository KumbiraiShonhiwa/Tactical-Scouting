import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { Users } from "./Users";
import { renderWithAuth, adminAuth } from "../../test/renderWithAuth";
import { server } from "../../test/mocks/server";

describe("Users (admin page, read-only)", () => {
  it("renders each profile's id and role, with no write controls", async () => {
    server.use(
      http.get("http://localhost:54321/rest/v1/profiles", () =>
        HttpResponse.json([{ id: "u1", role: "admin", created_at: "2026-01-01T00:00:00Z" }]),
      ),
    );
    renderWithAuth(<Users />, { auth: adminAuth });
    await waitFor(() => expect(screen.getByText("u1")).toBeInTheDocument());
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders an empty state when there are no profiles", async () => {
    server.use(
      http.get("http://localhost:54321/rest/v1/profiles", () => HttpResponse.json([])),
    );
    renderWithAuth(<Users />, { auth: adminAuth });
    await waitFor(() => expect(screen.getByText("No user profiles found.")).toBeInTheDocument());
  });
});
