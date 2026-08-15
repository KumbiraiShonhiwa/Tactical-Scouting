import { useEffect, useState } from "react";
import { Skeleton } from "../atoms/Skeleton";
import { ErrorState } from "../atoms/ErrorState";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { ALL_DIMENSIONS, type TacticalDimension } from "../../lib/types";
import { TACTICAL_DIMENSIONS } from "../molecules/RadarChart";

const DIMENSION_LABELS: Record<TacticalDimension, string> = Object.fromEntries(
  TACTICAL_DIMENSIONS.map((d) => [d.key, d.label]),
) as Record<TacticalDimension, string>;

function weightsEqual(
  a: Record<TacticalDimension, number>,
  b: Record<TacticalDimension, number>,
): boolean {
  return ALL_DIMENSIONS.every((d) => Math.abs((a[d] ?? 0) - (b[d] ?? 0)) < 1e-9);
}

export function ProfileWeightEditor({
  initialWeightings,
  status = "success",
  onRetry,
  onSave,
  saving = false,
  saveError,
}: {
  initialWeightings?: Record<TacticalDimension, number>;
  status?: "loading" | "error" | "success";
  onRetry?: () => void;
  onSave: (weightings: Record<TacticalDimension, number>) => void;
  saving?: boolean;
  saveError?: string;
}) {
  const [draft, setDraft] = useState<Record<TacticalDimension, number> | null>(
    initialWeightings ?? null,
  );
  const [confirming, setConfirming] = useState(false);

  // Real bug caught by e2e/tests/e2e-05-update-tactical-profile.spec.ts: initialWeightings
  // arrives asynchronously (a PostgREST fetch), so on first mount it's almost always still
  // undefined — the useState initializer above only runs once, so draft stayed null forever
  // once the fetch actually completed, permanently stuck on the loading skeleton. This only
  // ever worked in Vitest unit tests because those pass initialWeightings synchronously from
  // the very first render, which masked the async case entirely. The `draft === null` guard
  // means this only fires for the initial load, never overwriting an in-progress edit.
  useEffect(() => {
    if (initialWeightings && draft === null) {
      setDraft(initialWeightings);
    }
    // `draft` is intentionally excluded below so this doesn't re-fire (and stomp a user's
    // edit) every time draft itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWeightings]);

  if (status === "error") {
    return <ErrorState message="Tactical profile temporarily unavailable" onRetry={onRetry} />;
  }

  if (status === "loading" || !draft) {
    return <Skeleton className="h-64 w-full" />;
  }

  const total = ALL_DIMENSIONS.reduce((sum, d) => sum + (draft[d] ?? 0), 0);
  const sumIsValid = Math.abs(total - 1.0) < 1e-6;
  const hasChanged = initialWeightings ? !weightsEqual(draft, initialWeightings) : false;

  function updateWeight(dimension: TacticalDimension, value: number) {
    setDraft((current) => (current ? { ...current, [dimension]: value } : current));
    setConfirming(false);
  }

  return (
    <div>
      <div className="space-y-3">
        {ALL_DIMENSIONS.map((dimension) => (
          <div key={dimension}>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={`weight-${dimension}`}>{DIMENSION_LABELS[dimension]}</label>
              <span className="tabular-nums text-neutral-700">
                {((draft[dimension] ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id={`weight-${dimension}`}
              type="range"
              min={0}
              max={1}
              step={0.01}
              className="interactive-control w-full"
              value={draft[dimension] ?? 0}
              onChange={(e) => updateWeight(dimension, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm">
        Total weight:{" "}
        <span className="tabular-nums">{(total * 100).toFixed(0)}%</span>{" "}
        {sumIsValid ? (
          <Badge tone="success">Valid</Badge>
        ) : (
          <Badge tone="warning">Must sum to 100%</Badge>
        )}
      </p>

      {saveError && <p className="mt-2 text-sm text-warning-amber">{saveError}</p>}

      {!confirming ? (
        <Button
          className="mt-4"
          disabled={!hasChanged || !sumIsValid || saving}
          onClick={() => setConfirming(true)}
        >
          Save new version
        </Button>
      ) : (
        <div className="mt-4 rounded-md border border-warning-amber/30 bg-warning-amber/5 p-3">
          <p className="text-sm">
            This recomputes fit scores for every candidate player against this club — every
            public-facing ranking will change. Continue?
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              disabled={saving}
              onClick={() => {
                onSave(draft);
                setConfirming(false);
              }}
            >
              {saving ? "Saving…" : "Confirm and recompute"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
