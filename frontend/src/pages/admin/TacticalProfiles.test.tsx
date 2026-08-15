import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TacticalProfiles } from "./TacticalProfiles";
import { renderWithAuth, adminAuth } from "../../test/renderWithAuth";
import { mockClub } from "../../test/mocks/handlers";

describe("TacticalProfiles (admin page)", () => {
  it("renders a club selector and the current profile version once loaded", async () => {
    renderWithAuth(<TacticalProfiles />, { auth: adminAuth });
    await waitFor(() =>
      expect(screen.getByRole("option", { name: mockClub.name })).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText(/Current version: 1/)).toBeInTheDocument());
  });
});
