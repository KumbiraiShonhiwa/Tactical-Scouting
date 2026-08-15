import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useFitBreakdown } from "./useFitBreakdown";
import { mockClub, mockPlayer } from "../test/mocks/handlers";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useFitBreakdown", () => {
  it("is disabled without both a playerId and clubId", () => {
    const { result } = renderHook(() => useFitBreakdown(mockPlayer.player_id, undefined), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches the fit breakdown once both ids are present", async () => {
    const { result } = renderHook(
      () => useFitBreakdown(mockPlayer.player_id, mockClub.club_id),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.player_id).toBe(mockPlayer.player_id);
  });
});
