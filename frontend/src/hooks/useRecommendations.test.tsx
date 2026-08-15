import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useRecommendations } from "./useRecommendations";
import { mockClub, mockRecommendation } from "../test/mocks/handlers";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useRecommendations", () => {
  it("is disabled (does not fetch) without a clubId", () => {
    const { result } = renderHook(() => useRecommendations(undefined, {}), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches recommendations for a club", async () => {
    const { result } = renderHook(() => useRecommendations(mockClub.club_id, {}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.players).toEqual([mockRecommendation]);
  });
});
