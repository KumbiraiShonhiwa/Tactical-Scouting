# Runbook / Deployment Guide

Step-by-step operational procedures. Addresses the gap ADD §9.1 names but doesn't resolve:
"Supabase's free tier pauses inactive projects... a known risk to 95% uptime."

## 1. Supabase project — already provisioned

Project ref `sndsdeionjrovezotwub` is already created (per
`Tactical-Scouting_Prerequisites.md`, gitignored). If a second project is ever needed
(e.g. a genuinely separate staging project rather than a branch of production):

1. https://supabase.com/dashboard → New Project → choose org, region close to the target
   users (EU, since this is a Premier League/UK-focused dataset), set a strong DB password.
2. Record the project ref, URL, anon key, and service_role key into a local-only secrets
   store (password manager, or a gitignored file) — never into a tracked file.
3. `supabase login` (CLI) → `supabase link --project-ref <ref>` from the repo root.

## 2. First migration push

```bash
supabase db push          # applies every file under supabase/migrations/ to the linked project
supabase db push --dry-run   # preview without applying, if unsure
```

Never use the Supabase dashboard SQL editor to make a change that isn't also captured as a
migration file — the editor is inspection-only (CLAUDE.md §4).

## 3. Seeding

`supabase/seed.sql` is applied automatically by `supabase db reset` locally and by CI, but is
**not** auto-applied to a hosted project by `db push`. To seed a staging project (never
production, per CLAUDE.md §11):

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

## 4. First ETL run

1. Ensure GitHub Actions secrets are set (see `docs/environment-and-secrets.md`):
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `PIPELINE_WEBHOOK_URL`, `PIPELINE_WEBHOOK_SECRET`.
2. Trigger `etl-schedule.yml` manually: GitHub → Actions → "ETL Schedule" → Run workflow
   (workflow_dispatch), or via the admin UI once `/admin/pipeline/trigger` exists (Phase 3).
3. Watch `pipeline_run` for a new row (`status: running` → `success`/`partial_failure`/`failure`).
4. On failure, check `error_log` on the `pipeline_run` row and `private.quarantine` for
   rejected records before re-running — the atomic-swap design (ADD §5.1) guarantees the
   previously published data is untouched, so a failed run is safe to retry.

## 5. First admin user

1. Create the user via Supabase Auth (dashboard → Authentication → Add User, or the Admin
   API) with a real or `@example.test` email depending on environment.
2. Insert/update the corresponding `public.profiles` row:
   ```sql
   update public.profiles set role = 'admin' where id = '<the new user''s auth.users id>';
   ```
   (A trigger on `auth.users` insert, added in the Phase 1 migrations, auto-creates the
   `profiles` row with `role = 'standard'` by default — this step only needs to flip the role.)
3. Verify: sign in via the frontend `/login` route, confirm the Admin nav link appears and
   `/admin/*` routes are reachable.

## 6. Un-pausing a paused free-tier project

Supabase pauses free-tier projects after a period of inactivity (ADD §9.1). To resume:

1. Supabase dashboard → the paused project shows a "Restore" / "Unpause" banner — click it.
   Restore typically takes a few minutes; all data is preserved (this is a compute pause, not
   a deletion).
2. Once restored, verify `supabase status` (if linked locally) or hit `/health` on the
   FastAPI service (which itself queries Supabase) to confirm connectivity.
3. **Mitigation going forward**: add a scheduled GitHub Actions workflow that pings `/health`
   (or a trivial PostgREST `select 1`-equivalent) on a cadence shorter than the free-tier
   inactivity window, so the project never pauses during active portfolio review. This is
   listed as a follow-up for Phase 6 (CI hardening) — not yet implemented as of this document.

## 7. Rotating the service_role key or DB password

1. Supabase dashboard → Project Settings → API (for service_role) or Database (for password)
   → Reset/regenerate.
