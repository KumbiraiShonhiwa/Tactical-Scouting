import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NavBar } from "./NavBar";
import { renderWithAuth, adminAuth, signedOutAuth } from "../../test/renderWithAuth";

describe("NavBar", () => {
  it("shows a Login link when signed out", () => {
    renderWithAuth(<NavBar />);
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  });

  it("shows the Admin link and Sign out button for a signed-in admin", async () => {
    const signOut = vi.fn();
    renderWithAuth(<NavBar />, { auth: { ...adminAuth, signOut } });
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("does not show the Admin link for a signed-in standard user", () => {
    renderWithAuth(<NavBar />, {
      auth: { ...signedOutAuth, user: adminAuth.user, session: adminAuth.session, role: "standard" },
    });
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });
});
