import { http, HttpResponse } from "msw";

const SUPABASE_URL = "http://localhost:54321";
const API_BASE_URL = "http://localhost:8000";

export const mockClub = {
  club_id: "11111111-1111-1111-1111-111111111111",
  name: "Test United",
  league: "Premier League",
  crest_url: null,
};

export const mockTacticalProfile = {
  profile_id: "22222222-2222-2222-2222-222222222222",
  club_id: mockClub.club_id,
  version: 1,
  weightings: {
    possession_share: 0.2,
    ppda: 0.2,
    buildup_speed: 0.15,
    defensive_line_height: 0.15,
    crossing_frequency: 0.15,
    pressing_intensity: 0.15,
  },
  effective_date: "2026-01-01",
  is_current: true,
};

export const mockPlayer = {
  player_id: "33333333-3333-3333-3333-333333333333",
  full_name: "Test Player",
  date_of_birth: "2000-01-01",
  nationality: "England",
  position: "CM",
  current_club: "Test United",
};

export const mockRecommendation = {
  player_id: mockPlayer.player_id,
  full_name: mockPlayer.full_name,
  position: "CM",
  age: 26,
  minutes_played: 1800,
  fit_score: 0.82,
  undervaluation_index: 1.6,
  recommended: true,
  current_valuation: 25_000_000,
  valuation_currency: "EUR",
};

export const handlers = [
  // Mirrors real PostgREST behavior: a `single()` request (Accept:
  // application/vnd.pgrst.object+json, filtered by club_id) gets a bare object back; an
  // unfiltered list request gets an array.
  http.get(`${SUPABASE_URL}/rest/v1/club`, ({ request }) => {
    const url = new URL(request.url);
    return url.searchParams.has("club_id")
      ? HttpResponse.json(mockClub)
      : HttpResponse.json([mockClub]);
  }),
  http.get(`${SUPABASE_URL}/rest/v1/tactical_profile`, () =>
    HttpResponse.json(mockTacticalProfile),
  ),
  http.get(`${SUPABASE_URL}/rest/v1/player`, () => HttpResponse.json(mockPlayer)),
  http.get(`${SUPABASE_URL}/rest/v1/player_statistics`, () => HttpResponse.json([])),
  http.get(`${SUPABASE_URL}/rest/v1/market_valuation`, () => HttpResponse.json([])),
  http.get(`${SUPABASE_URL}/rest/v1/pipeline_run`, () => HttpResponse.json([])),
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/clubs/:clubId/recommendations`, () =>
    HttpResponse.json({
      club_id: mockClub.club_id,
      profile_version: 1,
      players: [mockRecommendation],
      pagination: { page: 1, page_size: 25, total_count: 1, total_pages: 1 },
    }),
  ),
  http.get(`${API_BASE_URL}/players/:playerId/fit-breakdown`, () =>
    HttpResponse.json({
      player_id: mockPlayer.player_id,
      club_id: mockClub.club_id,
      profile_version: 1,
      overall_score: 0.82,
      contributing_metrics: [],
    }),
  ),
];
