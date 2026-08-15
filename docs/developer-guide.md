# Developer Guide

Start here. This is the orientation document for anyone picking up development on
Tactical-Scouting — a new contributor, or a handoff from the current maintainer. It indexes and
cross-links the rest of `docs/` rather than duplicating them, and covers the things that live
only in code today: conventions, patterns, and a worked example of making a change end to end.

## 1. What this project is

A six-team Premier League tactical-fit and undervaluation scouting platform
(educational/portfolio project — not for real recruitment or betting use). The full functional
spec lives in four Word documents at the repo root (`Tactical-Scouting_SRS.docx`,
`_Architecture-Design.docx`, `_Frontend-Design.docx`, `_Automated-Testing-Documentation.docx`)
— these are kept local, not in git (large binaries), so get them directly from whoever is
handing off the project if they aren't already on your machine. `CLAUDE.md` (repo root, now in
git) is the second, code-facing tier of spec: the non-negotiable rules an AI coding agent (or a
human contributor) follows on this repo — security rules, testing gates, change protocol. Read
it before making any non-trivial change; it overrides generic best-practice instincts where the
two conflict.

Six build phases got the project to its current state (schema/RLS, ETL, FastAPI analysis
service, React frontend, Edge Functions, then E2E/perf/CI hardening). The full phase-by-phase
history, every real bug found and fixed along the way, and every deliberate scope decision is in
`.claude/PROJECT_STATUS.md` — read that next if you want the "why" behind anything that looks
like an odd choice in the code.

## 2. Architecture at a glance

```
Scheduled Python ETL (etl/)
        |
        v
Supabase/Postgres (supabase/)
   |          |
   |          +--> PostgREST --> React SPA (frontend/)
   |
   +--> FastAPI + scikit-learn (api/)
   |
   +--> Edge Functions / Realtime / Storage (supabase/functions/)
```

The frontend talks to PostgREST directly for simple RLS-protected reads (club list, player
table, tactical profile, pipeline run log), and to FastAPI only for tactical-fit/undervaluation
computation and privileged admin writes. Edge Functions handle short, event-triggered work: a
Postgres trigger fires one when an admin edits a club's weightings (recompute-fit-scores), one
generates a signed CSV export link (generate-export), and one is a job-level failure fallback
for the scheduled ETL workflow (pipeline-webhook). RLS is the actual authorization boundary
everywhere — the frontend and FastAPI both defer to it, never re-implement it.

## 3. Repository map

```
supabase/
  migrations/     versioned schema + RLS (Supabase CLI migrations, never hand-edited via dashboard)
  seed.sql        the golden dataset: 6 clubs, 12 players, stats, valuations, fit scores
  tests/          pgTAP — RLS positive/negative tests, schema shape checks
  functions/      recompute-fit-scores, generate-export, pipeline-webhook (Deno)
  e2e-vault-setup.sql   one-time local Vault setup so E2E tests can exercise the trigger chain

etl/
  scrapers/       footystats.py, transfermarkt.py (real parsers); whoscored.py (stub — blocked,
                  see docs/data-ethics-compliance.md); base.py's RobotsChecker + RateLimitedClient
                  are the shared utilities every scraper composes with
  validators/     Pydantic models (models.py), quarantine-on-invalid logic (rules.py), dedup
  loader/         load.py's single-transaction atomic upsert; pipeline_run.py tracks each run
  run_pipeline.py the real Extract -> Validate -> Load entrypoint (etl-schedule.yml calls this)
  tests/          unit (fixture-based, no network) + integration (real local Supabase)

api/
  app/
    routers/      health.py, recommendations.py, fit_breakdown.py, admin.py, internal.py
    scoring/      fit_score.py, undervaluation.py, normalize.py (pure computation);
                  repository.py (DB reads for scoring); service.py (recompute orchestration)
    auth/         jwt.py (JWKS verification), admin.py (require_admin/get_optional_claims),
                  internal.py (require_internal_secret — Edge Function -> FastAPI auth)
    main.py, schemas.py, errors.py, db.py, github.py, rate_limit.py
  tests/          unit + integration (real local Supabase, real Supabase Auth test users)
  e2e_server.py   test-harness entrypoint used by E2E CI (stubs the real GitHub dispatch call)

frontend/
  src/
    lib/          supabaseClient.ts, apiClient.ts, types.ts, queryKeys.ts, *.utils.ts
    auth/         AuthContext.tsx, ProtectedRoute.tsx
    components/   atoms/ molecules/ organisms/ — atomic design, every data-bearing component
                  has loading/populated/empty/error states
    hooks/        one TanStack Query hook per data need
    pages/        Home, ClubDetail, PlayerDetail, Comparison, Login, admin/*
  router.tsx, App.tsx, main.tsx

e2e/              Playwright — own package.json, independent project
perf/             k6 scripts + a non-k6 pipeline-duration budget check
docs/             everything described in the map below
.github/workflows/  test-and-lint.yml (required PR gate), etl-schedule.yml,
                    e2e-nightly.yml, perf-nightly.yml, dependabot.yml
```

