---
INSTRUCTIONS FOR CLAUDE: Read this file at the start of any session working on this repo,
before starting new work, planning a phase, or answering questions about project status. It is
the authoritative, up-to-date record of what has actually been built, verified, and decided —
more current than any single doc under docs/ (which describe design/spec, not build status).
Update this file's "Current status" and "Phase-by-phase log" sections whenever a phase
completes or a significant decision is made, so the next session doesn't have to re-derive
context from scratch.
---

# Tactical-Scouting — Project Status

## What this project is

A six-team Premier League tactical-fit and undervaluation scouting platform (educational/
portfolio project, not for real recruitment/betting use). Full spec lives in the four baseline
docs (SRS, ADD, Frontend Design, Automated Testing Documentation — Word docs at repo root) and
`CLAUDE.md`. Build order follows the phases below; each phase was planned via plan-mode and
approved before execution.

## Current status: Phases 0–6 complete — feature-complete per the documented build plan

Deployment and credential rotation remain explicitly open (see "Next up").

## Repo layout (as it actually exists today)

```
supabase/
  migrations/        16 files — schema + RLS (Phase 1) + Realtime/trigger/Storage/grant (Phases 4-5)
  seed.sql            golden dataset: 6 clubs, 12 players, stats, valuations, fit scores
  tests/              13 pgTAP files, 59 assertions
  functions/          recompute-fit-scores, generate-export, pipeline-webhook (Deno) — each
                       with its own index.test.ts; supabase/functions/.env.example documents
                       the required env vars, .env is gitignored (local secrets)
etl/
  scrapers/           footystats.py, transfermarkt.py (real, tested), whoscored.py (stub — blocked)
  validators/         Pydantic models + quarantine logic
  loader/             single-transaction atomic loader
  run_pipeline.py     real entrypoint for etl-schedule.yml (not run in tests)
  tests/              unit (fixture-based) + integration (real local Supabase)
  pyproject.toml, .venv/  (own Python project, independently deployable)
api/
  app/
    scoring/          fit_score.py, undervaluation.py, normalize.py, repository.py, service.py
    auth/             jwt.py (JWKS verification), admin.py (require_admin), internal.py
                       (require_internal_secret — shared-secret auth for Edge Function callers)
    routers/          health.py, recommendations.py, fit_breakdown.py, admin.py, internal.py
                       (POST /internal/tactical-profiles/recompute — not in api-spec.yaml)
    main.py, schemas.py, errors.py, db.py, github.py
  tests/              unit + integration (real local Supabase + real Supabase Auth test users)
  pyproject.toml, .venv/
frontend/
  src/
    lib/              supabaseClient.ts, apiClient.ts, types.ts, queryKeys.ts, *.utils.ts (100% covered)
    auth/             AuthContext.tsx, ProtectedRoute.tsx
    components/       atoms/ molecules/ organisms/ — all 10 catalogued components (Frontend
                       Design Doc §5.1), each with loading/populated/empty/error states
    hooks/            one TanStack Query hook per data need (PostgREST or FastAPI)
    pages/            Home, ClubDetail, PlayerDetail, Comparison, Login, admin/*
    test/             MSW handlers/server, render helpers — no live network in unit tests
  router.tsx, App.tsx, main.tsx
  package.json, vite.config.ts, tailwind.config.ts, vitest.config.ts (own node_modules/, gitignored)
docs/
  api-spec.yaml               OpenAPI spec — fixed contract, routes/schemas match exactly
  data-dictionary.md          exact column/type/constraint reference for every table
  data-ethics-compliance.md   robots.txt findings, source decisions, WhoScored blocker writeup
  environment-and-secrets.md  every env var, who consumes it, frontend-safe or not
  runbook.md, project-plan.md, test-report.md  (test-report.md has real per-phase results)
e2e/                  Phase 6 — Playwright, own package.json/tsconfig (independent project)
  tests/               e2e-01..05 (UC-1..UC-5), accessibility.spec.ts (axe-core + keyboard nav)
  global-setup.ts, global-teardown.ts, test-users.ts   real E2E admin user via Supabase Auth
  helpers.ts           ensureFiltersExpanded (mobile FilterBar collapse toggle)
  playwright.config.ts  chromium-smoke (desktop, PR gate) + mobile (Pixel 5, nightly only) projects
perf/                  Phase 6 — non-functional
  k6/                  dashboard-load.js, fit-computation.js (local ephemeral stack, no staging)
  pipeline_duration_check.py   not k6 — extrapolates loader timing against the 2h budget (DC-07)
.github/workflows/
  test-and-lint.yml   lint + unit + integration jobs for etl/, api/, frontend/, and supabase/functions/
                       (Deno); migrations+pgTAP; gitleaks; Phase 6 added e2e-smoke (desktop E2E,
                       required PR check)
  etl-schedule.yml    real scrape→validate→load workflow (cron + manual dispatch), not yet run
                       live; Phase 5 added run_id threading + a job-level-failure notification
                       step to pipeline-webhook
  e2e-nightly.yml, perf-nightly.yml (Phase 6)   full Playwright suite (both viewports) + k6 +
                       pipeline-duration, nightly cron + manual dispatch, non-blocking
  dependabot.yml (Phase 6)   weekly pip (etl, api)/npm (frontend, e2e)/github-actions updates
.claude/plans/tactical-scouting-claude-expressive-willow.md   the working plan file, overwritten each phase
```

