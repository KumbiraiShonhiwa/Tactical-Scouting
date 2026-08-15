import type { RecommendationsFilters } from "./types";

// Centralized TanStack Query key factory (Frontend Design Doc §5.2) so invalidation after a
// mutation (e.g. saving new weightings) targets exactly the right cached queries.
export const queryKeys = {
  clubs: () => ["clubs"] as const,
  club: (clubId: string) => ["clubs", clubId] as const,
  tacticalProfile: (clubId: string) => ["tactical-profile", clubId] as const,
  recommendations: (clubId: string, filters: RecommendationsFilters) =>
    ["recommendations", clubId, filters] as const,
  fitBreakdown: (playerId: string, clubId: string) =>
    ["fit-breakdown", playerId, clubId] as const,
  player: (playerId: string) => ["player", playerId] as const,
  playerStatistics: (playerId: string) => ["player-statistics", playerId] as const,
  marketValuations: (playerId: string) => ["market-valuations", playerId] as const,
  pipelineRuns: () => ["pipeline-runs"] as const,
  profiles: () => ["profiles"] as const,
};
