import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthContext, type AuthState } from "./AuthContext";

function renderProtected(auth: AuthState) {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <div>Admin content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

const baseAuth: AuthState = {
  user: null,
  session: null,
  role: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

describe("ProtectedRoute", () => {
  it("shows a loading indicator while the session is being checked", () => {
    renderProtected({ ...baseAuth, loading: true });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("redirects to /login when signed out", () => {
    renderProtected(baseAuth);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to /login for a signed-in standard (non-admin) user", () => {
    renderProtected({
      ...baseAuth,
      // @ts-expect-error -- minimal fixture, only fields ProtectedRoute reads matter
      user: { id: "u1" },
      role: "standard",
    });
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected content for a signed-in admin user", () => {
    renderProtected({
      ...baseAuth,
      // @ts-expect-error -- minimal fixture, only fields ProtectedRoute reads matter
      user: { id: "u1" },
      role: "admin",
    });
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });
});