## Phase-by-phase log

### Phase 0 — Planning docs + scaffolding (done)
Wrote `docs/api-spec.yaml`, `data-dictionary.md`, `environment-and-secrets.md`, `runbook.md`,
`data-ethics-compliance.md`, `project-plan.md`, `test-report.md`, `user-guide.md` (stub). Repo
skeleton, `supabase init`, `.gitignore`, `test-and-lint.yml` skeleton.

**Decision made**: `Tactical-Scouting_Prerequisites.md` (contains real local secrets —
service_role key, DB password, deploy tokens) is gitignored. Those credentials passed through
an AI session and should be rotated before relying on them in production — not yet confirmed
done.

### Phase 1 — Schema & RLS (done)
13 migrations: `profiles`, `club`, `tactical_profile`, `player`, `player_statistics`,
`market_valuation`, `fit_score`, `undervaluation_index`, `pipeline_run`, `private.quarantine`,
plus `is_admin()`, the shared `updated_at` trigger, and the `latest_fit_score` view.
`seed.sql`: 6 real clubs + 12 synthetic golden players with stats/valuations/fit-scores.

**Verified**: `supabase db reset` clean, `supabase test db` → 51/51 pgTAP assertions (every
RLS policy has a positive + negative test). Spot-checked against live PostgREST too, not just
pgTAP.

**Key learning documented in the tests**: Postgres RLS needs BOTH a table-level `GRANT` and a
policy — missing the `GRANT` looks like an RLS failure but isn't one. Also: `throws_ok`'s 3-arg
form treats the 3rd arg as an exact error-message match, not a label — use the 4-arg form with
`NULL` for the message when you just want a description.

