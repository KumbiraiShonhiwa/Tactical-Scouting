import type { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-neutral-100 py-10 text-center text-sm text-neutral-700">
      <p>{message}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
