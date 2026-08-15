# Project Plan / Milestones

Maps the six build phases (CLAUDE.md §4 / build prompt §4) to sequence, for academic
assessment alongside the SRS. Phase-ordered rather than calendar-dated, since a fixed calendar
wasn't specified by the project owner — each phase's exit criteria gate the next.

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — Planning & Scaffolding** | Planning docs (this set), repo skeleton, `supabase init`, `test-and-lint.yml` skeleton | Docs reviewed against ADD §3.3; CI green on an empty/Phase-1 schema |
| **1 — Schema & RLS** | Migrations for all tables, `is_admin()`, triggers, RLS policy pairs, `seed.sql` | `supabase db reset` clean; every RLS policy has passing positive + negative pgTAP tests |
| **2 — ETL** | Scrapers (FootyStats + Transfermarkt implemented; WhoScored deferred — see `docs/data-ethics-compliance.md`), validators, loader (single-transaction atomic load), quarantine, `pipeline_run` logging | Fixture-based unit tests green; loader's atomic-transaction load verified against a real partial-failure case |
| **3 — Analysis (FastAPI)** | Tactical fit scoring, undervaluation index, Pydantic validation, JWT verification | Unit tests on boundary cases green; integration tests against local Supabase green; ≥ 90% coverage on scoring/validation modules |
| **4 — Frontend** | Design tokens, component catalog, pages, TanStack Query, URL-driven filters | Vitest/RTL ≥ 70% component coverage, 100% chart/data-transform utility coverage |
| **5 — Edge Functions** | `recompute-fit-scores`, `generate-export`, `pipeline-webhook` | Each function has a corresponding test invoking it against local Supabase |
| **6 — E2E, Non-functional, CI hardening** | Playwright E2E-01..05, axe-core, k6, gitleaks, dependency scanning | 100% E2E smoke pass on PR; nightly full suite green; all quality gates in CLAUDE.md §10/§6 wired into CI and verified to actually fail on violation |

## Status as of this document

- Phase 0: **done** — planning docs, repo skeleton, `supabase init`, `test-and-lint.yml`
  skeleton.
- Phase 1: **done** — schema/RLS migrations, `is_admin()`, triggers, `seed.sql` golden dataset;
  51/51 pgTAP assertions passing.
- Phase 2: **done** — `etl/` implements FootyStats (DC-01) and Transfermarkt (DC-02) scrapers
  against real captured fixtures, Pydantic-based validators with quarantine on failure, and a
  single-transaction atomic loader (47/47 tests passing, 81% coverage, ruff/mypy clean). DC-03
  (WhoScored) is a documented deferral, not a silent gap — see `docs/data-ethics-compliance.md`
  ("Should" priority, blocked by client-side rendering rather than robots.txt). CI now runs ETL
  lint/unit/integration jobs on every PR (`test-and-lint.yml`) and a real `etl-schedule.yml`
  exists for the scheduled/manual live run, not yet triggered against production data.
- Phase 3: **done** — `api/` implements the FastAPI analysis service: cosine-similarity fit
  scoring (5 of 6 tactical dimensions — `defensive_line_height` excluded and renormalized, no
  player-side proxy exists), the `fit_score / value_percentile` undervaluation formula, JWKS-
  based JWT auth with a real `profiles.role='admin'` check, Pydantic validation matching
  `docs/api-spec.yaml` exactly, and rate limiting (slowapi). 61/61 tests passing (44 unit + 17
  integration against a real local Supabase and real Supabase Auth test users), 93% coverage,
  100% on the scoring modules, ruff/mypy clean. Manually smoke-tested end to end against the
  golden seed dataset. Event-driven recompute (the `recompute-fit-scores` Edge Function) was
  Phase 5 at the time — this pass's admin route recomputed synchronously in-request instead;
  see Phase 5 below for the switch to the event-driven design.