### Phase 2 — ETL (done)
`etl/scrapers/footystats.py` and `transfermarkt.py` are real, working parsers built against
**actual captured HTML fixtures** (`etl/tests/fixtures/`), not guessed selectors. Validators
(Pydantic + quarantine-on-failure), a single-transaction atomic loader (no literal "staging
tables" — one Postgres transaction per run, rolled back whole on any failure).

**Decision**: FBref (originally DC-01's source) is blocked by a Cloudflare bot-challenge before
even `robots.txt` can be read — replaced with **FootyStats.org** (verified robots.txt-compliant).
**WhoScored (DC-03) is deferred, not implemented** — its robots.txt is fine, but the site is a
pure client-side-rendered SPA (zero data in static HTML); unblocking it means either a headless
browser or reverse-engineering its internal API, neither done yet. DC-03 is "Should" priority,
not "Must", so this was an acceptable scope cut for this pass — **revisit this before claiming
DC-03 is satisfied.**

**Verified**: 47/47 tests (40 unit + 7 integration against real local Supabase), 81% coverage,
ruff/mypy clean.

**Real bug caught and fixed**: Python's stdlib `urllib.robotparser` silently fails to enforce
FootyStats' `/players?*` wildcard-plus-query-string rule — replaced with a small correct
matcher in `etl/scrapers/base.py`, regression-tested against all three sources' actual
robots.txt content.

### Phase 3 — Analysis service / FastAPI (done)
`api/app/` — cosine-similarity fit scoring, the undervaluation formula, JWKS-based JWT auth,
Pydantic validation matching `docs/api-spec.yaml` exactly, rate limiting (slowapi).

**Decisions made** (both explicitly confirmed with the user before implementation):
1. `defensive_line_height` (one of 6 tactical dimensions) has **no player-side stat proxy** —
   it's a team-shape metric. Fit scoring uses only the 5 dimensions with real proxies
   (`possession_share`, `ppda`, `buildup_speed`, `crossing_frequency`, `pressing_intensity`),
   renormalized to sum to 1. The weight stays fully editable at the club level (TP-02) but
   doesn't affect player scoring. **This is a known, documented limitation, not a bug.**
2. Undervaluation formula: `index_value = fit_score / value_percentile`, where
   `value_percentile` is the player's market-value rank (0–1) among same-position peers,
   floored at 0.05.
3. Fit score = `cosine_similarity(player_vector, club_weight_vector)` where both vectors have
   **only non-negative components** (player side = standard-normal CDF of each dimension's
   position-relative z-score; club side = renormalized weights) — this is what makes the
   Testing Documentation's boundary cases (identical→1.0, orthogonal→0) hold exactly without
   an artificial rescale.
4. Profile-weighting recompute is **synchronous**, inside the admin route, for this pass — not
   event-driven via the Phase 5 `recompute-fit-scores` Edge Function yet.

**Verified**: 61/61 tests (44 unit + 17 integration against real local Supabase AND real
Supabase Auth test users created via the Admin API — not hand-crafted JWTs), 93% coverage,
100% on scoring modules, ruff/mypy clean. Manual `uvicorn` smoke test confirmed real HTTP
requests work against the golden dataset.

**Three real bugs caught by testing against real infrastructure, not mocks** — all fixed with
explanatory comments at the fix site in the code itself:
1. `scipy.stats.norm.cdf` can't handle `Decimal` (what psycopg2 returns for `numeric` columns)
   — fixed by casting to `float` at the repository boundary (`app/scoring/repository.py`).
2. `psycopg2` can't adapt `numpy.float64`/`numpy.bool_` scalars that scipy/numpy hand back —
   same fix location, cast to native Python types before the INSERT.
3. The Phase 1 seed data's `fit_score.contributing_metrics` was seeded as a placeholder
   `{metric: weight}` dict **before** Phase 3's real output format existed (a list of
   `{metric, label, player_value, club_target_value, weight, contribution}`). This broke
   `GET /players/{id}/fit-breakdown`'s stored-row read path. Fixed by updating `supabase/
   seed.sql` to the real shape — not by special-casing the route around stale data.

### Phase 4 — Frontend / React SPA (done)
`frontend/` — Vite + TypeScript + TailwindCSS (design tokens from Frontend Design Doc §3),
React Router v6 (`createBrowserRouter`, URL-driven filter/sort state per §5.2), TanStack Query
against PostgREST (direct reads) and the FastAPI service (recommendations, fit-breakdown,
admin writes), Chart.js via `react-chartjs-2` for RadarChart/FitValueScatter/
ValuationTrendChart. All 10 catalogued components built, each with loading/populated/empty/
error states (§3.4). Pages: Home, Club Detail, Player Detail, Comparison, Login, Admin
(Pipeline Runs / Tactical Profiles / Users).

**Decisions made** (both explicitly confirmed with the user before implementation):
1. **Admin "Users" section is read-only** — the sitemap mentions user management but the
   component catalog has no matching component and no backend route exists for role changes
   (Phase 1 RLS only grants admin SELECT-all on `profiles`; FastAPI has no user-mgmt route).
   The page lists profiles via a direct PostgREST read; role changes remain a manual/dashboard
   operation. **Known limitation — building real role management needs a new backend route
   first, out of scope for this pass.**
2. **`ExportButton` (DV-06) does client-side CSV, not a Phase-5-Edge-Function stub.** It
   exports the currently-loaded, filtered `RankedPlayerTable` rows to a CSV file entirely in
   the browser — fully functional today rather than a disabled placeholder, and doesn't block
   on Phase 5's `generate-export` Edge Function existing.
3. **Router = React Router v6, charts = Chart.js only (no D3), player comparison = client-only
   `localStorage`** (no backend "shortlist" table exists — a Phase 0 scope decision already
   made). All three are implementation-detail calls, not architecture conflicts.
4. **`pipeline_run` was added to the `supabase_realtime` publication** via a new migration
   (`20260815123510_pipeline_run_realtime.sql`) so the admin `PipelineRunLog` can subscribe to
   live status updates (Frontend Design Doc §4.3) — additive only, RLS unchanged.

**Verified**: 139/139 tests (Vitest + React Testing Library + MSW — no live network in unit
tests), 93% overall coverage, **100% on every `src/lib/` chart/data-transform utility module**
(the CLAUDE.md §10 gate that matters most for this layer), eslint clean (1 non-blocking
react-refresh warning), `tsc -b --noEmit` clean, `npm run build` succeeds. Manual smoke test:
real local Supabase + real Phase 3 `uvicorn` service — `GET /clubs/{id}/recommendations` and
`GET /players/{id}/fit-breakdown` both returned correct real data from the golden seed dataset;
`npm run dev` served every top-level page module without a transform error. **No real browser
was available in this execution environment** — visual rendering and click-through user
journeys were not directly observed, only inferred from passing component tests + working API
responses + error-free module compilation. That gap is what Phase 6's Playwright E2E suite and
axe-core pass are specifically for — don't treat this phase's verification as covering it.

**Two real bugs caught by testing, not eyeballing**:
1. `ClubProfileCard` and `ProfileWeightEditor` checked `status === "loading" || !data` *before*
   checking `status === "error"` — an error response with no cached data rendered a permanent
   loading skeleton instead of the error state with retry. Found by a test asserting the Retry
   button appears on `status="error"`; fixed by reordering the checks in both components.
2. `api/app` has no `.env` auto-loading (env vars are set programmatically in
   `tests/integration/conftest.py`, not via `python-dotenv`) — a real `uvicorn` smoke-test run
   500'd with an unset `SUPABASE_JWKS_URL` until env vars were exported into the shell first.
   Not a bug in the app (12-factor design is intentional), but worth remembering for the next
   person who runs `uvicorn` manually outside pytest.

### Phase 5 — Edge Functions (done)
`supabase/functions/` implements all three ADD §5.3 functions in Deno. `recompute-fit-scores`
makes UC-5 genuinely event-driven: `POST /admin/tactical-profiles/{club_id}/weightings` now
only writes the new `tactical_profile` version and returns `recompute_status: "enqueued"`; a
`pg_net`-based Postgres trigger (`AFTER INSERT ... WHEN (NEW.is_current)`) calls the function,
which calls a new internal FastAPI route (`POST /internal/tactical-profiles/recompute`,
shared-secret authenticated via `X-Internal-Secret`) that reuses Phase 3's `recompute_club()`
completely unchanged — no scoring-logic duplication in Deno. `generate-export` adds the
private `exports` Storage bucket + signed-URL mechanism the ADD describes (CSV only, per the
confirmed decision), re-fetching the authoritative ranked list from the public
`/clubs/{id}/recommendations` route server-side rather than trusting client-supplied rows;
`ExportButton` gained an additive "Get shareable link" action alongside Phase 4's still-default
client-side download. `pipeline-webhook` is the job-level failure fallback for
`etl-schedule.yml` — `run_pipeline.py`'s own success/failure paths already write `pipeline_run`
directly, so this only matters for failures the Python script never reaches at all (dependency
install failure, runner OOM, workflow timeout).

**Decisions made** (confirmed with the user before implementation):
1. **Event-driven via DB trigger**, not left as an unwired scaffold next to a still-synchronous
   route.
2. **A real bug found while planning this phase was fixed as in-scope work**: `POST
   /admin/pipeline/trigger` inserted a `pipeline_run` row whose `run_id` was never passed to
   the GitHub Actions dispatch, so `run_pipeline.py` always created a second, disconnected row
   — every admin-triggered run permanently orphaned the "queued" one. Fixed by threading
   `run_id` through `dispatch_etl_workflow` → the `workflow_dispatch` input →
   `etl/loader/pipeline_run.py::start_run`, which now updates the existing row in place when
   given one (schedule-triggered runs, with no pre-existing row, keep the original insert
   behavior).
3. **`generate-export` is CSV-only** via Storage + signed URL — no PDF.

**Verified**: 59/59 pgTAP assertions (up from 51), 67/67 API tests (93% coverage), 49/49 ETL
tests (81% coverage), 145/145 frontend tests (93.14% overall, 100% on `src/lib/`), ruff/mypy/
eslint/tsc all clean. Deno-native unit tests exist per function but couldn't run locally (no
`deno` binary in this environment) — verified instead via real HTTP calls against the actual
Deno runtime `supabase start`'s `edge-runtime` container provides, which is a stronger check.

**All three functions verified end-to-end against real infrastructure**, including — critically
— the **full trigger chain**, not just each function in isolation: simulated the admin route's
exact `tactical_profile` write via psycopg2, confirmed the `pg_net` trigger fired, called
`recompute-fit-scores`, which called FastAPI, which wrote 12 real `fit_score` rows
**asynchronously** (present ~3 seconds after the INSERT, nothing synchronous in between).
`pipeline-webhook` was verified against a real `pipeline_run` row. `generate-export`'s signed
URL was actually downloaded and its CSV contents checked against real seeded data.

**Four real bugs found during manual verification, none of them assumed away**:
1. **`service_role` had no table-level GRANTs on `public.pipeline_run`.** `rolbypassrls = true`
   does not imply DML privileges — RLS bypass and GRANTs are separate Postgres authorization
   layers. Every earlier phase's server code connects as the `postgres` role directly via
   `SUPABASE_DB_URL`, never exercising this path — `pipeline-webhook` was the first code in
   this project to touch a table via PostgREST with the service_role key. Fixed with a new
   migration (`20260815123525_service_role_pipeline_run_grant.sql`) and a pgTAP assertion that
   checks the grant directly (not just RLS), per Testing Documentation §4.2's "check both
   layers" guidance.
2. **The originally-planned config mechanism (Postgres GUCs via `alter database ... set
   app.*`) doesn't work at all** — confirmed `select rolsuper from pg_roles where
   rolname='postgres'` returns `false`; Supabase's `postgres` role isn't a superuser even
   locally and can't set unrecognized custom GUC classes. Switched to **Supabase Vault**
   (`vault.create_secret`/`vault.decrypted_secrets`) — the actual supported mechanism for
   exactly this pattern. Caught on the very first real setup attempt, not shipped as a runbook
   step nobody could follow.
3. **`generate-export`'s returned signed URL was wrong in two compounding ways**: `SUPABASE_URL`
   inside an Edge Function resolves to the internal Docker-network address (`http://kong:8000`
   locally), not reachable from a browser; and the Storage API's `signedURL` field is relative
   to `/storage/v1`, which was missing from the constructed link. Both caught by actually
   calling the returned URL and getting a 404, not by assuming a 200 response meant success.
   Fixed with a separate `PUBLIC_SUPABASE_URL` env var and the correct path prefix.
