import { Link, useParams, useSearchParams } from "react-router-dom";
import { useClub } from "../hooks/useClubs";
import { useTacticalProfile } from "../hooks/useTacticalProfile";
import { useRecommendations } from "../hooks/useRecommendations";
import { useComparisonList } from "../hooks/useComparisonList";
import { RadarChart } from "../components/molecules/RadarChart";
import { FilterBar } from "../components/molecules/FilterBar";
import { ExportButton } from "../components/molecules/ExportButton";
import { FitValueScatter } from "../components/organisms/FitValueScatter";
import { RankedPlayerTable } from "../components/organisms/RankedPlayerTable";
import { Skeleton } from "../components/atoms/Skeleton";
import { ErrorState } from "../components/atoms/ErrorState";
import { seriesColor } from "../lib/radarChart.utils";
import { filtersFromSearchParams, filtersToSearchParams } from "../lib/filterParams.utils";
import type { RecommendationsFilters } from "../lib/types";

export function ClubDetail() {
  const { clubId } = useParams<{ clubId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: RecommendationsFilters = filtersFromSearchParams(searchParams);

  function updateFilters(next: RecommendationsFilters) {
    setSearchParams(filtersToSearchParams(next));
  }

  const clubQuery = useClub(clubId);
  const profileQuery = useTacticalProfile(clubId);
  const recommendationsQuery = useRecommendations(clubId, filters);
  const comparison = useComparisonList();

  if (!clubId) return <ErrorState message="No club specified." />;

  if (clubQuery.isPending) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (clubQuery.isError || !clubQuery.data) {
    return <ErrorState message="Club not found." onRetry={() => clubQuery.refetch()} />;
  }

  const club = clubQuery.data;
  const players = recommendationsQuery.data?.players ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-primary-900">{club.name}</h1>
      <p className="text-sm text-neutral-700">{club.league}</p>

      {/* Radar + filters side-by-side on desktop, stacked (filters collapsible) on mobile —
          Frontend Design Doc §4.1. */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-6">
          <RadarChart
            title={`${club.name} tactical profile`}
            status={profileQuery.isPending ? "loading" : profileQuery.isError ? "error" : "success"}
            onRetry={() => profileQuery.refetch()}
            series={
              profileQuery.data
                ? [
                    {
                      label: club.name,
                      color: seriesColor(0),
                      values: profileQuery.data.weightings,
                    },
                  ]
                : []
            }
          />
        </div>
        <div className="md:col-span-6">
          <FilterBar filters={filters} onChange={updateFilters} />
        </div>
      </div>

      <div className="mt-8">
        <FitValueScatter
          players={players}
          status={
            recommendationsQuery.isPending
              ? "loading"
              : recommendationsQuery.isError
                ? "error"
                : "success"
          }
          onRetry={() => recommendationsQuery.refetch()}
          onClearFilters={() => updateFilters({})}
        />
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary-900">Ranked candidates</h2>
          <div className="flex items-center gap-2">
            {comparison.playerIds.length > 0 && (
              <Link
                to={`/compare?players=${comparison.playerIds.join(",")}`}
                className="interactive-control text-sm text-accent-teal underline-offset-2 hover:underline"
              >
                Compare ({comparison.playerIds.length})
              </Link>
            )}
            <ExportButton players={players} clubName={club.name} />
          </div>
        </div>
        <RankedPlayerTable
          clubId={clubId}
          players={players}
          pagination={recommendationsQuery.data?.pagination}
          status={
            recommendationsQuery.isPending
              ? "loading"
              : recommendationsQuery.isError
                ? "error"
                : "success"
          }
          onRetry={() => recommendationsQuery.refetch()}
          onClearFilters={() => updateFilters({})}
          onPageChange={(page) => updateFilters({ ...filters, page })}
          onAddToComparison={(playerId) => comparison.add(playerId)}
          comparisonIds={comparison.playerIds}
        />
      </div>
    </div>
  );
}
