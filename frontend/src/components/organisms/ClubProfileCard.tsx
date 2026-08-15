import { Link } from "react-router-dom";
import { Skeleton } from "../atoms/Skeleton";
import { ErrorState } from "../atoms/ErrorState";
import type { Club } from "../../lib/types";

export function ClubProfileCard({
  club,
  status = "success",
  onRetry,
  summary,
}: {
  club?: Club;
  status?: "loading" | "error" | "success";
  onRetry?: () => void;
  summary?: string;
}) {
  if (status === "error") {
    return <ErrorState message="Club profile temporarily unavailable" onRetry={onRetry} />;
  }

  if (status === "loading" || !club) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Link
      to={`/clubs/${club.club_id}`}
      className="interactive-control block rounded-lg border border-neutral-100 bg-white p-4 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {club.crest_url ? (
          <img
            src={club.crest_url}
            alt={`${club.name} crest`}
            className="h-12 w-12 object-contain"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white"
          >
            {club.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-primary-900">{club.name}</h3>
          <p className="text-xs text-neutral-700">{club.league}</p>
        </div>
      </div>
      {summary && <p className="mt-3 text-sm text-neutral-700">{summary}</p>}
    </Link>
  );
}