2. Update the value everywhere it's injected: GitHub Actions secrets
   (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`), Render environment variables (FastAPI
   service), and any local `.env` files (not committed, so no repo change needed).
3. Old key stops working immediately — coordinate during a low-traffic window if this is a
   production project with real users (not a concern yet at this project's stage, but worth
   noting for future reference).

## 8. One-time Database Webhook setup (Phase 5)

The `recompute_fit_scores_on_profile_change` trigger (`supabase/migrations/
20260815123515_recompute_fit_scores_trigger.sql`) reads the Edge Function base URL and the
service-role key from **Supabase Vault** (`vault.create_secret` / `vault.decrypted_secrets`,
the `supabase_vault` extension — already installed by the local stack) rather than a value
baked into the migration (both differ per environment, and the key is a secret — never
committed). An earlier draft of this used `alter database ... set app.*` GUCs instead — that
was tried and found not to work: Supabase's own `postgres` role is **not** a superuser
(confirmed locally via `select rolsuper from pg_roles where rolname='postgres'` →  `false`)
and can't set unrecognized custom GUC classes at the database level. Vault is the
Supabase-documented mechanism for exactly this "call an Edge Function from a trigger" pattern.

Run once per environment, after `supabase db push`/`db reset` and after the Edge Functions are
deployed (connected as the project's `postgres` user — Vault access doesn't require
superuser):

```sql
select vault.create_secret('<your project's URL, e.g. https://<ref>.supabase.co>', 'edge_function_base_url');
select vault.create_secret('<the real service_role key>', 'service_role_key');
```

Locally (`supabase start`), the equivalent is:

```sql
select vault.create_secret('http://kong:8000', 'edge_function_base_url');
select vault.create_secret('<the local demo service_role key from `supabase start`'s output>', 'service_role_key');
```

(`http://kong:8000` is the internal Docker-network address the edge-runtime container needs —
not `127.0.0.1:54321`, which isn't reachable from inside another container. See
`app/routers/internal.py`'s note and `supabase/functions/generate-export/index.ts` for the
same internal-vs-public-URL distinction, which cost a real debugging pass to find.)

Until this is run, the trigger fires but no-ops silently (see the migration's comment) — schema
and seed data still apply cleanly, but tactical-profile edits won't trigger a recompute. Verify
it worked: update a club's weightings via `POST /admin/tactical-profiles/{club_id}/weightings`,
then check `public.fit_score` for a new `profile_version` row appearing shortly after (not in
the same request/response — the recompute is asynchronous). Confirmed working end to end
locally on 2026-08-15 — see `.claude/PROJECT_STATUS.md`'s Phase 5 entry.

To rotate either secret later: `select vault.update_secret('<secret id from vault.secrets>',
'<new value>');` rather than `create_secret` again (which would create a second row with the
same `name`, and the trigger's `where name = '...'` lookup would become ambiguous).

## 9. Deploying Edge Functions

```bash
supabase functions deploy recompute-fit-scores
supabase functions deploy generate-export
supabase functions deploy pipeline-webhook
supabase secrets set API_BASE_URL=<the deployed FastAPI service's URL>
supabase secrets set INTERNAL_FUNCTION_SECRET=<matching api/'s INTERNAL_FUNCTION_SECRET>
supabase secrets set PIPELINE_WEBHOOK_SECRET=<matching etl-schedule.yml's PIPELINE_WEBHOOK_SECRET>
```

`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are provided automatically to deployed functions —
no `secrets set` needed for those two. Not yet done as of this document (no function has been
deployed to a real project — see `.claude/PROJECT_STATUS.md`'s Phase 5 entry).

## 10. Running the Phase 6 E2E and perf suites locally

Playwright and k6 both need the full local stack (Supabase + the FastAPI service + the frontend
production build) up first — they hit real HTTP, never mocks.

```bash
supabase start
supabase db reset
psql "$SUPABASE_DB_URL" -f supabase/e2e-vault-setup.sql   # required for E2E-05's recompute chain

cd api
set -a; source .env; set +a
python e2e_server.py &          # e2e_server.py stubs the real GitHub dispatch call — see its docstring

cd ../e2e
npm install
npx playwright install --with-deps chromium
npm run test:full                # both projects: chromium-smoke (desktop) + mobile (Pixel 5)
# npm run test:smoke             # desktop only, matches the e2e-smoke CI gate
```

`e2e/playwright.config.ts`'s `webServer` starts `frontend`'s `npm run build && npm run preview`
itself on port 4173 if nothing is already listening there — `BASE_URL` deliberately uses
`localhost`, not `127.0.0.1`: Vite's `preview` server binds IPv6 loopback only on some machines,
and `127.0.0.1` silently connection-refuses in that case (a real gap this phase found while
first standing up the suite).

A `supabase db reset` between local E2E runs is recommended if running the suite repeatedly by
hand: `e2e-04`/`e2e-05` create real `pipeline_run`/`tactical_profile`/`fit_score` rows (E2E-05
restores its own via a `finally` block; E2E-04's admin-triggered run does not get cleaned up).
This only matters for local manual reruns — each CI job gets its own fresh ephemeral stack, so
there's no cross-run drift there.

k6 needs a `k6` binary — not installable in every local environment (this one included); the
official Docker image is a working substitute:

```bash
docker run --rm -i -v "//c/path/to/repo/perf/k6:/scripts" \
  -e SUPABASE_URL=http://host.docker.internal:54321 \
  grafana/k6 run /scripts/dashboard-load.js

docker run --rm -i -v "//c/path/to/repo/perf/k6:/scripts" \
  -e API_BASE_URL=http://host.docker.internal:8000 \
  grafana/k6 run /scripts/fit-computation.js
```

`fit-computation.js` needs `RATE_LIMIT_PER_MINUTE` raised well above the SEC-004 production
default (60) on the API process it's hitting — 10 VUs sharing one source IP will otherwise get
crushed by the rate limiter almost immediately, measuring that instead of the scoring endpoint's
own latency (`perf-nightly.yml` already sets this; a local manual run needs the same override
when restarting `e2e_server.py`/`uvicorn`). The rate limiter's own behavior is covered separately
by `api/tests/integration/test_rate_limit.py`, run at the real default.

```bash
cd etl
SUPABASE_DB_URL="$SUPABASE_DB_URL" python ../perf/pipeline_duration_check.py
```
