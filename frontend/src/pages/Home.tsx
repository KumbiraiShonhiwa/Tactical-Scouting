import { useClubs } from "../hooks/useClubs";
import { ClubProfileCard } from "../components/organisms/ClubProfileCard";
import { Skeleton } from "../components/atoms/Skeleton";
import { ErrorState } from "../components/atoms/ErrorState";
import { EmptyState } from "../components/atoms/EmptyState";

export function Home() {
  const { data: clubs, isPending, isError, refetch } = useClubs();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold text-primary-900">
        Six-Club Tactical Fit &amp; Undervaluation Dashboard
      </h1>

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isPending && !isError && clubs && clubs.length === 0 && (
        <EmptyState message="No clubs are configured yet." />
      )}

      {!isPending && !isError && clubs && clubs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <ClubProfileCard key={club.club_id} club={club} />
          ))}
        </div>
      )}
    </div>
  );
}
