import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Login } from "./Login";
import { renderWithAuth, adminAuth, signedOutAuth } from "../test/renderWithAuth";

describe("Login", () => {
  it("renders the sign-in form when signed out", () => {
    renderWithAuth(<Login />, { route: "/login" });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("redirects away from /login when already signed in as admin", () => {
    renderWithAuth(<Login />, { route: "/login", auth: adminAuth });
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("calls signIn with the entered credentials on submit", async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null });
    renderWithAuth(<Login />, { route: "/login", auth: { ...signedOutAuth, signIn } });

    await userEvent.type(screen.getByLabelText("Email"), "scout@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "hunter2");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("scout@example.test", "hunter2");
  });

  it("shows the error message when sign-in fails", async () => {
    const signIn = vi.fn().mockResolvedValue({ error: "Invalid login credentials" });
    renderWithAuth(<Login />, { route: "/login", auth: { ...signedOutAuth, signIn } });

    await userEvent.type(screen.getByLabelText("Email"), "scout@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
  });
});
