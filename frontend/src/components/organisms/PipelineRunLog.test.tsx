import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PipelineRunLog } from "./PipelineRunLog";

const run = {
  run_id: "r1",
  started_at: "2026-01-01T00:00:00Z",
  completed_at: "2026-01-01T00:10:00Z",
  status: "success" as const,
  records_processed: 500,
  error_log: null,
  triggered_by: "admin" as const,
};

describe("PipelineRunLog", () => {
  it("renders skeletons while loading", () => {
    render(<PipelineRunLog runs={[]} status="loading" />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("renders an error alert with retry", async () => {
    const onRetry = vi.fn();
    render(<PipelineRunLog runs={[]} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when there are no runs", () => {
    render(<PipelineRunLog runs={[]} status="success" />);
    expect(screen.getByText("No pipeline runs recorded yet.")).toBeInTheDocument();
  });

  it("renders a run row with its status badge", () => {
    render(<PipelineRunLog runs={[run]} status="success" />);
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("calls onTrigger when the Trigger run button is clicked", async () => {
    const onTrigger = vi.fn();
    render(<PipelineRunLog runs={[]} status="success" onTrigger={onTrigger} />);
    await userEvent.click(screen.getByRole("button", { name: "Trigger run" }));
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("shows the trigger error message when present", () => {
    render(<PipelineRunLog runs={[]} status="success" triggerError="Rate limit exceeded" />);
    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
  });
});
