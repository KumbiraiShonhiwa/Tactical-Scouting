import { Button } from "./Button";

export function ErrorState({
  message = "Statistics temporarily unavailable",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-warning-amber/30 bg-warning-amber/5 py-10 text-center text-sm text-neutral-900"
    >
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
