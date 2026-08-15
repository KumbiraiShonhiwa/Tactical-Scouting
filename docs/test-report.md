# Test Report

Results counterpart to `Tactical-Scouting_Automated-Testing-Documentation.docx` (strategy/plan
only). Populated incrementally as Phases 1–6 complete — this file is a stub scaffolded in
Phase 0 so results aren't forgotten or backfilled inaccurately later.

## Phase 1 — Schema & RLS

**Status: PASS.** Verified locally 2026-08-15 via `supabase db reset` (all 13 migrations +
`seed.sql` applied cleanly) followed by `supabase test db` (pgTAP, pg_prove).

```
Files=12, Tests=51, 1 wallclock secs
Result: PASS
```

All 12 RLS/schema test files passed — every RLS policy defined in the Phase 1 migrations has
at least one passing positive test (allowed role succeeds) and at least one passing negative
test (disallowed role/action rejected), per the Automated Testing Documentation §4.2 gate:

| Table | Policies covered | Positive | Negative |
|---|---|---|---|
| `club` | `club_public_read` | anon/authenticated SELECT | anon/authenticated INSERT rejected |
| `tactical_profile` | `_public_read`, `_admin_write`, `_admin_update` | anon/authenticated SELECT; admin INSERT/UPDATE | anon/non-admin INSERT rejected; non-admin UPDATE affects 0 rows |
| `player` | `player_public_read` | anon/authenticated SELECT | anon/authenticated INSERT rejected |
| `player_statistics` | `_public_read` | anon/authenticated SELECT | anon/authenticated INSERT rejected |
| `market_valuation` | `_public_read` | anon/authenticated SELECT | anon/authenticated INSERT rejected |
| `fit_score` | `fit_score_public_read` | anon/authenticated SELECT | anon/authenticated INSERT rejected |
| `undervaluation_index` | `_public_read` | anon/authenticated SELECT | anon/authenticated INSERT rejected |
| `pipeline_run` | `pipeline_run_admin_read` | admin SELECT | anon/non-admin SELECT returns 0 rows; non-admin INSERT rejected |
| `profiles` | `_own_select`, `_own_update`, `_admin_select_all` | own-row SELECT/UPDATE; admin SELECT all | cross-user SELECT returns 0 rows, UPDATE affects 0 rows; anon has no table access at all |
| `private.quarantine` | none (intentional) | service_role only (untested here — bypasses RLS by design) | anon/authenticated schema access denied entirely |

Also verified: `is_admin()` returns correct true/false/false for admin/standard/anonymous
callers; the `updated_at` trigger fires on row update; `fit_score.score`'s check constraint
exists.

**Spot-check against live PostgREST** (not just pgTAP): confirmed `GET /rest/v1/club` returns
all 6 seeded clubs with the anon key, `GET /rest/v1/quarantine` returns 404 (schema not
exposed), and an anon `POST /rest/v1/club` is rejected — confirming the SQL-level policy and
PostgREST's actual enforcement agree, per Automated Testing Documentation §4.2's note that
both layers should be checked for discrepancies.

## Phase 2 — ETL

**Status: PASS** (FootyStats + Transfermarkt scope; WhoScored deferred, see
`docs/data-ethics-compliance.md`). Verified locally 2026-08-15.

```
etl/tests/unit:        40 passed
etl/tests/integration:  7 passed (against real local Supabase, not mocked)
ruff check etl/:        clean
mypy --strict etl/:     clean (31 source files)
```

Coverage (`--cov=scrapers --cov=validators --cov=loader`): **81% overall** (meets the ≥80%
backend gate); `validators/` (scoring/validation-equivalent for ETL) at 98–100% (exceeds the
≥90% gate). Untested-by-design: `loader/db.py` (thin env-var wiring) and `run_pipeline.py`
(the live-sources entrypoint, deliberately excluded from automated tests per DC-07 — no live
scraping in tests).