4. **The `pipeline_run` orphaned-row bug** (found during planning, see Decision 2 above) — fixed
   and verified via a new integration test.

### Phase 6 — E2E, Non-functional testing, CI hardening (done — final build phase)
`e2e/` (Playwright, own `package.json`) covers E2E-01..05 mapped 1:1 to UC-1..UC-5, plus
`accessibility.spec.ts` (axe-core against Home/Club Detail/Player Detail/Comparison, zero
serious/critical violations; a keyboard-only Tab/Enter smoke test), run on both a desktop
project (`chromium-smoke`, the required PR gate) and a Pixel 5 mobile viewport project (nightly
only). `perf/k6/` covers dashboard-load and fit-computation against the local ephemeral stack
(no staging project exists — same substitution every earlier phase made); `perf/
pipeline_duration_check.py` is a non-k6 script (deliberately, DC-07 forbids live scraping in
tests) that extrapolates real loader timing against the 2-hour six-club-refresh budget.
`api/app/rate_limit.py` (SEC-004) replaces `slowapi` entirely with a ~30-line in-house
fixed-window limiter. `CORSMiddleware` was added to `api/app/main.py`. `.github/dependabot.yml`
covers dependency scanning (the Testing Documentation's own accepted Dependabot alternative to a
custom audit job). CI gained `e2e-smoke` (required PR check) plus `e2e-nightly.yml`/
`perf-nightly.yml` (full suite, both viewports, nightly cron + manual dispatch, non-blocking).

