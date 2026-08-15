import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { PipelineRuns } from "./PipelineRuns";
import { renderWithAuth, adminAuth } from "../../test/renderWithAuth";
import { server } from "../../test/mocks/server";

const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

vi.mock("../../lib/supabaseClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/supabaseClient")>();
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

const run = {
  run_id: "r1",
  started_at: "2026-01-01T00:00:00Z",
  completed_at: null,
  status: "success",
  records_processed: 200,
  error_log: null,
  triggered_by: "schedule",
};

describe("PipelineRuns (admin page)", () => {
  it("renders fetched runs and triggers a new run on request", async () => {
    server.use(
      http.get("http://localhost:54321/rest/v1/pipeline_run", () => HttpResponse.json([run])),
      http.post("http://localhost:8000/admin/pipeline/trigger", () =>
        HttpResponse.json({ run_id: "r2", status: "queued" }, { status: 202 }),
      ),
    );

    renderWithAuth(<PipelineRuns />, { auth: adminAuth });

    await waitFor(() => expect(screen.getByText("success")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Trigger run" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Trigger run" })).toBeEnabled());
  });
});