Key findings from this phase:
- **Real fixtures, not fabricated ones**: both scrapers were built against actual captured
  HTML (`etl/tests/fixtures/footystats/`, `etl/tests/fixtures/transfermarkt/`), fetched once
  and manually reviewed per Testing Documentation §7.2, not hand-waved selectors.
- **A real DC-07 compliance bug was caught and fixed before it shipped**: Python's stdlib
  `urllib.robotparser` silently fails to enforce FootyStats' `/players?*` rule (a wildcard
  combined with a literal `?`), which would have under-enforced robots.txt if trusted
  blindly. Replaced with a small custom matcher (`scrapers/base.py`), regression-tested
  against all three sources' real recorded rules (`tests/unit/test_robots_checker.py`).
- **The 3.2.2 atomicity guarantee is proven, not assumed**: `test_partial_failure_leaves_previously_committed_data_intact`
  forces a real DB-level failure (a value that passes Pydantic validation but overflows a
  `numeric(5,2)` column) mid-run and confirms the whole run rolls back together, leaving
  previously committed data untouched — the actual mechanism CLAUDE.md §10 requires evidence
  for, not just a unit test of application logic.

## Phase 3 — Analysis (FastAPI)

**Status: PASS.** Verified locally 2026-08-15.

```
tests/unit:        44 passed
tests/integration:  17 passed (real local Supabase + real Supabase Auth test users)
ruff check api/:    clean
mypy --strict api/: clean (33 source files)
```

Coverage (`--cov=app`): **93% overall** (meets the ≥80% backend gate); `app/scoring/`
(fit_score.py, normalize.py, undervaluation.py) at **100%**, `app/schemas.py` at 100% —
comfortably exceeds the ≥90% scoring/validation gate.

Key findings from this phase:
- **Two real correctness bugs caught by writing against a real database, not mocks**:
  (1) psycopg2 returns `numeric` columns as `Decimal`, which `scipy.stats.norm.cdf` cannot
  operate on — z-scoring silently would have crashed on any real query. (2) `scipy`/`numpy`
  computations (`percentileofscore`, comparisons) hand back `np.float64`/`np.bool_` scalars
  that psycopg2 can't adapt for an INSERT. Both are now cast to native Python types at the
  repository boundary (`app/scoring/repository.py`), with a comment explaining why.