**Decisions made** (confirmed with the user before implementation, or low-stakes/reversible
calls made without a question per the session's established pattern):
1. **k6 targets the local ephemeral stack**, not a staging project (none exists) — confirmed
   with the user before implementation.
2. **Dependency scanning uses Dependabot**, not a custom `pip-audit`/`npm audit` CI job — the
   Testing Documentation explicitly lists Dependabot as an accepted alternative.
3. **The §6.3 "schema-drift check" is satisfied by the existing Phase 2 fixture-based parser
   tests**, not a new separate mechanism — they already fail the moment a source site's real
   structure diverges from the captured fixture, which is what the section describes.

**Verified**: 19/19 E2E specs passed (1 correctly skipped: keyboard nav on mobile), both k6
scripts within their p95 thresholds (12ms and 97ms respectively, against 3000ms/2000ms budgets),
pipeline-duration projected at 67.1 min against a 120 min budget, pgTAP 59/59 (unchanged), api/
75/75 (67 + 8 new: rate-limit + CORS), etl/ 49/49 (unchanged), frontend 147/147 (145 + 2 new
regression tests), ruff/mypy/eslint/tsc all clean. Full results and every bug's detail in
`docs/test-report.md`'s Phase 6 section — not duplicated here.

**Five real, previously-shipped bugs found and fixed, none catchable by any test tier before
this phase's browser-based/CI-gate verification** (see `docs/test-report.md` for full detail on
each): (1) rate limiting silently disabled since Phase 3 (`slowapi` incompatible with the
FastAPI version in use — `app.routes` internals changed shape); (2) CORS never configured since
Phase 3/4 (invisible to every in-process `pytest`/`httpx` test tier — CORS is browser-only
enforcement); (3) an `AuthContext` async race since Phase 4 (`setSession` called before the role
fetch resolved); (4) a `ProfileWeightEditor` stale-state bug since Phase 4/5 (`useState`
initializer only evaluated once, before data arrived); (5) a missing `GenerateExportResponse`
type — a genuine pre-existing `tsc` failure, found while deliberately verifying the lint/type CI
gates actually fail on a real violation (CLAUDE.md §14), not by any existing test.

