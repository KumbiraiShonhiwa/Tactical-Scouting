# Tactical-Scouting — Claude Code Project Instructions

> **Before starting any work in this repo**, read `.claude/PROJECT_STATUS.md` — it's the
> up-to-date record of what has actually been built, verified, and decided across all
> completed phases, including decisions made along the way that aren't captured elsewhere.
> Update it whenever a phase completes or a significant decision is made.

## 1. Project identity

Tactical-Scouting is a six-team Premier League tactical-fit and undervaluation platform.

Authoritative project documents:
- Software Requirements Specification (SRS) v1.0
- Architecture Design Document (ADD) v1.0
- Frontend Design Document v1.0
- Automated Testing Documentation v1.0

When these instructions conflict with generic coding preferences, follow the project documents. Do not invent requirements that are not supported by them.

## 2. Architecture

The repository is deliberately separated into:

```text
supabase/
  migrations/
  seed.sql
  functions/

etl/
api/
frontend/
.github/workflows/
```

Architecture flow:

```text
Scheduled Python ETL
        |
        v
Supabase/Postgres
   |          |
   |          +--> PostgREST --> React SPA
   |
   +--> FastAPI + scikit-learn
   |
   +--> Edge Functions / Realtime / Storage
```

Use PostgREST directly from the frontend for simple RLS-protected reads. Use FastAPI for tactical-fit and undervaluation computation. Use Edge Functions for short event-triggered work such as recomputation and exports.

## 3. Non-negotiable security rules

1. RLS is the database-level authorization boundary.
2. Every public-schema table must have RLS enabled and explicit policies.
3. Never expose `service_role` to the browser.
4. Never commit secrets, database passwords, scraping credentials, or service-role keys.
5. Frontend code may contain only the Supabase URL and anon/public key.
6. Admin privilege checks should use the centralized `is_admin()` SQL function where appropriate.
7. Internal/staging tables belong in a non-exposed schema.
8. Use signed URLs for private export artifacts.
9. Do not bypass RLS by moving authorization logic into the frontend.
10. Never use production credentials or production data in automated tests.

## 4. Database rules

All schema changes MUST be versioned Supabase CLI migrations.

Never treat the Supabase dashboard SQL editor as the schema source of truth.

Use:
```bash
supabase migration new <name>
supabase db diff
supabase db reset
supabase db push
```

Standards:
- UUID primary keys.
- `created_at` and `updated_at` timestamptz.
- Trigger-maintained `updated_at`.
- `numeric` for scores and monetary values.
- `jsonb` only for genuinely variable-shape data.
- Deliberate indexes for dashboard filter/sort paths.
- Appropriate `ON DELETE RESTRICT` / `CASCADE`.
- Preserve historical fit-score and undervaluation versions.

## 5. ETL rules

ETL is a standalone Python component with:

```text
Extract -> Transform/Validate -> Load
```

Sources named in the architecture:
- FBref
- WhoScored
- Transfermarkt

The scraper layer must:
- respect robots.txt;
- be rate limited;
- use source-specific throttling/User-Agent handling;
- use public pages only;
- keep source attribution;
- never silently discard invalid records.

Invalid records go to `private.quarantine` with a reason.

Load validated data into staging, then perform an atomic swap/merge so a failed run cannot publish partial data.

Record every run in `pipeline_run`.

Automated tests must use recorded source fixtures, never live scraping.

## 6. Backend rules

FastAPI is the analysis service.

Use scikit-learn for tactical-fit / undervaluation computation as specified by the architecture.

FastAPI should verify Supabase-issued JWTs on authenticated routes rather than becoming a second identity provider.

Use structured error responses and validate request parameters with Pydantic.

Use rate limiting for public endpoints.

## 7. Frontend rules

The frontend is a React SPA using TailwindCSS and Chart.js/D3.

Use TanStack Query for server state.

Use URL query parameters for club/filter/sort state.

Do not duplicate components unnecessarily. Follow the atomic-design approach:

```text
atoms -> molecules -> organisms -> pages
```

Core components:
- RadarChart
- FitValueScatter
- RankedPlayerTable
- FilterBar
- ClubProfileCard
- PlayerStatsPanel
- ValuationTrendChart
- ProfileWeightEditor
- PipelineRunLog
- ExportButton

