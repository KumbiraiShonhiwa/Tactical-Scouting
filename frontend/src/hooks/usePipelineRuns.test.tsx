import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { usePipelineRuns } from "./usePipelineRuns";
import { server } from "../test/mocks/server";

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("../lib/supabaseClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/supabaseClient")>();
  // Proxy (not a shallow spread) so every other method keeps its original `this` binding —
  // only `channel`/`removeChannel` are overridden to avoid opening a real Realtime socket.
  return {
    supabase: new Proxy(actual.supabase, {
      get(target, prop) {
        if (prop === "channel") return () => mockChannel;
        if (prop === "removeChannel") return () => {};
        return Reflect.get(target, prop, target);
      },
    }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const run = {
  run_id: "r1",
  started_at: "2026-01-01T00:00:00Z",
  completed_at: null,
  status: "running",
  records_processed: null,
  error_log: null,
  triggered_by: "schedule",
};

describe("usePipelineRuns", () => {
  it("fetches recent pipeline runs and subscribes to Realtime changes", async () => {
    server.use(
      http.get("http://localhost:54321/rest/v1/pipeline_run", () => HttpResponse.json([run])),
    );
    const { result } = renderHook(() => usePipelineRuns(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([run]);
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ table: "pipeline_run" }),
      expect.any(Function),
    );
  });
});