**A genuine Chromium/Playwright mobile hit-testing quirk was investigated exhaustively before
using `force: true`, not reached for as a default**: three mobile-viewport E2E specs reported a
chart canvas or unrelated button "intercepting" clicks for the full 30s retry window. Verified
via trace screencast frames, live `elementFromPoint` probes, and manual geometry checks that the
elements never actually overlap on screen at any captured frame — ruled out real layout overlap,
ResizeObserver thrashing, and touch-vs-mouse event semantics (`.tap()` reproduced identically)
before concluding it's a known class of Chromium hit-test rounding quirk under fractional-DPR
(2.75) mobile emulation. Each `force: true` call site has an in-code comment documenting the
verification performed. A separate, real race was found and fixed in
`e2e/helpers.ts::ensureFiltersExpanded` (a bare `isVisible()` check could run before the toggle
button had even mounted).

## Explicitly out of scope so far (not silently dropped — flagged in each phase's plan)

- **Admin user role management (promote/demote/invite)**: Phase 4's Users page is read-only —
  see the Phase 4 decision above. Needs a new backend route before it can be built.
- **PDF export** — `generate-export` is CSV-only, per the confirmed Phase 5 decision.
- **Playwright E2E, axe-core automated accessibility gate, k6 performance tests**: Phase 6.
  Phase 4's manual smoke test did not include a real browser — see the Phase 4 entry above.
