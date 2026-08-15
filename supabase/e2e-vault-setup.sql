-- One-time-per-ephemeral-stack Vault setup for local dev and CI (E2E, Phase 6). Enables the
-- Phase 5 recompute-fit-scores trigger chain (see supabase/migrations/
-- 20260815123515_recompute_fit_scores_trigger.sql and docs/runbook.md §8) so E2E-05 (UC-5) can
-- exercise the real async recompute, not just the synchronous parts of the UI.
--
-- Uses Supabase's well-known LOCAL-DEV-ONLY default demo service_role key — identical across
-- every `supabase start` on every machine, documented in Supabase's own CLI output, not a
-- secret of this project (same key already used in api/tests/integration/conftest.py and
-- e2e/test-users.ts). NEVER run the literal values in this file against a real project.
-- Idempotent: delete-then-create rather than assuming a unique constraint on vault.secrets.name
-- (there isn't one), so re-running this script locally without a full `supabase db reset`
-- doesn't create a second, ambiguous row the trigger's `where name = '...'` lookup would trip
-- over.
delete from vault.secrets where name in ('edge_function_base_url', 'service_role_key');

select vault.create_secret('http://kong:8000', 'edge_function_base_url');
select vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  'service_role_key'
);