- Phase 4: **done** — `frontend/` implements the React SPA: Vite + TypeScript + TailwindCSS
  (design tokens from the Frontend Design Doc §3), React Router v6 with URL-driven filter/sort
  state, TanStack Query against PostgREST (direct reads) and the Phase 3 FastAPI service
  (recommendations, fit-breakdown, admin writes), and Chart.js (`react-chartjs-2`) for
  RadarChart/FitValueScatter/ValuationTrendChart, each with an accessible data-table fallback.
  All 10 catalogued components built (atoms → molecules → organisms → pages), plus Home, Club
  Detail, Player Detail, Comparison (`localStorage`-backed, no backend shortlist table),
  Login, and the admin area (Pipeline Runs with Supabase Realtime, Tactical Profiles with a
  confirm-before-recompute weight editor, and a read-only Users list — see decisions below).
  139/139 tests passing (Vitest + RTL + MSW), 93% overall coverage, 100% on `lib/`
  chart/data-transform utilities, ruff-equivalent (eslint) and tsc clean.
- Phase 5: **done** — `supabase/functions/` implements all three Edge Functions.
  `recompute-fit-scores` makes UC-5 genuinely event-driven: `POST /admin/tactical-profiles/
  {club_id}/weightings` now only writes the new `tactical_profile` version and returns
  `recompute_status: "enqueued"`; a `pg_net`-based Postgres trigger on that INSERT calls the
  function, which calls a new internal FastAPI route (`POST /internal/tactical-profiles/
  recompute`, shared-secret authenticated) that reuses Phase 3's `recompute_club()` unchanged.
  `generate-export` adds the private Storage bucket + signed-URL mechanism the ADD describes
  (CSV only, per the confirmed decision) as an additive second action on `ExportButton`
  alongside Phase 4's still-default client-side download. `pipeline-webhook` is the job-level
  failure fallback for `etl-schedule.yml` runs the Python script itself never reaches. A real
  bug found while wiring this — `POST /admin/pipeline/trigger`'s `pipeline_run` row was never
  correlated with the run GitHub Actions actually created, permanently orphaning it — was fixed
  as part of this phase (`run_id` now threaded through the dispatch call end to end).
- Phase 6: **done** — the final build phase. `e2e/` (Playwright) covers E2E-01..05 (mapped 1:1
  to UC-1..UC-5) plus an axe-core accessibility pass (Home/Club Detail/Player Detail/Comparison,
  zero serious/critical violations) and a keyboard-only smoke test, run on both a desktop and a
  Pixel 5 mobile viewport project. `perf/k6/` covers dashboard-load and fit-computation against
  the local ephemeral stack (no staging project exists — confirmed decision) plus a non-k6
  pipeline-duration budget check. `api/app/rate_limit.py` (SEC-004) replaces `slowapi`, which
  Phase 6 found was silently non-functional against the FastAPI version already in use.
  `CORSMiddleware` was added — a second real gap Phase 6's browser-based E2E suite caught that
  no earlier test tier could, since CORS is only enforced by real browsers. `.github/
  dependabot.yml` covers dependency scanning (the Testing Documentation's explicitly accepted
  alternative to a custom `pip-audit`/`npm audit` job). CI gained `e2e-smoke` (required PR
  check, desktop only) plus `e2e-nightly.yml`/`perf-nightly.yml` (full suite + both viewports,
  nightly, non-blocking). Five real, previously-shipped bugs were found and fixed by this
  phase's browser-based testing — none of them were catchable by any earlier test tier: rate
  limiting silently disabled since Phase 3, CORS never configured since Phase 3/4, an
  `AuthContext` async race since Phase 4, a `ProfileWeightEditor` stale-state bug since Phase
  4/5, and a missing `GenerateExportResponse` type (a real `tsc` failure caught only while
  verifying the lint/type CI gates actually fail on violations, not by any existing test).

## Traceability

Every phase's exit criteria trace back to CLAUDE.md §10 (testing strategy) and §16
(definition of done) — no phase is considered complete on "compiles" alone.
