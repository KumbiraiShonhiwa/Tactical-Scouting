import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { usePlayer, usePlayerStatistics, useMarketValuations } from "./usePlayer";
import { mockPlayer } from "../test/mocks/handlers";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("usePlayer", () => {
  it("is disabled without a playerId", () => {
    const { result } = renderHook(() => usePlayer(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches a player by id", async () => {
    const { result } = renderHook(() => usePlayer(mockPlayer.player_id), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlayer);
  });
});

describe("usePlayerStatistics", () => {
  it("fetches statistics rows for a player", async () => {
    const { result } = renderHook(() => usePlayerStatistics(mockPlayer.player_id), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useMarketValuations", () => {
  it("fetches valuation history for a player", async () => {
    const { result } = renderHook(() => useMarketValuations(mockPlayer.player_id), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
