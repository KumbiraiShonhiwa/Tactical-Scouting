# Environment & Secrets Reference

Every environment variable / CI secret used by the platform, which service consumes it, and
which environment(s) it is scoped to. **No real values appear in this document or in any
`.env.example` file** — placeholders only, per CLAUDE.md §3 and ADD §4.3.

`Tactical-Scouting_Prerequisites.md` (repo root, gitignored) currently holds the real values
for local reference; it must never be committed. See the final report for a credential
rotation recommendation — those values have already been shared in an AI coding session and
should be treated as if they may have leaked.

## Supabase project

| Variable | Consumed by | Scope | Frontend-safe? |
|---|---|---|---|
| `SUPABASE_URL` | frontend, api, etl (loader) | all | ✅ yes |
| `SUPABASE_ANON_KEY` | frontend | all | ✅ yes — RLS, not key secrecy, restricts `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | etl (loader), api (admin routes), Edge Functions | server/CI only | ❌ **never** — full RLS bypass |
| `SUPABASE_DB_URL` | api (direct/session-mode connection), CI (pgTAP) | server/CI only | ❌ never |
| `SUPABASE_JWT_SECRET` or JWKS URL | api (JWT verification) | server/CI only | ❌ never (JWKS URL itself is public, but pin via env for testability) |
| `SUPABASE_ACCESS_TOKEN` | CI (`supabase db push`), GitHub Actions | CI only | ❌ never |
| `SUPABASE_PROJECT_REF` | CI, admin route (`/admin/pipeline/trigger` dispatch context) | CI, server | ✅ ref itself is not secret, but keep out of frontend bundle for tidiness |

## Frontend (Vite — must be prefixed `VITE_` to be bundled)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_BASE_URL` | FastAPI service base URL (e.g. Render deploy URL) |

See `frontend/.env.example`.

## FastAPI analysis service

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | admin-route DB writes, Supabase Admin API calls |
| `SUPABASE_DB_URL` | direct/session-mode Postgres connection (Supavisor session mode) |
| `SUPABASE_JWKS_URL` | JWT verification |
| `RATE_LIMIT_PER_MINUTE` | fixed-window rate limiter config for public endpoints (3.2.4) — `app/rate_limit.py`, a small in-house dependency, not slowapi (removed in Phase 6; see that file's docstring for why) |
| `CORS_ALLOWED_ORIGINS` (Phase 6) | comma-separated list of browser origins allowed to call this API — e.g. `http://localhost:5173,http://localhost:4173` locally, the deployed frontend's real origin in production. Without this, every real-browser request fails at the CORS preflight (a real bug the Phase 6 E2E suite caught — see `app/main.py`'s comment) |
| `GITHUB_TOKEN` | repo-scoped PAT, used only by `/admin/pipeline/trigger` to dispatch `etl-schedule.yml` |
| `GITHUB_REPO` | `owner/repo` for the dispatch call |
| `INTERNAL_FUNCTION_SECRET` (Phase 5) | shared secret checked by `POST /internal/tactical-profiles/recompute` — service-to-service auth for the recompute-fit-scores Edge Function, not a user JWT |

See `api/.env.example`.

## ETL (GitHub Actions `etl-schedule.yml`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | loader writes (staging → atomic swap) |
| `PIPELINE_WEBHOOK_URL` (Phase 5) | pipeline-webhook Edge Function endpoint — only called on a job-level failure `run_pipeline.py` itself never reached (see the workflow's "Notify pipeline-webhook on job-level failure" step); the script's own success/failure paths write `pipeline_run` directly |
| `PIPELINE_WEBHOOK_SECRET` (Phase 5) | shared secret sent as `X-Webhook-Secret`, checked by the pipeline-webhook function |
| Per-source scraper config (User-Agent string, rate-limit interval) | not secret; lives in `etl/scrapers/config.py`, not env vars |

## Edge Functions (Phase 5 — `supabase/functions/.env`, auto-loaded by `supabase start`)

| Variable | Consumed by | Purpose |
|---|---|---|
| `SUPABASE_URL` | pipeline-webhook, generate-export | injected automatically; resolves to the *internal* Docker-network address (e.g. `http://kong:8000` locally) — correct for this function's own server-to-server PostgREST/Storage calls, not reachable from a browser |
| `PUBLIC_SUPABASE_URL` | generate-export | browser-reachable base used only when constructing the signed URL returned to the caller — locally the host-exposed `API_URL` from `supabase start`'s output; same value as `SUPABASE_URL` in production |
| `SUPABASE_SERVICE_ROLE_KEY` | pipeline-webhook, generate-export | direct PostgREST/Storage writes, bypassing RLS (never exposed to a caller) |
| `API_BASE_URL` | recompute-fit-scores, generate-export | the FastAPI service's base URL |
| `INTERNAL_FUNCTION_SECRET` | recompute-fit-scores | must match the FastAPI service's `INTERNAL_FUNCTION_SECRET` |
| `PIPELINE_WEBHOOK_SECRET` | pipeline-webhook | must match `etl-schedule.yml`'s `PIPELINE_WEBHOOK_SECRET` |

See `supabase/functions/.env.example`.

## Supabase Vault secrets (Phase 5 — set once per environment, NOT via a migration or env file)

The `recompute_fit_scores_on_profile_change` trigger (`supabase/migrations/
20260815123515_recompute_fit_scores_trigger.sql`) reads the Edge Function base URL and the
service-role key from Supabase Vault (`vault.decrypted_secrets`) rather than a hardcoded value,
since both differ per environment and the key is a secret. A GUC-based approach
(`alter database ... set app.*`) was tried first and doesn't work — Supabase's `postgres` role
isn't a superuser, even locally, and can't set unrecognized custom GUC classes. See
`docs/runbook.md`'s "One-time Database Webhook setup" section for the exact commands.

| Vault secret `name` | Purpose |
|---|---|
| `edge_function_base_url` | the **internal** Docker-network address locally (`http://kong:8000`, not `127.0.0.1:54321`) — the trigger appends `/functions/v1/recompute-fit-scores` itself; the deployed project's URL in staging/prod |
| `service_role_key` | same value as `SUPABASE_SERVICE_ROLE_KEY` above |

## GitHub Actions encrypted secrets (repo settings, not committed anywhere)

| Secret | Used by workflow |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | `deploy-migrations.yml` |
| `SUPABASE_PROJECT_REF` | `deploy-migrations.yml`, `deploy-backend.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | `etl-schedule.yml` |
| `SUPABASE_DB_URL` (staging) | `test-and-lint.yml` integration-test job |
| `RENDER_DEPLOY_TOKEN` | `deploy-backend.yml` |
| `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` | frontend deploy step (if not using Netlify's own GitHub integration) |
| `GITHUB_TOKEN` (auto-provided) | `pipeline-webhook` dispatch, `etl-schedule.yml` manual-dispatch handling |
| `PIPELINE_WEBHOOK_URL`, `PIPELINE_WEBHOOK_SECRET` (Phase 5) | `etl-schedule.yml`'s job-level-failure notification step |

## Rules (CLAUDE.md §3, restated here for this doc's own audience)

1. `service_role` never appears in frontend code, browser network tab, or logs.
2. Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` (as `VITE_*`) are frontend-bundled.
3. Secrets are injected via GitHub Actions encrypted secrets or the host platform's
   environment-variable UI (Render, Netlify) — never hard-coded, never committed.
4. `.env`, `.env.local`, and `Tactical-Scouting_Prerequisites.md` are gitignored (see
   `.gitignore`); only `.env.example` files (placeholders) are committed.
