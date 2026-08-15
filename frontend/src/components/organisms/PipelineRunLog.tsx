import { Skeleton } from "../atoms/Skeleton";
import { EmptyState } from "../atoms/EmptyState";
import { ErrorState } from "../atoms/ErrorState";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import type { PipelineRun, PipelineRunStatus } from "../../lib/types";

const STATUS_TONE: Record<PipelineRunStatus, "success" | "warning" | "info" | "neutral"> = {
  success: "success",
  failure: "warning",
  partial_failure: "warning",
  running: "info",
  queued: "neutral",
};

export function PipelineRunLog({
  runs,
  status = "success",
  onRetry,
  onTrigger,
  triggering = false,
  triggerError,
}: {
  runs: PipelineRun[];
  status?: "loading" | "error" | "success";
  onRetry?: () => void;
  onTrigger?: () => void;
  triggering?: boolean;
  triggerError?: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-primary-900">Pipeline runs</h3>
        {onTrigger && (
          <Button onClick={onTrigger} disabled={triggering}>
            {triggering ? "Triggering…" : "Trigger run"}
          </Button>
        )}
      </div>
      {triggerError && <p className="mb-2 text-sm text-warning-amber">{triggerError}</p>}

      {status === "loading" && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {status === "error" && (
        <ErrorState message="Pipeline run log temporarily unavailable" onRetry={onRetry} />
      )}

      {status === "success" && runs.length === 0 && (
        <EmptyState message="No pipeline runs recorded yet." />
      )}

      {status === "success" && runs.length > 0 && (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Recent ETL pipeline runs</caption>
          <thead>
            <tr className="border-b border-neutral-100 text-xs uppercase text-neutral-700">
              <th scope="col" className="py-2 pr-4">
                Started
              </th>
              <th scope="col" className="py-2 pr-4">
                Status
              </th>
              <th scope="col" className="py-2 pr-4">
                Records
              </th>
              <th scope="col" className="py-2">
                Triggered by
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.run_id} className="border-b border-neutral-100">
                <td className="py-2 pr-4 tabular-nums">
                  {new Date(run.started_at).toLocaleString()}
                </td>
                <td className="py-2 pr-4">
                  <Badge tone={STATUS_TONE[run.status]}>{run.status}</Badge>
                </td>
                <td className="py-2 pr-4 tabular-nums">{run.records_processed ?? "—"}</td>
                <td className="py-2">{run.triggered_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
