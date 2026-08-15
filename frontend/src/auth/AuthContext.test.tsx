import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

const mockSession = {
  access_token: "token",
  user: { id: "u1", email: "admin@example.test" },
};

const authStateChangeCallback = vi.fn();

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((cb) => {
        authStateChangeCallback.mockImplementation(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" } }),
    })),
  },
}));

import { supabase } from "../lib/supabaseClient";

function Probe() {
  const { user, role, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{user ? `${user.email}:${role}` : "signed-out"}</span>;
}

describe("AuthProvider", () => {
  it("resolves to signed-out with no session", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
  });

  it("looks up the profiles.role for the current session and exposes it", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("admin@example.test:admin")).toBeInTheDocument(),
    );
  });
});