- **WhoScored / DC-03**: blocked by client-side rendering, not implemented. See
  `docs/data-ethics-compliance.md`.
- **No Edge Function has been deployed to a real Supabase project** — all three verified only
  against the local stack (`supabase start`'s `edge-runtime` container). `docs/runbook.md`
  §9 has the deploy commands, not yet run.
- **Deno-native `deno test` has never actually been run** — no `deno` binary in this execution
  environment; the CI job (`unit-tests-functions`) is written and should work, but hasn't been
  observed passing in a real run, only inferred from the equivalent HTTP-level verification.
- **`pg_net`'s webhook call has no retry/backoff** — a single fire-and-forget POST, matching
  the ADD's description; a dead-letter/retry mechanism is a future-enhancement item.
- **No live production scrape has ever been run** — only the one-time fixture capture (a
  handful of pages) and the local dev/test runs against seeded data. The "first real ETL run"
  (per `docs/runbook.md`) hasn't happened.
- **No deployment** — no `deploy-backend.yml`, nothing pushed to Render/Netlify/Vercel. Local
  dev + CI only so far.
- **FBref remains unimplemented** (schema still permits it as a future `data_source` value).
- **Credential rotation** for the values that were in `Tactical-Scouting_Prerequisites.md` —
  recommended in Phase 0, not confirmed done.

## How to verify everything still works (from a clean session)

```bash
# 1. Docker must be running (Docker Desktop on Windows)
supabase start                     # from repo root — starts local Postgres/Auth/PostgREST/edge-runtime
supabase db reset                  # applies all 16 migrations + seed.sql
supabase test db                   # pgTAP — expect 59/59 (Files=13, Tests=59)

# 2. ETL
cd etl
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m mypy .
.venv/Scripts/python.exe -m pytest tests/unit tests/integration --cov=scrapers --cov=validators --cov=loader
# expect 49/49, 81% coverage

# 3. API
cd ../api
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m mypy .
.venv/Scripts/python.exe -m pytest tests/unit tests/integration --cov=app
# expect 67/67, 93% coverage

# 4. Frontend (no live backend needed — unit tests are MSW-mocked)
cd ../frontend
npm run lint
npm run typecheck
npm run test -- --coverage
# expect 147/147, 93.13% overall coverage, 100% on src/lib/

# 5. Edge Functions (requires Deno — not installed in every environment; see below for the
#    HTTP-level alternative that was actually used to verify this phase)
cd ../supabase/functions
deno test --no-check */index.test.ts

# 6. E2E + perf (Phase 6) — needs the frontend built + the API running; see docs/runbook.md §10
#    for the full setup (Vault setup script, e2e_server.py, k6-via-Docker commands)
cd ../e2e && npm run test:full
# expect 19 passed, 1 skipped (keyboard-nav test — desktop-only, correctly skips on mobile)

supabase stop                      # when done
```

Both `etl/` and `api/` have their own `.venv/` (gitignored) — if missing, `pip install -e
".[dev]"` from within each directory recreates it. `frontend/` has its own `node_modules/`
(gitignored) — if missing, `npm install` recreates it.

For a manual end-to-end smoke test (not part of the automated suites above): run `supabase
start` and `supabase db reset`, then from `api/` export `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_DB_URL`, `SUPABASE_JWKS_URL`, `RATE_LIMIT_PER_MINUTE`, `GITHUB_TOKEN`, `GITHUB_REPO`,
`INTERNAL_FUNCTION_SECRET` into the shell (api/app does **not** auto-load a `.env` file — see
the Phase 4 bug note above) and run `.venv/Scripts/python.exe -m uvicorn app.main:create_app
--factory --port 8000`, then from `frontend/` create a `.env.local` pointing
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` at the local stack and `VITE_API_BASE_URL` at
`http://localhost:8000`, then `npm run dev`.

To also exercise the Phase 5 Edge Functions locally: copy `supabase/functions/.env.example` to
`supabase/functions/.env` (values must match `INTERNAL_FUNCTION_SECRET`/
`PIPELINE_WEBHOOK_SECRET` set on the `api/` side), restart the stack (`supabase stop` then
`supabase start` — functions are only (re)discovered on start, not hot-added), and run the
one-time Vault setup from `docs/runbook.md` §8 (`select vault.create_secret(...)` — NOT the
`alter database ... set` form, which doesn't work: Supabase's local `postgres` role isn't a
superuser). Functions are then reachable at `http://127.0.0.1:54321/functions/v1/<name>` (needs
`Authorization: Bearer <anon key>` to pass the platform-level gate, on top of each function's
own auth).

## Next up

All six planned build phases are complete — the project is feature-complete per
`docs/project-plan.md`. What remains is explicitly **not** part of any planned phase; treat it
as a distinct future activity, not unfinished Phase 6 work:

1. **Real deployment.** No `deploy-migrations.yml`/`deploy-backend.yml` exist and nothing has
   been pushed to a hosting provider (Render/Netlify/Vercel per the ADD) or a real Supabase
   project. Everything verified so far — all six phases — has run against the local ephemeral
   stack (`supabase start`'s containers) only.
2. **No Edge Function has been deployed to a real Supabase project**, only verified against
   `supabase start`'s local `edge-runtime` container. `docs/runbook.md` §8-9 has the Vault setup
   + `supabase functions deploy` steps, not yet run for real.
3. **Credential rotation** for the values that passed through an AI session in
   `Tactical-Scouting_Prerequisites.md` (flagged since Phase 0) — still not confirmed done.
4. **k6/`psql` were not directly installable in this local execution environment** — k6 was run
   successfully via its official Docker image instead (`docs/runbook.md` §10 has the exact
   commands); `psycopg2` was used everywhere `psql` would normally appear. Neither is a gap in
   what was verified, just a note for the next session's tooling setup.
5. Two small deferred-decision items already flagged as open, not silently resolved: Testing
   Documentation Appendix C's nightly-failure Slack/Discord notification (explicitly listed
   there as an open decision for the project owner) and the §8.3 JUnit-annotation/coverage-PR-
   comment GitHub integrations (genuinely optional CI polish beyond the pass/fail gates
   themselves).
