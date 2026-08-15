import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthState } from "../auth/AuthContext";
import { vi } from "vitest";

export const signedOutAuth: AuthState = {
  user: null,
  session: null,
  role: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

export const adminAuth: AuthState = {
  ...signedOutAuth,
  user: { id: "admin-1", email: "admin@example.test" } as AuthState["user"],
  session: { access_token: "admin-token", user: { id: "admin-1" } } as AuthState["session"],
  role: "admin",
};

export function renderWithAuth(
  ui: ReactElement,
  { route = "/", auth = signedOutAuth }: { route?: string; auth?: AuthState } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
