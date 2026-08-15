import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { useSaveWeightings, useTriggerPipeline } from "./useAdminMutations";
import { server } from "../test/mocks/server";
import { mockClub } from "../test/mocks/handlers";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const weightings = {
  possession_share: 0.2,
  ppda: 0.2,
  buildup_speed: 0.15,
  defensive_line_height: 0.15,
  crossing_frequency: 0.15,
  pressing_intensity: 0.15,
};

describe("useSaveWeightings", () => {
  it("throws without an access token rather than calling the API", async () => {
    const { result } = renderHook(() => useSaveWeightings(mockClub.club_id, undefined), {
      wrapper,
    });
    result.current.mutate(weightings);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not authenticated");
  });

  it("saves weightings when an access token is present", async () => {
    server.use(
      http.post(
        "http://localhost:8000/admin/tactical-profiles/:clubId/weightings",
        () =>
          HttpResponse.json(
            { club_id: mockClub.club_id, profile_version: 2, recompute_status: "completed" },
            { status: 201 },
          ),
      ),
    );
    const { result } = renderHook(() => useSaveWeightings(mockClub.club_id, "token"), {
      wrapper,
    });
    result.current.mutate(weightings);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.recompute_status).toBe("completed");
  });
});

describe("useTriggerPipeline", () => {
  it("throws without an access token rather than calling the API", async () => {
    const { result } = renderHook(() => useTriggerPipeline(undefined), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not authenticated");
  });

  it("triggers the pipeline when an access token is present", async () => {
    server.use(
      http.post("http://localhost:8000/admin/pipeline/trigger", () =>
        HttpResponse.json({ run_id: "r1", status: "queued" }, { status: 202 }),
      ),
    );
    const { result } = renderHook(() => useTriggerPipeline("token"), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("queued");
  });
});
