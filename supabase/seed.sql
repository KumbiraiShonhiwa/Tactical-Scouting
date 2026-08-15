-- Golden dataset: six real clubs with one tactical_profile version each, plus a small
-- synthetic (clearly-fake stats) player pool with statistics, valuations, fit scores and
-- undervaluation indices. Applied by `supabase db reset` (local/CI) and manually to staging
-- (never automatically to production) per ADD 3.4 and CLAUDE.md 11.
--
-- Fixed UUIDs are used throughout (rather than gen_random_uuid()) so pgTAP tests under
-- supabase/tests/ and later E2E fixtures can reference known rows deterministically.

-- ---------------------------------------------------------------------------
-- Clubs
-- ---------------------------------------------------------------------------
insert into public.club (club_id, name, league) values
  ('c1111111-1111-1111-1111-111111111111', 'Manchester United', 'Premier League'),
  ('c2222222-2222-2222-2222-222222222222', 'Newcastle United', 'Premier League'),
  ('c3333333-3333-3333-3333-333333333333', 'Aston Villa', 'Premier League'),
  ('c4444444-4444-4444-4444-444444444444', 'Tottenham Hotspur', 'Premier League'),
  ('c5555555-5555-5555-5555-555555555555', 'Brighton & Hove Albion', 'Premier League'),
  ('c6666666-6666-6666-6666-666666666666', 'Crystal Palace', 'Premier League');

-- ---------------------------------------------------------------------------
-- Tactical profiles (version 1, current) — weightings sum to 1.0 per club.
-- ---------------------------------------------------------------------------
insert into public.tactical_profile (profile_id, club_id, version, weightings, is_current) values
  ('a1111111-0001-0001-0001-000000000001', 'c1111111-1111-1111-1111-111111111111', 1,
    '{"possession_share":0.20,"ppda":0.15,"buildup_speed":0.20,"defensive_line_height":0.15,"crossing_frequency":0.10,"pressing_intensity":0.20}', true),
  ('a2222222-0001-0001-0001-000000000001', 'c2222222-2222-2222-2222-222222222222', 1,
    '{"possession_share":0.10,"ppda":0.25,"buildup_speed":0.15,"defensive_line_height":0.10,"crossing_frequency":0.10,"pressing_intensity":0.30}', true),
  ('a3333333-0001-0001-0001-000000000001', 'c3333333-3333-3333-3333-333333333333', 1,
    '{"possession_share":0.15,"ppda":0.20,"buildup_speed":0.15,"defensive_line_height":0.15,"crossing_frequency":0.15,"pressing_intensity":0.20}', true),
  ('a4444444-0001-0001-0001-000000000001', 'c4444444-4444-4444-4444-444444444444', 1,
    '{"possession_share":0.25,"ppda":0.15,"buildup_speed":0.20,"defensive_line_height":0.20,"crossing_frequency":0.10,"pressing_intensity":0.10}', true),
  ('a5555555-0001-0001-0001-000000000001', 'c5555555-5555-5555-5555-555555555555', 1,
    '{"possession_share":0.25,"ppda":0.15,"buildup_speed":0.25,"defensive_line_height":0.15,"crossing_frequency":0.10,"pressing_intensity":0.10}', true),
  ('a6666666-0001-0001-0001-000000000001', 'c6666666-6666-6666-6666-666666666666', 1,
    '{"possession_share":0.10,"ppda":0.15,"buildup_speed":0.15,"defensive_line_height":0.10,"crossing_frequency":0.20,"pressing_intensity":0.30}', true);

