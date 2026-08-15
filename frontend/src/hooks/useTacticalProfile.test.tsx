import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useTacticalProfile } from "./useTacticalProfile";
import { mockClub, mockTacticalProfile } from "../test/mocks/handlers";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useTacticalProfile", () => {
  it("is disabled without a clubId", () => {
    const { result } = renderHook(() => useTacticalProfile(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches the club's current tactical profile", async () => {
    const { result } = renderHook(() => useTacticalProfile(mockClub.club_id), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTacticalProfile);
  });
});