## 4. Local dev setup, fast path

Full detail (env var setup, Vault setup for the recompute trigger, troubleshooting) is in
`docs/runbook.md`; this is the condensed version to get everything running.

```bash
# 1. Supabase (needs Docker running)
supabase start
supabase db reset          # applies every migration + seed.sql
supabase test db           # pgTAP — expect 59/59

# 2. ETL
cd etl && pip install -e ".[dev]"
python -m ruff check . && python -m mypy .
python -m pytest tests/unit tests/integration --cov=scrapers --cov=validators --cov=loader

# 3. API — app/ does NOT auto-load .env; export vars into the shell first (see
#    docs/environment-and-secrets.md for the full list)
cd ../api && pip install -e ".[dev]"
python -m ruff check . && python -m mypy .
python -m pytest tests/unit tests/integration --cov=app
python -m uvicorn app.main:create_app --factory --port 8000   # manual smoke test

# 4. Frontend
cd ../frontend && npm install
npm run lint && npm run typecheck
npm run test -- --coverage
npm run dev                # needs VITE_SUPABASE_URL/ANON_KEY/API_BASE_URL in .env.local

# 5. E2E + perf (Phase 6) — needs the stack + API + a built frontend all running;
#    see docs/runbook.md §10 for the Vault setup step and the k6-via-Docker commands
#    (k6 wasn't installable in every environment this project was built in)
cd ../e2e && npm install && npx playwright install --with-deps chromium
npm run test:full

supabase stop               # when done
```

## 5. Docs map

| Doc | Covers | Read it when... |
|---|---|---|
| `docs/api-spec.yaml` | FastAPI's public contract — routes, request/response schemas, auth, error codes | you're calling or changing a FastAPI route |
| `docs/data-dictionary.md` | every table/view/function/index/trigger in the schema | you're touching the database in any way |
| `docs/environment-and-secrets.md` | every env var, who consumes it, frontend-safe or not | you're setting up a new environment or adding config |
| `docs/runbook.md` | operational procedures — first migration push, first admin user, Vault setup, deploying Edge Functions, rotating secrets, running E2E/perf locally | you're doing an operational task, not writing code |
| `docs/user-guide.md` | what the product actually does, from an end user's perspective | you need to understand a feature before changing it |
| `docs/test-report.md` | real, verified per-phase test results and every bug found along the way | you want evidence something works, not just a claim |
| `docs/project-plan.md` | the phase-by-phase build plan and what each phase delivered | you want the historical "what was built when" |
| `docs/data-ethics-compliance.md` | robots.txt findings, source decisions, the WhoScored blocker | you're touching the ETL scrapers |
| `.claude/PROJECT_STATUS.md` | current build status, every decision made and why, known gaps | **read this first**, always — it's the most up-to-date single source of truth |

## 6. Codebase conventions

### Backend (`api/`)

Routers are pragmatic, not uniformly layered: a route that's a straightforward filtered read
(`routers/recommendations.py`) owns its SQL directly via `psycopg2` (`app/db.py::get_connection`)
— there's no repository abstraction forced onto simple reads. A route whose job is scoring
computation instead delegates to `app/scoring/`: `repository.py` for the DB reads scoring needs,
`fit_score.py`/`undervaluation.py`/`normalize.py` for pure, side-effect-free computation, and
`service.py` for orchestrating a full recompute (`recompute_club`, called from both the Phase 3
synchronous path's remnants and Phase 5's `POST /internal/tactical-profiles/recompute`).

Every error response goes through `app/errors.py`'s `AppError` (raise `not_found(...)`,
`forbidden(...)`, etc. — never a bare `HTTPException`) so every non-2xx response gets the same
`{"error": {"code", "message", "details"}}` shape via the global exception handler in `main.py`.

Three distinct auth mechanisms, each its own dependency — don't reach for the wrong one:
- `app/auth/admin.py::require_admin` — admin-only routes, 401/403.
- `app/auth/admin.py::get_optional_claims` — "public, but recognizes a signed-in user" routes
  (recommendations, fit-breakdown); still 401s on a present-but-invalid token.
