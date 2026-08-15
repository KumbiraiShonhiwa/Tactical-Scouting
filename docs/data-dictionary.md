# Data Dictionary

Companion to ADD v1.0 §3.3 (which gives representative DDL for the highest-traffic tables
only). This is the complete field-by-field reference for every table created across all of
`supabase/migrations/` — the core tables from Phase 1, plus the Realtime publication, event
trigger, Storage bucket, and grant migrations added in Phases 4–5. Types are Postgres types;
all tables live in `public` unless noted, all use UUID primary keys (`gen_random_uuid()`), and
all carry `created_at`/`updated_at timestamptz not null default now()` with a trigger-maintained
`updated_at`, per ADD §3.2 — these two columns are omitted from the per-table field lists
below to avoid repetition.

> **Update (2026-08-15):** DC-01's data source changed from FBref to FootyStats.org — FBref's
> Cloudflare bot-challenge blocked automated access entirely (even `robots.txt` itself). See
> `docs/data-ethics-compliance.md` for the full evaluation of alternatives (Understat rejected —
> robots.txt disallows all crawling; StatsBomb Open Data rejected — no current-season Premier
> League coverage; API-Football deferred — new credential, no valuation data anyway).
> `player_statistics.data_source` now permits `'footystats'` alongside the original three values.
>
> **⚠ Flagged decision — confirm before Phase 2 (ETL):** the SRS's `PlayerStatistics` entity
> (§5.1) only says "per-90 statistical metrics" without enumerating columns. The list in
> `player_statistics` below is a concrete proposal I derived from TP-01's six named
> tactical-profile dimensions (possession share, PPDA/pressing, buildup speed, defensive line
> height, crossing frequency) plus standard scouting fields needed for PA-02 z-scoring. It is
> **not** a 1:1 metric mirror — `defensive_line_height` is inherently a team-level average, not
> a single player's stat, so the player-side proxy is `defensive_actions_per90` /
> `average_touch_distance_from_goal` rather than a column literally named the same as the
> club metric. Please confirm or amend this list before the ETL validators/normalizers in
> Phase 2 are built against it, since changing it later means a migration + re-scrape.

## `public.profiles`

Extends `auth.users` (Supabase-managed) rather than modifying it directly — the standard
Supabase pattern (ADD §3.1).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | no (PK) | FK → `auth.users(id)` on delete cascade |
| `role` | `text` | no | `check (role in ('admin','standard'))`, default `'standard'` |

## `public.club`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `club_id` | `uuid` | no (PK) | |
| `name` | `text` | no | unique |
| `league` | `text` | no | default `'Premier League'` |
| `crest_url` | `text` | yes | |

Six rows only for this release (SRS 2.5): Manchester United, Newcastle United, Aston Villa,
Tottenham Hotspur, Brighton & Hove Albion, Crystal Palace.

## `public.tactical_profile`