-- ---------------------------------------------------------------------------
-- Players — two per club, clearly synthetic names/stats.
-- ---------------------------------------------------------------------------
insert into public.player (player_id, full_name, date_of_birth, nationality, position, current_club, source_ids) values
  ('b1111111-0001-0001-0001-000000000001', 'Golden Test Forward One',  '2000-01-15', 'England', 'ST',  'Manchester United',
    '{"fbref":"fbref-test-001","transfermarkt":"tm-test-001"}'),
  ('b1111111-0002-0002-0002-000000000002', 'Golden Test Midfielder Two', '1999-06-20', 'France', 'CM', 'Manchester United',
    '{"fbref":"fbref-test-002","transfermarkt":"tm-test-002"}'),
  ('b2222222-0001-0001-0001-000000000001', 'Golden Test Winger Three', '2001-03-02', 'Brazil', 'RW', 'Newcastle United',
    '{"fbref":"fbref-test-003","transfermarkt":"tm-test-003"}'),
  ('b2222222-0002-0002-0002-000000000002', 'Golden Test Defender Four', '1998-11-09', 'Netherlands', 'CB', 'Newcastle United',
    '{"fbref":"fbref-test-004","transfermarkt":"tm-test-004"}'),
  ('b3333333-0001-0001-0001-000000000001', 'Golden Test Forward Five', '2002-07-30', 'Nigeria', 'ST', 'Aston Villa',
    '{"fbref":"fbref-test-005","transfermarkt":"tm-test-005"}'),
  ('b3333333-0002-0002-0002-000000000002', 'Golden Test Midfielder Six', '2000-02-14', 'Spain', 'CAM', 'Aston Villa',
    '{"fbref":"fbref-test-006","transfermarkt":"tm-test-006"}'),
  ('b4444444-0001-0001-0001-000000000001', 'Golden Test Winger Seven', '2001-09-05', 'Portugal', 'LW', 'Tottenham Hotspur',
    '{"fbref":"fbref-test-007","transfermarkt":"tm-test-007"}'),
  ('b4444444-0002-0002-0002-000000000002', 'Golden Test Defender Eight', '1997-12-22', 'Argentina', 'RB', 'Tottenham Hotspur',
    '{"fbref":"fbref-test-008","transfermarkt":"tm-test-008"}'),
  ('b5555555-0001-0001-0001-000000000001', 'Golden Test Midfielder Nine', '2003-04-18', 'Belgium', 'CDM', 'Brighton & Hove Albion',
    '{"fbref":"fbref-test-009","transfermarkt":"tm-test-009"}'),
  ('b5555555-0002-0002-0002-000000000002', 'Golden Test Forward Ten', '2000-10-11', 'Ecuador', 'ST', 'Brighton & Hove Albion',
    '{"fbref":"fbref-test-010","transfermarkt":"tm-test-010"}'),
  ('b6666666-0001-0001-0001-000000000001', 'Golden Test Defender Eleven', '1999-05-27', 'Ivory Coast', 'CB', 'Crystal Palace',
    '{"fbref":"fbref-test-011","transfermarkt":"tm-test-011"}'),
  ('b6666666-0002-0002-0002-000000000002', 'Golden Test Winger Twelve', '2002-08-08', 'Wales', 'LM', 'Crystal Palace',
    '{"fbref":"fbref-test-012","transfermarkt":"tm-test-012"}');

-- ---------------------------------------------------------------------------
-- Player statistics — one row per player (season 2025/2026, source fbref).
-- ---------------------------------------------------------------------------
insert into public.player_statistics (
  player_id, season, minutes_played, appearances, possession_involvement_pct,
  passes_completed_per90, pass_completion_pct, progressive_passes_per90,
  progressive_carries_per90, defensive_actions_per90, pressures_per90,
  tackles_won_per90, interceptions_per90, crosses_per90, goals_per90, assists_per90,
  expected_goals_per90, expected_assists_per90, data_source, retrieved_at
) values
  ('b1111111-0001-0001-0001-000000000001', '2025/2026', 1980, 22, 35.5, 18.2, 78.4, 4.1, 3.2, 1.5, 12.0, 0.8, 0.5, 1.2, 0.62, 0.21, 0.55, 0.18, 'fbref', now()),
  ('b1111111-0002-0002-0002-000000000002', '2025/2026', 2100, 24, 62.0, 55.3, 89.1, 6.8, 4.5, 4.2, 18.5, 2.1, 1.8, 0.4, 0.10, 0.30, 0.09, 0.25, 'fbref', now()),
  ('b2222222-0001-0001-0001-000000000001', '2025/2026', 1750, 20, 40.2, 22.7, 80.0, 3.9, 5.1, 1.2, 14.2, 0.6, 0.4, 3.8, 0.35, 0.28, 0.32, 0.26, 'fbref', now()),
  ('b2222222-0002-0002-0002-000000000002', '2025/2026', 2250, 25, 45.0, 48.9, 91.3, 2.1, 1.0, 6.5, 9.8, 3.4, 2.9, 0.1, 0.02, 0.03, 0.03, 0.02, 'fbref', now()),
  ('b3333333-0001-0001-0001-000000000001', '2025/2026', 1600, 19, 30.1, 15.0, 75.2, 2.8, 2.9, 0.9, 8.4, 0.4, 0.3, 0.9, 0.58, 0.15, 0.49, 0.14, 'fbref', now()),
  ('b3333333-0002-0002-0002-000000000002', '2025/2026', 1900, 21, 55.4, 42.1, 85.6, 5.9, 4.8, 2.0, 15.1, 1.1, 0.9, 1.8, 0.30, 0.35, 0.27, 0.31, 'fbref', now()),
  ('b4444444-0001-0001-0001-000000000001', '2025/2026', 2000, 23, 48.3, 30.5, 82.7, 4.5, 6.2, 1.4, 11.9, 0.7, 0.6, 4.5, 0.40, 0.32, 0.36, 0.29, 'fbref', now()),
  ('b4444444-0002-0002-0002-000000000002', '2025/2026', 2200, 24, 42.0, 47.8, 88.0, 2.9, 2.1, 5.8, 10.5, 3.0, 2.4, 5.1, 0.03, 0.18, 0.04, 0.15, 'fbref', now()),
  ('b5555555-0001-0001-0001-000000000001', '2025/2026', 2050, 23, 58.9, 58.2, 90.4, 5.2, 3.0, 7.1, 20.3, 3.8, 3.1, 0.2, 0.02, 0.08, 0.03, 0.07, 'fbref', now()),
  ('b5555555-0002-0002-0002-000000000002', '2025/2026', 1500, 18, 28.7, 13.4, 74.0, 2.2, 3.5, 1.0, 9.0, 0.5, 0.3, 1.0, 0.55, 0.12, 0.51, 0.11, 'fbref', now()),
  ('b6666666-0001-0001-0001-000000000001', '2025/2026', 2300, 25, 38.5, 45.0, 87.5, 1.8, 0.9, 6.0, 8.9, 2.9, 2.6, 0.1, 0.01, 0.02, 0.02, 0.02, 'fbref', now()),
  ('b6666666-0002-0002-0002-000000000002', '2025/2026', 1700, 20, 41.0, 20.3, 79.1, 3.5, 4.9, 1.3, 13.4, 0.6, 0.5, 4.9, 0.25, 0.33, 0.23, 0.30, 'fbref', now());