- `app/auth/internal.py::require_internal_secret` — service-to-service only (`/internal/*`,
  called by an Edge Function, never a browser), shared-secret via `X-Internal-Secret`, not JWT.

Rate limiting (`app/rate_limit.py`) and CORS (`app/main.py`) are both applied globally, not
per-route — see that module's docstring for why the original `slowapi` dependency was removed
entirely rather than patched.

### ETL (`etl/`)

Extract → Transform/Validate → Load, strictly. Each scraper module (`scrapers/footystats.py`,
`transfermarkt.py`) is a standalone parser that composes `scrapers/base.py`'s `RobotsChecker`
(a from-scratch wildcard matcher — stdlib `urllib.robotparser` was found to silently
under-enforce a real rule, see its docstring) and `RateLimitedClient`. Records that fail
Pydantic validation (`validators/models.py`, checked by `validators/rules.py`) never get
silently dropped — they go to `private.quarantine` with a reason, via `loader/quarantine.py`.
`loader/load.py` wraps an entire run's writes in one Postgres transaction — any exception rolls
back the whole thing, so a failed run never publishes partial data. Automated tests use recorded
fixtures (`etl/tests/fixtures/`) exclusively — never live network.

### Frontend (`frontend/`)

Atomic design: `atoms/` → `molecules/` → `organisms/` → `pages/`, per the Frontend Design Doc.
One TanStack Query hook per data need (`hooks/useRecommendations.ts`, `useFitBreakdown.ts`,
etc.) — components don't call `fetch`/Supabase directly. Filter/sort/comparison-list state
lives in the URL's query string (via hooks like `useComparisonList`, backed by `localStorage`
for the comparison list specifically — no backend "shortlist" table exists, a deliberate Phase 0
scope decision). Every data-bearing component implements all four states — loading, populated,
empty, error — not just the happy path; `ClubProfileCard`/`ProfileWeightEditor` had a real bug
once where the loading check ran before the error check, masking errors as a stuck spinner.
Unit/component tests never touch live network — MSW intercepts every `fetch` (`src/test/mocks/
handlers.ts`), and Supabase Auth is mocked via a `Proxy` around the real client so every method
keeps correct `this` binding without opening a real session.

### Database (`supabase/`)

Every schema change is a versioned migration (`supabase migration new <name>`) — the Supabase
dashboard's SQL editor is never the source of truth. RLS is the authorization boundary: almost
every table uses a `<table>_public_read using (true)` policy for reads plus admin-only writes
gated by `public.is_admin()` (one function, reused by every policy rather than re-implemented
per table); `pipeline_run` is the one exception with admin-only *read* too. Historical rows are
never overwritten — `tactical_profile` and `fit_score` are both versioned
(`profile_version`/`version` columns), so a profile edit doesn't retroactively change what an
old fit score meant.

### Testing philosophy

The pyramid (unit → integration → E2E → non-functional) is described in full in `CLAUDE.md`
§10, but the habit worth internalizing is this project's insistence on verifying against real
local infrastructure rather than trusting mocks alone — real local Supabase, a real
`uvicorn`/Vite dev server, real Supabase Auth test users, a real Chromium browser for E2E. That
habit is what caught several real, previously-shipped bugs no mock-based test would have: rate
limiting silently disabled since Phase 3 (a third-party library's route-introspection
assumption broke silently against a newer FastAPI version), and CORS never having been
configured at all (invisible to every in-process test client, since CORS is purely a browser
enforcement mechanism — see `docs/test-report.md`'s Phase 6 section for the full list). Never
live-scrape or hit a real external network call in a test, ETL or otherwise — recorded fixtures
only.

## 7. Worked example: adding a feature end to end

Say you're adding a 7th tactical dimension (e.g. `direct_play_frequency`) that admins can weight
and that contributes to fit scoring. Following `CLAUDE.md` §14's change protocol:

1. **Inspect first.** Read `docs/data-dictionary.md`'s `tactical_profile` section and
   `api/app/schemas.py`'s `ALL_DIMENSIONS`/`SCORABLE_DIMENSIONS` sets to see how the existing 6
   dimensions are wired — a new dimension touches both.
2. **Migration.** `supabase migration new add_direct_play_frequency_stat` — likely a new
   `player_statistics` column (the player-side proxy stat) if one doesn't already exist that
   fits. Update `supabase/seed.sql` so the golden dataset has real values for it.
3. **Schema.** Add the key to `SCORABLE_DIMENSIONS`/`ALL_DIMENSIONS` in `api/app/schemas.py` —
   `WeightingsRequest`'s validator picks it up automatically (it derives required/rejected keys
   from that set, nothing to change there).
