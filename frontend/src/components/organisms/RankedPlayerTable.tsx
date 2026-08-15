import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "../atoms/Skeleton";
import { EmptyState } from "../atoms/EmptyState";
import { ErrorState } from "../atoms/ErrorState";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import type { Pagination, PlayerRecommendation } from "../../lib/types";

export function RankedPlayerTable({
  clubId,
  players,
  pagination,
  status = "success",
  onRetry,
  onClearFilters,
  onPageChange,
  onAddToComparison,
  comparisonIds = [],
}: {
  clubId: string;
  players: PlayerRecommendation[];
  pagination?: Pagination;
  status?: "loading" | "error" | "success";
  onRetry?: () => void;
  onClearFilters?: () => void;
  onPageChange?: (page: number) => void;
  onAddToComparison?: (playerId: string) => void;
  comparisonIds?: string[];
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState message="Player recommendations temporarily unavailable" onRetry={onRetry} />;
  }

  if (players.length === 0) {
    return (
      <EmptyState
        message="No players match these filters"
        actionLabel={onClearFilters ? "Clear filters" : undefined}
        onAction={onClearFilters}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Ranked tactical-fit and undervaluation recommendations</caption>
          <thead>
            <tr className="border-b border-neutral-100 text-xs uppercase text-neutral-700">
              <th scope="col" className="py-2 pr-4">
                Player
              </th>
              <th scope="col" className="py-2 pr-4">
                Fit score
              </th>
              {/* Extra columns hidden below md — tap-to-expand row reveals them instead (§6). */}
              <th scope="col" className="hidden py-2 pr-4 md:table-cell">
                Position
              </th>
              <th scope="col" className="hidden py-2 pr-4 md:table-cell">
                Age
              </th>
              <th scope="col" className="hidden py-2 pr-4 md:table-cell">
                Minutes
              </th>
              <th scope="col" className="hidden py-2 pr-4 md:table-cell">
                Valuation
              </th>
              <th scope="col" className="py-2 pr-4">
                Recommended
              </th>
              <th scope="col" className="py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const expanded = expandedRow === p.player_id;
              const inComparison = comparisonIds.includes(p.player_id);
              return (
                <Fragment key={p.player_id}>
                  <tr className="border-b border-neutral-100">
                    <td className="py-2 pr-4">
                      <Link
                        to={`/players/${p.player_id}?club_id=${clubId}`}
                        className="interactive-control text-accent-blue underline-offset-2 hover:underline"
                      >
                        {p.full_name}
                      </Link>
                      <button
                        type="button"
                        className="interactive-control ml-2 text-xs text-neutral-700 underline md:hidden"
                        aria-expanded={expanded}
                        onClick={() => setExpandedRow(expanded ? null : p.player_id)}
                      >
                        {expanded ? "Less" : "More"}
                      </button>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{p.fit_score.toFixed(2)}</td>
                    <td className="hidden py-2 pr-4 md:table-cell">{p.position}</td>
                    <td className="hidden py-2 pr-4 tabular-nums md:table-cell">{p.age ?? "—"}</td>
                    <td className="hidden py-2 pr-4 tabular-nums md:table-cell">{p.minutes_played}</td>
                    <td className="hidden py-2 pr-4 tabular-nums md:table-cell">
                      {p.current_valuation !== null
                        ? `${p.current_valuation.toLocaleString()} ${p.valuation_currency}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {p.recommended ? (
                        <Badge tone="success" icon="★">
                          Recommended
                        </Badge>
                      ) : (
                        <span className="text-xs text-neutral-700">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      {onAddToComparison && (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          disabled={inComparison}
                          aria-label={`Add ${p.full_name} to comparison`}
                          onClick={() => onAddToComparison(p.player_id)}
                        >
                          {inComparison ? "Added" : "Compare"}
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-neutral-100 bg-neutral-50 md:hidden">
                      <td colSpan={8} className="px-2 py-2 text-xs text-neutral-700">
                        <dl className="grid grid-cols-2 gap-1">
                          <dt className="font-medium">Position</dt>
                          <dd>{p.position}</dd>
                          <dt className="font-medium">Age</dt>
                          <dd>{p.age ?? "—"}</dd>
                          <dt className="font-medium">Minutes</dt>
                          <dd>{p.minutes_played}</dd>
                          <dt className="font-medium">Valuation</dt>
                          <dd>
                            {p.current_valuation !== null
                              ? `${p.current_valuation.toLocaleString()} ${p.valuation_currency}`
                              : "—"}
                          </dd>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total_pages > 1 && onPageChange && (
        <nav
          aria-label="Ranked player list pagination"
          className="mt-4 flex items-center justify-between text-sm"
        >
          <Button
            variant="secondary"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-neutral-700">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            variant="secondary"
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