-- ---------------------------------------------------------------------------
-- Market valuations — one current row per player.
-- ---------------------------------------------------------------------------
insert into public.market_valuation (player_id, valuation_amount, currency, valuation_date, data_source) values
  ('b1111111-0001-0001-0001-000000000001', 45000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b1111111-0002-0002-0002-000000000002', 32000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b2222222-0001-0001-0001-000000000001', 28000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b2222222-0002-0002-0002-000000000002', 22000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b3333333-0001-0001-0001-000000000001', 18000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b3333333-0002-0002-0002-000000000002', 24000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b4444444-0001-0001-0001-000000000001', 35000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b4444444-0002-0002-0002-000000000002', 20000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b5555555-0001-0001-0001-000000000001', 15000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b5555555-0002-0002-0002-000000000002', 12000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b6666666-0001-0001-0001-000000000001', 16000000, 'EUR', '2026-07-01', 'transfermarkt'),
  ('b6666666-0002-0002-0002-000000000002', 9000000,  'EUR', '2026-07-01', 'transfermarkt');

-- ---------------------------------------------------------------------------
-- Fit scores — each player scored against their own club's current profile (version 1).
-- Deliberately synthetic scores (not computed by the real Phase 3 scoring model), but
-- contributing_metrics uses the REAL shape api/app/schemas.py's ContributingMetric expects
-- (list of {metric, label, player_value, club_target_value, weight, contribution}, one entry
-- per scorable dimension, contributions summing to score) — updated in Phase 3 after the
-- scoring engine's actual output format was finalized; the original Phase 1 placeholder
-- shape (a bare {metric: weight} dict) didn't match and broke GET /players/{id}/fit-breakdown
-- when it read stored rows instead of computing live.
-- ---------------------------------------------------------------------------
insert into public.fit_score (fit_score_id, player_id, club_id, profile_version, score, contributing_metrics) values
  ('d1111111-0001-0001-0001-000000000001', 'b1111111-0001-0001-0001-000000000001', 'c1111111-1111-1111-1111-111111111111', 1, 0.8421, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1684}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1684}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1684}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1684}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1685}]'),
  ('d1111111-0002-0002-0002-000000000002', 'b1111111-0002-0002-0002-000000000002', 'c1111111-1111-1111-1111-111111111111', 1, 0.7715, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1543}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1543}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1543}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1543}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1543}]'),
  ('d2222222-0001-0001-0001-000000000001', 'b2222222-0001-0001-0001-000000000001', 'c2222222-2222-2222-2222-222222222222', 1, 0.6902, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.138}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.138}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.138}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.138}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1382}]'),
  ('d2222222-0002-0002-0002-000000000002', 'b2222222-0002-0002-0002-000000000002', 'c2222222-2222-2222-2222-222222222222', 1, 0.8033, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1607}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1607}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1607}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1607}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1605}]'),
  ('d3333333-0001-0001-0001-000000000001', 'b3333333-0001-0001-0001-000000000001', 'c3333333-3333-3333-3333-333333333333', 1, 0.6501, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.13}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.13}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.13}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.13}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1301}]'),
  ('d3333333-0002-0002-0002-000000000002', 'b3333333-0002-0002-0002-000000000002', 'c3333333-3333-3333-3333-333333333333', 1, 0.8890, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1778}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1778}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1778}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1778}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1778}]'),
  ('d4444444-0001-0001-0001-000000000001', 'b4444444-0001-0001-0001-000000000001', 'c4444444-4444-4444-4444-444444444444', 1, 0.7256, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1451}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1451}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1451}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1451}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1452}]'),
  ('d4444444-0002-0002-0002-000000000002', 'b4444444-0002-0002-0002-000000000002', 'c4444444-4444-4444-4444-444444444444', 1, 0.6120, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1224}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1224}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1224}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1224}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1224}]'),
  ('d5555555-0001-0001-0001-000000000001', 'b5555555-0001-0001-0001-000000000001', 'c5555555-5555-5555-5555-555555555555', 1, 0.9145, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1829}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1829}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1829}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1829}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1829}]'),
  ('d5555555-0002-0002-0002-000000000002', 'b5555555-0002-0002-0002-000000000002', 'c5555555-5555-5555-5555-555555555555', 1, 0.5987, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1197}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1197}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1197}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1197}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1199}]'),
  ('d6666666-0001-0001-0001-000000000001', 'b6666666-0001-0001-0001-000000000001', 'c6666666-6666-6666-6666-666666666666', 1, 0.7003, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1401}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1401}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1401}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1401}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1399}]'),
  ('d6666666-0002-0002-0002-000000000002', 'b6666666-0002-0002-0002-000000000002', 'c6666666-6666-6666-6666-666666666666', 1, 0.7788, '[{"metric": "possession_share", "label": "Possession involvement", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1558}, {"metric": "ppda", "label": "Pressing / defensive-actions intensity (PPDA proxy)", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1558}, {"metric": "buildup_speed", "label": "Buildup progression speed", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1558}, {"metric": "crossing_frequency", "label": "Crossing frequency", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1558}, {"metric": "pressing_intensity", "label": "Pressing intensity", "player_value": null, "club_target_value": 0.2, "weight": 0.2, "contribution": 0.1556}]');