Every data-bearing component has:
- loading;
- populated;
- empty;
- error states.

Interactive controls need hover, focus-visible and disabled states.

Charts must be responsive and use ResizeObserver rather than fixed dimensions.

Charts must expose an accessible data-table fallback.

## 8. Design system

Use the project's documented palette and Tailwind conventions.

Primary:
- `#1F3864`
- `#0F766E`
- `#2E74B5`
- `#0F9D58`
- `#B45309`

Neutral:
- `#F7F9FB`
- `#EEF2F6`
- `#4B5563`
- `#111827`

Use system-first typography with Inter/ui-sans-serif fallback.

Use the documented 12/14/16/20/24/32px scale and 4px spacing unit.

Do not introduce arbitrary one-off colors, font sizes, spacing or component styles without a documented reason.

## 9. Accessibility

Baseline target: WCAG 2.1 AA.

Requirements:
- keyboard-operable primary controls;
- visible focus states;
- color is never the only signal;
- descriptive labels/aria-labels;
- accessible chart fallbacks;
- axe-core checks in E2E;
- keyboard-navigation smoke tests.

## 10. Testing strategy

Testing pyramid:

```text
Unit:
  pytest + pytest-mock
  Vitest + React Testing Library

Integration:
  pytest + httpx
  pgTAP
  local Supabase CLI stack

E2E:
  Playwright

Non-functional:
  k6/Locust
  pgTAP/RLS-bypass tests
  data-quality checks
  axe-core
```

Use deterministic fixtures.

Never live-scrape upstream sites during tests.

Required E2E journeys:
- UC-1 Browse Tactical Fit Recommendations
- UC-2 Identify Undervalued Players
- UC-3 Compare Two Players
- UC-4 Refresh Data Pipeline
- UC-5 Update a Club's Tactical Profile

Quality gates:
- backend coverage >= 80% overall;
- scoring/validation >= 90%;
- frontend components >= 70%;
- chart/data-transform utilities 100%;
- every RLS policy has positive and negative tests;
- zero ruff/mypy/eslint/tsc errors;
- five E2E smoke tests pass.

The coverage figures are the documented starting thresholds and should not be silently changed.

## 11. Test data

Use:
- `supabase/seed.sql` for the shared golden dataset;
- recorded scraper fixtures under `etl/tests/fixtures/`;
- synthetic test users using `@example.test`;
- test credentials created and removed per run.

Never use real secrets or personal data in tests.

## 12. Performance targets

Design and test against the documented targets:
- dashboard load: 3 seconds;
- fit computation: 2 seconds;
- ETL six-club refresh: 2 hours;
- approximately 2,000-player dataset;
- approximately 500-player filtered scoring pool.

Use pre-aggregated views/materialized views and deliberate indexes where specified.

## 13. CI/CD

The architecture specifies:
- `test-and-lint.yml`
- `deploy-migrations.yml`
- `deploy-backend.yml`
- `etl-schedule.yml`

PRs should gate merges with lint, unit, database/RLS, integration and E2E smoke tests.

Nightly jobs handle full E2E/accessibility and performance.

Never weaken a failing CI gate merely to get a green build.

## 14. Change protocol

Before making a substantial change:

1. Inspect the relevant code.
2. Identify which project requirement/design component is affected.
3. Read the relevant skill.
4. Prefer the smallest safe change.
5. Add/update tests.
6. Run the narrowest relevant tests first.
7. Run broader validation before declaring completion.
8. Explain migrations, security implications and test results.

Do not perform unrelated refactors during feature work.

## 15. Architecture decision discipline

If a requested implementation conflicts with the architecture:
- identify the conflict;
- explain the consequence;
- propose the smallest compliant alternative;
- only diverge when explicitly approved.

Open design questions documented by the ADD must remain treated as open decisions, not silently resolved.

## 16. Definition of done

A feature is not done when it merely compiles.

It is done when:
- implementation follows the architecture;
- types/lint pass;
- relevant unit tests pass;
- integration/RLS tests are updated when relevant;
- E2E coverage is added for a user journey when relevant;
- accessibility is covered for UI work;
- migrations are reproducible;
- secrets are protected;
- documentation/comments explain non-obvious decisions;
- no unrelated regressions are introduced.
