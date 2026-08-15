import { usePipelineRuns } from "../../hooks/usePipelineRuns";
import { useTriggerPipeline } from "../../hooks/useAdminMutations";
import { useAuth } from "../../auth/useAuth";
import { PipelineRunLog } from "../../components/organisms/PipelineRunLog";

export function PipelineRuns() {
  const { session } = useAuth();
  const runsQuery = usePipelineRuns();
  const trigger = useTriggerPipeline(session?.access_token);

  return (
    <PipelineRunLog
      runs={runsQuery.data ?? []}
      status={runsQuery.isPending ? "loading" : runsQuery.isError ? "error" : "success"}
      onRetry={() => runsQuery.refetch()}
      onTrigger={() => trigger.mutate()}
      triggering={trigger.isPending}
      triggerError={trigger.isError ? trigger.error.message : undefined}
    />
  );
}