-- ---------------------------------------------------------------------------
-- Undervaluation indices — synthetic, one per fit_score row. A handful flagged
-- "recommended" (UV-03) so E2E-02 has something to assert against once built.
-- ---------------------------------------------------------------------------
insert into public.undervaluation_index (player_id, club_id, fit_score_id, index_value, recommended) values
  ('b1111111-0001-0001-0001-000000000001', 'c1111111-1111-1111-1111-111111111111', 'd1111111-0001-0001-0001-000000000001', 1.8700, true),
  ('b1111111-0002-0002-0002-000000000002', 'c1111111-1111-1111-1111-111111111111', 'd1111111-0002-0002-0002-000000000002', 1.1200, false),
  ('b2222222-0001-0001-0001-000000000001', 'c2222222-2222-2222-2222-222222222222', 'd2222222-0001-0001-0001-000000000001', 0.9800, false),
  ('b2222222-0002-0002-0002-000000000002', 'c2222222-2222-2222-2222-222222222222', 'd2222222-0002-0002-0002-000000000002', 1.5400, true),
  ('b3333333-0001-0001-0001-000000000001', 'c3333333-3333-3333-3333-333333333333', 'd3333333-0001-0001-0001-000000000001', 1.9600, true),
  ('b3333333-0002-0002-0002-000000000002', 'c3333333-3333-3333-3333-333333333333', 'd3333333-0002-0002-0002-000000000002', 1.4000, false),
  ('b4444444-0001-0001-0001-000000000001', 'c4444444-4444-4444-4444-444444444444', 'd4444444-0001-0001-0001-000000000001', 1.0700, false),
  ('b4444444-0002-0002-0002-000000000002', 'c4444444-4444-4444-4444-444444444444', 'd4444444-0002-0002-0002-000000000002', 0.8600, false),
  ('b5555555-0001-0001-0001-000000000001', 'c5555555-5555-5555-5555-555555555555', 'd5555555-0001-0001-0001-000000000001', 2.1300, true),
  ('b5555555-0002-0002-0002-000000000002', 'c5555555-5555-5555-5555-555555555555', 'd5555555-0002-0002-0002-000000000002', 1.2100, false),
  ('b6666666-0001-0001-0001-000000000001', 'c6666666-6666-6666-6666-666666666666', 'd6666666-0001-0001-0001-000000000001', 1.3400, false),
  ('b6666666-0002-0002-0002-000000000002', 'c6666666-6666-6666-6666-666666666666', 'd6666666-0002-0002-0002-000000000002', 1.6900, true);
