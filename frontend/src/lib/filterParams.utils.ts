import { POSITIONS, type Position, type RecommendationsFilters, type SortOption } from "./types";

const SORT_OPTIONS: SortOption[] = [
  "fit_score_desc",
  "fit_score_asc",
  "undervaluation_desc",
  "undervaluation_asc",
];

function parsePosition(value: string | null): Position | undefined {
  return value && (POSITIONS as readonly string[]).includes(value)
    ? (value as Position)
    : undefined;
}

function parseSort(value: string | null): SortOption | undefined {
  return value && SORT_OPTIONS.includes(value as SortOption) ? (value as SortOption) : undefined;
}

function parsePositiveInt(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Round-trips Club Detail's filter/sort state through the URL query string (Frontend Design
// Doc §5.2) so a filtered view is shareable/bookmarkable and survives a refresh.
export function filtersFromSearchParams(params: URLSearchParams): RecommendationsFilters {
  const filters: RecommendationsFilters = {};

  const position = parsePosition(params.get("position"));
  if (position) filters.position = position;

  const ageMin = parsePositiveInt(params.get("age_min"));
  if (ageMin !== undefined) filters.age_min = ageMin;

  const ageMax = parsePositiveInt(params.get("age_max"));
  if (ageMax !== undefined) filters.age_max = ageMax;

  const minMinutes = parsePositiveInt(params.get("min_minutes"));
  if (minMinutes !== undefined) filters.min_minutes = minMinutes;

  const sort = parseSort(params.get("sort"));
  if (sort) filters.sort = sort;

  if (params.get("recommended_only") === "true") filters.recommended_only = true;

  const page = parsePositiveInt(params.get("page"));
  if (page !== undefined && page >= 1) filters.page = page;

  return filters;
}

export function filtersToSearchParams(filters: RecommendationsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.position) params.set("position", filters.position);
  if (filters.age_min !== undefined) params.set("age_min", String(filters.age_min));
  if (filters.age_max !== undefined) params.set("age_max", String(filters.age_max));
  if (filters.min_minutes) params.set("min_minutes", String(filters.min_minutes));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.recommended_only) params.set("recommended_only", "true");
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}