- **A real data/format mismatch was caught and fixed, not papered over**: the Phase 1 seed
  data's `fit_score.contributing_metrics` was seeded (Phase 1) as a placeholder `{metric:
  weight}` dict, before Phase 3's actual scoring-engine output format
  (list of `{metric, label, player_value, club_target_value, weight, contribution}`) existed.
  `GET /players/{id}/fit-breakdown`'s "read the stored row" path broke against the old shape —
  `supabase/seed.sql` was updated to the real shape rather than special-casing the route
  around stale seed data.
- **The JWT auth chain is proven against a real Supabase Auth server**, not just a locally
  signed test token: `tests/integration/test_admin.py` creates real users via the Auth admin
  API, signs in to get a real GoTrue-issued JWT, and confirms the app's JWKS verification
  (against the real local `/auth/v1/.well-known/jwks.json`) plus the `profiles.role='admin'`
  check both work end to end — 401 (no token), 403 (valid token, wrong role), and success are
  all exercised with real tokens, not hand-crafted ones, per Testing Documentation §4.1.
- **Manual smoke test**: `uvicorn` run locally against the seeded golden dataset — `GET
  /health`, `GET /clubs/{id}/recommendations` (real ranked list), `GET /players/{id}/
  fit-breakdown`, a 404 for an unknown club, and a 401 for an unauthenticated admin route all
  confirmed working against real HTTP requests, not just the test client.

## Phase 4 — Frontend

**Status: PASS.** Verified locally 2026-08-15.

```
frontend unit/component tests: 139 passed (Vitest + React Testing Library + MSW)
eslint frontend/:               clean (1 non-blocking react-refresh warning)
tsc -b --noEmit:                clean
npm run build:                  succeeds (vite production build)
```

Coverage (`vitest run --coverage`, v8 provider): **93% overall statements** (comfortably
exceeds the ≥70% component gate); `src/lib/` — every chart/data-transform utility module
(`csv.utils.ts`, `radarChart.utils.ts`, `scatterChart.utils.ts`, `filterParams.utils.ts`,
`apiClient.ts`, `types.ts`, `queryKeys.ts`, `supabaseClient.ts`) — at **100%**, meeting the
CLAUDE.md §10 chart/data-transform-utility gate exactly, not just the overall one. Every
cataloged component (§5.1 of the Frontend Design Doc) has tests covering its loading/populated/
empty/error states, not just a "renders without crashing" smoke test.

Key findings from this phase:
- **No live network in unit tests, by construction**: every component/hook test that touches
  PostgREST or the FastAPI service goes through MSW-intercepted `fetch`, mirroring the
  "recorded fixtures, never live" principle Phases 2–3 established for their own test tiers.
  `AuthContext`/`ProtectedRoute` are tested with a mocked Supabase Auth session (signed-out,
  signed-in standard, signed-in admin), and `PipelineRunLog`'s Realtime subscription is tested
  with a mocked `supabase.channel()` (via a `Proxy` around the real client, not a full mock, so
  every other method keeps correct `this` binding) rather than opening a real WebSocket.
- **Two real bugs caught by testing, not just eyeballing**: (1) `ClubProfileCard` and
  `ProfileWeightEditor` checked `status === "loading" || !data` *before* checking
  `status === "error"`, so an error response with no cached data rendered a permanent loading
  skeleton instead of the error state with retry — found by a test asserting the Retry button
  appears on `status="error"`, fixed by reordering the checks. (2) MSW's `HttpResponse.error()`
  (simulated network failure) left a `supabase-js` query stuck in `isPending` indefinitely in
  this Node/undici test environment rather than resolving to an error — worked around by
  asserting error states against a 500 JSON response instead, which is both more realistic
  (PostgREST returns structured errors, not raw network failures, for almost all real failure
  modes) and reliable.
- **Manual smoke test against real infrastructure** (not just MSW): `supabase start` +
  `supabase db reset` (including the new `pipeline_run` Realtime-publication migration)
  alongside the Phase 3 `uvicorn` service, both with real env vars (no `.env` auto-loading in `api/app` by
  design — confirmed by tracing why an unset `SUPABASE_JWKS_URL` 500'd, matching how
  `tests/integration/conftest.py` sets env vars programmatically rather than via a `.env`
  file). `GET /clubs/{id}/recommendations` and `GET /players/{id}/fit-breakdown` both returned
  real, correctly-shaped data from the golden seed dataset. `npm run build` and `npm run dev`
  both succeeded; every top-level page/route module was confirmed to transform without error
  via Vite's dev-server module endpoint. **No real browser was available in this execution
  environment**, so visual rendering, click-through user journeys, and console-error/axe
  warnings were not directly observed — that gap is exactly what Phase 6's Playwright E2E
  suite (UC-1..UC-5) and its axe-core pass are for, and should not be assumed covered by this
  phase's verification.

## Phase 5 — Edge Functions

**Status: PASS.** Verified locally 2026-08-15.

```
pgTAP:                  59/59 assertions (Files=13) — up from 51/51 in Phase 1
api/ pytest:            67/67 passed (60 unit + integration, up from 61), 93% coverage
etl/ pytest:            49/49 passed (up from 47), 81% coverage
frontend vitest:        145/145 passed (up from 139), 93.14% overall, 100% on src/lib/
ruff/mypy (api, etl):   clean
eslint/tsc (frontend):  clean (same 1 non-blocking warning as Phase 4)
```

Deno-native unit tests exist for each function's pure logic (`supabase/functions/*/
index.test.ts` — payload validation, CSV building) and run in CI via a new
`unit-tests-functions` job (`denoland/setup-deno`), but **could not be run locally**: this
execution environment has no `deno` binary installed. Local verification instead relied on the
real Deno runtime the Supabase CLI's `edge-runtime` Docker container provides — every function
was exercised with real HTTP calls against `supabase start`'s locally-served functions, which
is a stronger check than `deno test` would have been on its own (it proves the function
actually runs under the real runtime, not just that its logic is correct in isolation).

**All three Edge Functions verified end-to-end against real infrastructure, not mocks**:

1. **`recompute-fit-scores`**: called directly with a real payload → real `POST
   /internal/tactical-profiles/recompute` call → real `fit_score` rows written (`players_scored:
   12`). Then verified the **full trigger chain**, not just the function in isolation:
   simulated the admin route's exact `tactical_profile` write (UPDATE old row `is_current =
   false`, INSERT new current row) directly via psycopg2 — the `pg_net`-based Postgres trigger
   fired, called the Edge Function, which called FastAPI, which wrote 12 real `fit_score` rows
   for the new profile version, all **asynchronously** (confirmed present ~3 seconds after the
   INSERT, with no synchronous call in between) — proving the event-driven design actually
   works, not just that its pieces compile.
2. **`pipeline-webhook`**: created a real `pipeline_run` row, called the function with the
   shared secret, confirmed the row's `status`/`error_log`/`completed_at` were updated
   correctly via PostgREST.
3. **`generate-export`**: called the function for a real club, then **actually downloaded the
   resulting CSV via the returned signed URL** and confirmed its contents matched the real
   seeded recommendations data exactly.

**Four real bugs found during this manual verification** (none of it was assumption — every
one only surfaced by actually running the code against real infrastructure):

1. **`service_role` lacked table-level GRANTs on `public.pipeline_run`.** `rolbypassrls = true`
   (confirmed via `pg_roles`) does not imply SELECT/INSERT/UPDATE privileges — RLS bypass and
   GRANTs are separate Postgres authorization layers. Every earlier phase's server code
   connects directly as the `postgres` superuser-equivalent role via `SUPABASE_DB_URL`, which
   never exercises this path, so the gap was latent until `pipeline-webhook` became the first
   code in this project to touch a table via PostgREST with the service_role key. Fixed with a
   new migration (`grant select, update on public.pipeline_run to service_role`), covered by a
   new pgTAP assertion querying `information_schema.role_table_grants` directly (checking both
   authorization layers, not just RLS, per Testing Documentation §4.2's own guidance).
2. **The originally-planned GUC-based config (`alter database ... set app.*`) doesn't work at
   all.** `select rolsuper from pg_roles where rolname='postgres'` returns `false` — Supabase's
   own `postgres` role isn't a superuser, even locally, and can't set unrecognized custom GUC
   classes at the database level. Switched to Supabase Vault (`vault.create_secret` /
   `vault.decrypted_secrets`, the `supabase_vault` extension, already installed by the local
   stack) — the actual Supabase-documented mechanism for this "call an Edge Function from a
   trigger" pattern. This was caught immediately (the first real end-to-end attempt failed with
   `permission denied to set parameter`) rather than shipped as a runbook step nobody could
   follow.
3. **`generate-export`'s signed URL was wrong in two ways.** `SUPABASE_URL` inside an Edge
   Function resolves to the *internal* Docker-network address (`http://kong:8000` locally) —
   correct for the function's own server-to-server Storage calls, but not reachable from a
   browser; and the Storage API's `signedURL` response field is relative to `/storage/v1`, not
   the API root, so naively prepending `SUPABASE_URL` produced a URL missing that path segment
   entirely. Both were caught by actually calling the returned URL and getting a 404 rather
   than assuming a 200 response meant the feature worked. Fixed with a separate
   `PUBLIC_SUPABASE_URL` env var for the browser-facing value and the correct path prefix;
   re-verified by actually downloading the CSV afterward.
4. **The admin weightings route's `POST /admin/pipeline/trigger` orphaned-row bug** (found
   while planning this phase, before any code was written — see the Phase 5 plan) was fixed and
   verified via a new integration test proving `start_run(conn, "admin", run_id=<existing>)`
   updates the pre-existing row in place rather than creating a second one.

## Phase 6 — E2E, Non-functional, CI hardening

**Status: PASS.** Verified locally 2026-08-15.

```
e2e/ (Playwright, --project=chromium-smoke --project=mobile): 19 passed, 1 skipped (keyboard-
  only nav skipped on mobile — a hardware-keyboard concept, not touch)
k6 dashboard-load.js:      p95=12.06ms  (threshold p95<3000ms)   PASS
k6 fit-computation.js:     p95=97.04ms  (threshold p95<2000ms)   PASS
perf/pipeline_duration_check.py: projected 67.1 min six-club refresh (budget 120 min)  PASS
pgTAP:                  59/59 assertions (unchanged from Phase 5)
api/ pytest:            75/75 passed (67 + 8 new: rate-limit x6, CORS x2), 93% coverage
etl/ pytest:            49/49 passed (unchanged), 81% coverage
frontend vitest:        147/147 passed (145 + 2 new regression tests), 93.13% overall
ruff/mypy (api, etl):   clean
eslint/tsc (frontend):  clean (same 1 non-blocking warning as Phases 4-5)
```

Scope notes, per the approved Phase 6 plan: k6 targets the local ephemeral stack, not a staging
project (none exists — same substitution every earlier phase made for a real hosted
environment). Dependency scanning uses Dependabot (`.github/dependabot.yml`), the Testing
Documentation's own accepted alternative to a custom `pip-audit`/`npm audit` job. The §6.3
"schema-drift check" is satisfied by the existing Phase 2 fixture-based parser unit tests
(`test_footystats_parser.py`, `test_transfermarkt_parser.py`) rather than a new mechanism — they
already fail the moment a source site's real structure diverges from the captured fixture, which
is what the section describes.

**Five real bugs found and fixed, all previously shipped and undetected — none of them
catchable by any test tier before this phase's browser-based/CI-gate verification**:

1. **Rate limiting silently disabled since Phase 3.** `slowapi`'s route-introspection assumed a
   FastAPI internal routing shape that changed in FastAPI 0.141.1 (`app.routes` now holds
   `_IncludedRouter` objects with no `.path`/`.endpoint`), so `slowapi`'s exemption check always
   returned `True` and no request was ever actually limited — confirmed by direct inspection of
   `app.routes` and `slowapi`'s own source, not assumed from a failing test alone. Replaced
   entirely with `api/app/rate_limit.py`, a ~30-line in-house fixed-window limiter, reasoning
   that a dependency on a third party's internal-API assumptions about FastAPI's route tree is
   itself a latent-breakage risk. Covered by `api/tests/integration/test_rate_limit.py` (SEC-004)
   and `api/tests/unit/test_rate_limit.py`.
2. **CORS never configured, since Phase 3/4.** No `CORSMiddleware` existed at all — every
   `pytest`/`httpx` test tier calls the app in-process and never triggers CORS enforcement
   (browser-only), so this was invisible until Playwright's real Chromium hit a real preflight
   and got a 405. Confirmed via `curl -X OPTIONS ... -H "Origin: ..."` before (405) and after
   (200 with `access-control-allow-origin`) the fix. Fixed with `CORSMiddleware` +
   `CORS_ALLOWED_ORIGINS`; covered by `api/tests/integration/test_cors.py` (allowed origin
   passes preflight, an arbitrary origin does not).
3. **`AuthContext` async race, since Phase 4.** `onAuthStateChange`'s handler called
   `setSession()` before awaiting the role fetch, so a post-mount sign-in briefly exposed a
   stale/`null` role — invisible to Vitest's synchronous mocked-session tests, only surfaced by
   Playwright's real UI login racing a real redirect decision (`Login.tsx` sending an admin user
   to `/` instead of `/admin`). Fixed by awaiting the role fetch before the state updates that
   consume it; regression test added (`AuthContext.test.tsx`).
4. **`ProfileWeightEditor` stale-state bug, since Phase 4/5.** `useState(initialWeightings)`
   only evaluates its initializer at mount — when the component mounts before its data query
   resolves (the real, common ordering), the editor was stuck with `null` weights forever. Only
   surfaced by E2E-05 driving the real `loading` → `success` transition Vitest's per-test mocked
   props never exercised. Fixed with a `useEffect` syncing prop to state on first arrival;
   regression test added using `rerender()`.
5. **Missing `GenerateExportResponse` type — a real, pre-existing `tsc` failure.** Found not by
   any existing test (Vitest doesn't typecheck) but while deliberately verifying the lint/type
   CI gates actually fail on a real violation (CLAUDE.md §14's gate-verification step): reverting
   an injected type error left `tsc -b --noEmit` still failing, on `useGenerateExport.ts`'s
   import of a type that had never been added to `src/lib/types.ts` since Phase 5. Fixed by
   adding the missing `GenerateExportResponse` interface matching the Edge Function's actual
   response shape (`signed_url`, `expires_at`).

**A genuine Chromium/Playwright mobile hit-testing quirk was investigated exhaustively, not
papered over**: three mobile-viewport (Pixel 5, deviceScaleFactor 2.75) E2E specs reported a
chart canvas or an unrelated button "intercepting" a click for the full 30s retry window.
Verified via trace screencast frames, live `elementFromPoint` probes, and manual `boundingBox()`
geometry checks that the two elements never actually overlap on screen at any point a frame was
captured — ruled out real CSS/layout overlap, ResizeObserver thrashing (added a width-dedup
guard to `ResponsiveChartContainer` as defensive hardening regardless), and mouse-vs-touch event
semantics (`.tap()` reproduced identically). Consistent with a known class of Chromium hit-test
rounding quirks under fractional-DPR mobile emulation. Used `click({ force: true })` at the two
affected call sites, each with an in-code comment documenting the verification performed — a
deliberate, evidence-backed call, not a default reach-for-force. A separate, real race was found
and fixed in `e2e/helpers.ts::ensureFiltersExpanded` (a bare `isVisible()` check could run before
the toggle button had mounted at all).

## Coverage gates (CLAUDE.md §10 / Automated Testing Documentation §8.2)

| Gate | Threshold | Status |
|---|---|---|
| Backend line coverage | ≥ 80% overall, ≥ 90% scoring/validation | **Met** — api/ 93% overall (scoring/ modules 100%), etl/ 81% overall (validators/ 98–100%) |
| Frontend coverage | ≥ 70% components, 100% chart/data-transform utils | **Met** — 93.13% overall, 100% on `src/lib/` |
| RLS policy coverage | Every policy has ≥ 1 positive + ≥ 1 negative pgTAP test | **Met** — 59/59 pgTAP assertions, every policy from Phase 1 plus Phase 5's trigger/grant/bucket checks |
| Lint/type errors | Zero (ruff, mypy --strict, eslint, tsc) | **Met** — ruff/mypy clean (api, etl), eslint/tsc clean (frontend, 1 non-blocking warning). Gate-failure behavior itself deliberately verified (Phase 6): a real violation injected into each of ruff/mypy (api, etl) and tsc (frontend) was confirmed to fail the exact CI command before being reverted |
| E2E smoke suite | 100% pass (E2E-01..05) | **Met** — 5/5 on `chromium-smoke` (the required PR gate); full suite (E2E-01..05 + accessibility, both viewport projects) 19/19 passed, 1 correctly skipped |