Versioned per TP-04 so historical fit scores stay reproducible after a profile edit (UC-5).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `profile_id` | `uuid` | no (PK) | |
| `club_id` | `uuid` | no | FK → `club(club_id)` on delete restrict |
| `version` | `int` | no | starts at 1, increments per club on each admin edit |
| `weightings` | `jsonb` | no | metric-name → weight map (TP-01's six dimensions); genuinely variable-shape per ADD §3.2 |
| `effective_date` | `date` | no | |
| `is_current` | `boolean` | no | default `true`; exactly one current row per `club_id`, enforced by a partial unique index |
| unique | | | `(club_id, version)` |

`weightings` keys used by the seed data and API: `possession_share`, `ppda`,
`buildup_speed`, `defensive_line_height`, `crossing_frequency`, `pressing_intensity`. Values
are non-negative and sum to 1.0 (enforced in the FastAPI Pydantic layer on write, not a DB
check — jsonb key sums aren't practically checkable in a Postgres `check` constraint).

## `public.player`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `player_id` | `uuid` | no (PK) | |
| `full_name` | `text` | no | |
| `date_of_birth` | `date` | yes | source sites don't always expose this |
| `nationality` | `text` | yes | |
| `position` | `text` | no | one of `GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST`; indexed (`player_position_idx`) |
| `current_club` | `text` | yes | free text, not a FK — a player's current club may be outside the six target clubs (opponent/comparison pool per SRS 1.2) |
| `source_ids` | `jsonb` | no | default `{}`; e.g. `{"fbref": "...", "transfermarkt": "...", "whoscored": "..."}`, used by the ETL de-dup/name-resolution step (DC-04); GIN-indexed (`player_source_ids_gin`) |

## `public.player_statistics`

One row per `(player_id, season, data_source)` — see flagged decision above.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `stat_id` | `uuid` | no (PK) | |
| `player_id` | `uuid` | no | FK → `player(player_id)` on delete cascade |
| `season` | `text` | no | e.g. `'2025/2026'` |
| `minutes_played` | `int` | no | `check (minutes_played >= 0)` |
| `appearances` | `int` | yes | `check (appearances >= 0)` |
| `possession_involvement_pct` | `numeric(5,2)` | yes | touches share proxy for club-level "possession share" |
| `passes_completed_per90` | `numeric(6,2)` | yes | |
| `pass_completion_pct` | `numeric(5,2)` | yes | |
| `progressive_passes_per90` | `numeric(6,2)` | yes | buildup-speed proxy |
| `progressive_carries_per90` | `numeric(6,2)` | yes | buildup-speed proxy |
| `defensive_actions_per90` | `numeric(6,2)` | yes | tackles + interceptions; PPDA/pressing proxy |
| `pressures_per90` | `numeric(6,2)` | yes | pressing-intensity proxy |
| `tackles_won_per90` | `numeric(6,2)` | yes | |
| `interceptions_per90` | `numeric(6,2)` | yes | |
| `crosses_per90` | `numeric(6,2)` | yes | crossing-frequency proxy |
| `goals_per90` | `numeric(6,2)` | yes | |
| `assists_per90` | `numeric(6,2)` | yes | |
| `expected_goals_per90` | `numeric(6,2)` | yes | xG |
| `expected_assists_per90` | `numeric(6,2)` | yes | xA |
| `data_source` | `text` | no | `'fbref'` \| `'footystats'` \| `'whoscored'` \| `'transfermarkt'` — attribution per SRS 3.2.6. `'footystats'` is the active DC-01 source (FootyStats.org replaced FBref after FBref's Cloudflare bot-challenge blocked automated access — see `docs/data-ethics-compliance.md`); `'fbref'` remains a permitted value in case a future release revisits it via a browser-based scraper. |
| `retrieved_at` | `timestamptz` | no | when the ETL run collected this row |
| unique | | | `(player_id, season, data_source)` |

All `*_per90` and `*_pct` columns are `numeric`, never `float`, consistent with ADD §3.2 (no
rounding drift feeding into fit-score comparisons). Values are range-checked at load time by
the ETL validator (DC-04, 5.3) — negative values are rejected before insert, not by a DB
`check` constraint, so the validator's rejection reason can be captured in
`private.quarantine`.

Index: `player_statistics_player_season_idx (player_id, season)`.

## `public.market_valuation`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `valuation_id` | `uuid` | no (PK) | |
| `player_id` | `uuid` | no | FK → `player(player_id)` on delete cascade |
| `valuation_amount` | `numeric(12,2)` | no | `check (valuation_amount >= 0)` |
| `currency` | `text` | no | default `'EUR'` (Transfermarkt's native currency) |
| `valuation_date` | `date` | no | |
| `data_source` | `text` | no | `'transfermarkt'` |
| unique | | | `(player_id, valuation_date, data_source)` |

Historical rows are retained, never overwritten (SRS 5.2), to support `ValuationTrendChart`
(UV-04, DV-05).

Index: `market_valuation_player_date_idx (player_id, valuation_date desc)`.

## `public.fit_score`

Per ADD §3.3 DDL extract, reproduced verbatim (this is the one table the ADD fully specifies):

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `fit_score_id` | `uuid` | no (PK) | |
| `player_id` | `uuid` | no | FK → `player(player_id)` on delete cascade |
| `club_id` | `uuid` | no | FK → `club(club_id)` on delete cascade |
| `profile_version` | `int` | no | denormalized copy of the `tactical_profile.version` used, so historical scores stay reproducible even if the profile is later superseded (TP-04) |
| `score` | `numeric(6,4)` | no | `check (score between 0 and 1)` |
| `contributing_metrics` | `jsonb` | no | default `{}`; per-metric contribution breakdown for PA-05 explainability |
| `computed_at` | `timestamptz` | no | default `now()` |

Indexes: `fit_score_club_score_idx (club_id, score desc)`,
`fit_score_latest_uq unique (player_id, club_id, profile_version)`.

## `public.undervaluation_index`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `index_id` | `uuid` | no (PK) | |
| `player_id` | `uuid` | no | FK → `player(player_id)` on delete cascade |
| `club_id` | `uuid` | no | FK → `club(club_id)` on delete cascade |
| `fit_score_id` | `uuid` | no | FK → `fit_score(fit_score_id)` on delete cascade — ties the index to the exact fit-score version it was derived from |
| `index_value` | `numeric(8,4)` | no | higher = more undervalued; exact combination formula is a Phase 3 (FastAPI) decision, out of scope for this schema doc |
| `recommended` | `boolean` | no | default `false`; set when `index_value` exceeds the configurable threshold (UV-03) |
| `computed_at` | `timestamptz` | no | default `now()` |

Index: `undervaluation_index_club_idx (club_id, index_value desc)`.

## `public.pipeline_run`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `run_id` | `uuid` | no (PK) | |
| `started_at` | `timestamptz` | no | |
| `completed_at` | `timestamptz` | yes | null while running |
| `status` | `text` | no | `check (status in ('queued','running','success','partial_failure','failure'))` |
| `records_processed` | `int` | yes | |
| `error_log` | `text` | yes | |
| `triggered_by` | `text` | no | `'schedule'` \| `'admin'` (DC-08) |

Retained ≥ 90 days per SRS 5.2 — no automatic deletion is implemented in Phase 1; a retention
job is a future-enhancement item, not a current requirement.

Index: `pipeline_run_started_at_idx (started_at desc)`.

**The only table in this schema without public read access.** Every other table above uses a
`*_public_read using (true)` policy; `pipeline_run`'s `pipeline_run_admin_read` policy instead
calls `public.is_admin()` (AD-03) — anon/non-admin `SELECT` returns 0 rows, not an error.

**Phase 4:** added to the `supabase_realtime` publication (`alter publication supabase_realtime
add table public.pipeline_run`) so the admin `PipelineRunLog` component can subscribe to live
status updates (Frontend Design Doc §4.3) — RLS is unaffected, so Realtime change events still
only reach admin subscribers.

**Phase 5, a real bug fix:** `service_role` needed an explicit `grant select, update on
public.pipeline_run to service_role` in addition to RLS. `rolbypassrls = true` does not imply
table-level privileges — those are two separate Postgres authorization layers. This table was
the first one in the project actually written to via PostgREST using the service_role key
(the `pipeline-webhook` Edge Function) rather than a direct `postgres`-role DB connection,
which is why the gap was latent until then. Worth remembering for any future service_role-via-
PostgREST code against a different table.

## `private.quarantine`

Non-exposed schema — excluded from PostgREST's `schemas` list in `supabase/config.toml`
(and the equivalent hosted-project setting), so it is unreachable via the auto-generated API
by construction, not convention (ADD §3.2, §8).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `quarantine_id` | `uuid` | no (PK) | |
| `source_table` | `text` | no | which public table the record was destined for |
| `raw_record` | `jsonb` | no | the rejected record as scraped, for later inspection/reprocessing |
| `reason` | `text` | no | why validation failed (5.3) |
| `data_source` | `text` | no | |
| `quarantined_at` | `timestamptz` | no | default `now()` |
| `pipeline_run_id` | `uuid` | yes | FK → `public.pipeline_run(run_id)` on delete set null |

RLS is enabled even though the schema isn't exposed (defense in depth per project
convention) — no policy grants `anon`/`authenticated` anything; only `service_role`
(which bypasses RLS entirely) reads or writes this table.

Index: `quarantine_pipeline_run_idx (pipeline_run_id)`.

## Storage (Phase 5)

**`exports` bucket** (`storage.buckets`, `public = false`) — private, per ADD §5.4: "Storage
holds only generated export artifacts in a private bucket; access is exclusively through
short-lived signed URLs issued by the `generate-export` Edge Function, never a public bucket."
No `anon`/`authenticated` policies exist on `storage.objects` for this bucket at all —
deliberately, same convention as `private.quarantine` — only the `generate-export` function's
service-role client (which bypasses RLS) ever writes or reads objects here; every other caller
gets access exclusively via the signed URL that function returns.

## Supporting objects

- **`public.is_admin()`** — `stable` SQL function, `returns boolean`, checks whether
  `auth.uid()` has a `public.profiles` row with `role = 'admin'`. Used by every admin-write
  RLS policy instead of inline `exists(...)` duplication (ADD §4.1.2).
- **`public.set_updated_at()`** — trigger function, sets `NEW.updated_at = now()`; attached
  as a `before update` trigger on every table above.
- **`public.latest_fit_score`** — view over `fit_score`, filtered to each player/club pair's
  current `profile_version` (per `tactical_profile.is_current`), so the frontend never has to
  filter historical versions client-side (ADD §3.5).
- **`public.handle_new_user()` + `on_auth_user_created` trigger** (Phase 1) — `security definer`
  function that auto-inserts a `public.profiles` row (default `role = 'standard'`) whenever a
  new `auth.users` row is created; fires `after insert on auth.users`. This is why every
  authenticated user always has exactly one `profiles` row — there's no separate signup-flow
  code path that creates it.
- **`public.notify_recompute_fit_scores()` + `recompute_fit_scores_on_profile_change` trigger**
  (Phase 5, ADD §5.3, UC-5) — `security definer` function that reads the Edge Function base URL
  and service-role key from Supabase Vault (`vault.decrypted_secrets`, not a hardcoded value or
  a GUC — see the migration's comment for why the GUC approach doesn't work here) and calls the
  `recompute-fit-scores` Edge Function via `pg_net`'s `net.http_post`. Fires `after insert on
  public.tactical_profile when (new.is_current)` — once per new *current* profile version, not
  on the accompanying `UPDATE` that flips the previous version's `is_current` to `false`. This
  is what makes `POST /admin/tactical-profiles/{club_id}/weightings` genuinely event-driven:
  that route only writes the new row and returns `recompute_status: "enqueued"`; this trigger
  is what actually kicks off scoring, asynchronously, off the request/response cycle.

## Foreign-key delete behavior (ADD §3.2)

- `ON DELETE RESTRICT`: `tactical_profile.club_id → club`, `player_statistics.player_id →
  player` is `CASCADE` (derived data), but a `club` cannot be deleted while it still has
  players' `fit_score`/`undervaluation_index` rows pointing at it indirectly — reference rows
  (`club`, `player`) are restricted from deletion while dependent rows exist.
- `ON DELETE CASCADE`: `fit_score`, `undervaluation_index`, `player_statistics`,
  `market_valuation` — all derived/dependent rows, so a player or club removal doesn't leave
  orphaned derived data.