4. **Scoring.** `api/app/scoring/repository.py` needs to read the new stat;
   `api/app/scoring/fit_score.py`/`normalize.py` need to fold it into the z-scored vector used
   for cosine similarity.
5. **Contract.** Update `docs/api-spec.yaml`'s weightings request schema (the explicit 6-key
   `required`/`properties` list) to 7 keys, and `docs/data-dictionary.md`'s `tactical_profile`
   section.
6. **Tests first tier.** Unit tests for the new normalization/scoring math
   (`api/tests/unit/`), then an integration test through `POST /admin/tactical-profiles/
   {club_id}/weightings` confirming the new key is accepted/rejected correctly and the version
   increments.
7. **Frontend.** `frontend/src/lib/types.ts`'s `TacticalDimension`/dimension lists, then
   `ProfileWeightEditor.tsx` (the slider set) and `RadarChart`'s dimension labels. Add/update
   the corresponding component tests.
8. **E2E.** `e2e/tests/e2e-05-update-tactical-profile.spec.ts` already exercises the weightings
   editor end to end — extend its slider-adjustment logic to cover the 7th dimension rather than
   writing a new spec from scratch.
9. **Verify narrow → broad**, per §14: the new unit tests, then the full `api/`/`etl`/`frontend`
   suites, then a full local E2E run, before calling it done.
10. **Update docs** that describe the current state (`data-dictionary.md`, `api-spec.yaml`,
    `user-guide.md`'s UC-5 section if the admin-facing behavior changed) and
    `.claude/PROJECT_STATUS.md` if this is a phase-worthy addition worth logging.

## 8. CI/CD pipeline

- **`test-and-lint.yml`** — runs on every push/PR to `main`; the required gate. Jobs: lint +
  unit + integration for `etl/`, `api/`, `frontend/`; a Deno unit-test job for the Edge
  Functions; `migrations-and-rls` (fresh `supabase db reset` + pgTAP); gitleaks; `e2e-smoke`
  (one Playwright spec per use case, desktop viewport only).
- **`etl-schedule.yml`** — the real scrape → validate → load workflow, cron + manual dispatch
  (with an optional `run_id` input so an admin-triggered run correlates back to its
  `pipeline_run` row). On a job-level failure `run_pipeline.py` never reached, it notifies the
  `pipeline-webhook` Edge Function as a fallback.
- **`e2e-nightly.yml`** / **`perf-nightly.yml`** — the *full* Playwright suite (both viewport
  projects, axe-core) and the k6/pipeline-duration checks, nightly cron + manual dispatch.
  Non-blocking — a nightly failure surfaces via the Actions UI, it doesn't block any PR.
- **`dependabot.yml`** — weekly dependency-update PRs for `pip` (`etl/`, `api/` separately),
  `npm` (`frontend/`, `e2e/`), and `github-actions` itself.

## 9. Known limitations & what's next

Don't re-derive this — `.claude/PROJECT_STATUS.md`'s "Explicitly out of scope" and "Next up"
sections are the maintained, current list (deployment, credential rotation, WhoScored/FBref,
admin user-role management, and a few smaller items). Check there before assuming something is
either "not done" or "someone else's problem" — it's usually already flagged with the reason.

## 10. Where to get help

`.claude/skills/` has project-specific skill files an AI coding agent (or a human, reading them
directly) uses for area-specific guidance beyond this guide:

| Skill | For |
|---|---|
| `tactical-scouting` | cross-cutting architecture boundaries and operating rules — read this one first |
| `fastapi-analysis` | FastAPI/scikit-learn scoring service conventions |
| `football-etl` | scraper/validator/loader conventions |
| `react-dashboard` | frontend component/state conventions |
| `playwright-e2e` | E2E test conventions |
| `pytest-testing`, `python-quality` | Python test/lint conventions (etl/, api/) |
| `frontend-testing` | Vitest/RTL/MSW conventions |
| `github-actions-ci` | CI workflow conventions |
| `performance-testing` | k6 conventions |
| `accessibility` | WCAG/axe-core conventions |
| `security-audit`, `data-quality`, `code-review` | cross-cutting review checklists |
| `tailwind-design-system`, `tactical-visualization` | design tokens and chart conventions |

For anything not covered by a skill or this guide, `.claude/PROJECT_STATUS.md`'s phase-by-phase
log has the full reasoning behind almost every non-obvious decision in this codebase.
