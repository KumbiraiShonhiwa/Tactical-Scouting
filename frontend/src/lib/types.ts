// Mirrors docs/api-spec.yaml / api/app/schemas.py exactly — a fixed contract, not re-derived.

export const POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "ST",
] as const;
export type Position = (typeof POSITIONS)[number];

export const SCORABLE_DIMENSIONS = [
  "possession_share",
  "ppda",
  "buildup_speed",
  "crossing_frequency",
  "pressing_intensity",
] as const;
export const ALL_DIMENSIONS = [...SCORABLE_DIMENSIONS, "defensive_line_height"] as const;
export type TacticalDimension = (typeof ALL_DIMENSIONS)[number];

export type SortOption =
  | "fit_score_desc"
  | "fit_score_asc"
  | "undervaluation_desc"
  | "undervaluation_asc";

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface PlayerRecommendation {
  player_id: string;
  full_name: string;
  position: string;
  age: number | null;
  minutes_played: number;
  fit_score: number;
  undervaluation_index: number;
  recommended: boolean;
  current_valuation: number | null;
  valuation_currency: string;
}

export interface RecommendationsResponse {
  club_id: string;
  profile_version: number;
  players: PlayerRecommendation[];
  pagination: Pagination;
}

export interface RecommendationsFilters {
  position?: Position;
  age_min?: number;
  age_max?: number;
  min_minutes?: number;
  sort?: SortOption;
  recommended_only?: boolean;
  page?: number;
  page_size?: number;
}

export interface ContributingMetric {
  metric: string;
  label: string;
  player_value: number | null;
  club_target_value: number;
  weight: number;
  contribution: number;
}

export interface FitBreakdownResponse {
  player_id: string;
  club_id: string;
  profile_version: number;
  overall_score: number;
  contributing_metrics: ContributingMetric[];
}

export interface WeightingsRequest {
  weightings: Record<TacticalDimension, number>;
}

export interface WeightingsResponse {
  club_id: string;
  profile_version: number;
  recompute_status: "enqueued" | "completed";
}

export interface PipelineTriggerResponse {
  run_id: string;
  status: string;
}

// public.club (supabase/migrations) — read directly via PostgREST.
export interface Club {
  club_id: string;
  name: string;
  league: string;
  crest_url: string | null;
}

// public.tactical_profile
export interface TacticalProfile {
  profile_id: string;
  club_id: string;
  version: number;
  weightings: Record<TacticalDimension, number>;
  effective_date: string;
  is_current: boolean;
}

// public.player
export interface Player {
  player_id: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  position: string;
  current_club: string | null;
}

// public.player_statistics
export interface PlayerStatistics {
  stat_id: string;
  player_id: string;
  season: string;
  minutes_played: number;
  appearances: number | null;
  possession_involvement_pct: number | null;
  passes_completed_per90: number | null;
  pass_completion_pct: number | null;
  progressive_passes_per90: number | null;
  progressive_carries_per90: number | null;
  defensive_actions_per90: number | null;
  pressures_per90: number | null;
  tackles_won_per90: number | null;
  interceptions_per90: number | null;
  crosses_per90: number | null;
  goals_per90: number | null;
  assists_per90: number | null;
  expected_goals_per90: number | null;
  expected_assists_per90: number | null;
  data_source: string;
  retrieved_at: string;
}

// public.market_valuation
export interface MarketValuation {
  valuation_id: string;
  player_id: string;
  valuation_amount: number;
  currency: string;
  valuation_date: string;
  data_source: string;
}

// public.pipeline_run
export type PipelineRunStatus =
  | "queued"
  | "running"
  | "success"
  | "partial_failure"
  | "failure";

export interface PipelineRun {
  run_id: string;
  started_at: string;
  completed_at: string | null;
  status: PipelineRunStatus;
  records_processed: number | null;
  error_log: string | null;
  triggered_by: "schedule" | "admin";
}

// public.profiles
export interface Profile {
  id: string;
  role: "admin" | "standard";
  created_at: string;
}
