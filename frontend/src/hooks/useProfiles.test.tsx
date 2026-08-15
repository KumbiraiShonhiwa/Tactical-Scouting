import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { useProfiles } from "./useProfiles";
import { server } from "../test/mocks/server";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const profile = { id: "u1", role: "admin", created_at: "2026-01-01T00:00:00Z" };

describe("useProfiles", () => {
  it("fetches the profiles list", async () => {
    server.use(
      http.get("http://localhost:54321/rest/v1/profiles", () => HttpResponse.json([profile])),
    );
    const { result } = renderHook(() => useProfiles(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([profile]);
  });
});
