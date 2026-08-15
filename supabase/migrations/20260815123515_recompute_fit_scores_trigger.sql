-- Phase 5: event-driven fit-score recompute (ADD §5.3, UC-5). POST /admin/tactical-profiles/
-- {club_id}/weightings now only writes the new tactical_profile row and returns
-- recompute_status: "enqueued" — this trigger is what actually kicks off the recompute, via
-- pg_net calling the recompute-fit-scores Edge Function, which in turn calls
-- POST /internal/tactical-profiles/recompute (api/app/routers/internal.py).
--
-- The Edge Function base URL and service-role key are deliberately NOT hardcoded here (they
-- differ between local/staging/prod and the service-role key is a secret). An earlier version
-- of this migration read them from `current_setting('app.*')` GUCs set via
-- `alter database ... set ...` — verified locally to fail, since Supabase's own `postgres`
-- role is NOT a superuser (`rolsuper = false`) even locally, and lacks privilege to set
-- unrecognized custom GUC classes at the database level. Supabase Vault
-- (`vault.create_secret` / `vault.decrypted_secrets`, the `supabase_vault` extension — already
-- installed by the local stack) is the actually-supported mechanism for this, and is what real
-- Supabase docs use for exactly this "call an Edge Function from a trigger" pattern. See
-- docs/runbook.md's "One-time Database Webhook setup" section for the exact
-- `select vault.create_secret(...)` commands.
create extension if not exists pg_net;

create or replace function public.notify_recompute_fit_scores()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'edge_function_base_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if base_url is null or service_key is null then
    -- Vault secrets not configured yet in this environment (e.g. a fresh db before the
    -- one-time setup step) — skip rather than error, so migrations/seed still apply cleanly.
    return new;
  end if;

  perform net.http_post(
    url := base_url || '/functions/v1/recompute-fit-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'club_id', new.club_id,
      'profile_version', new.version,
      'weightings', new.weightings
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

-- Fires once per new *current* profile version — the meaningful event, not the accompanying
-- UPDATE that flips the previous version's is_current to false (see admin.py's
-- update_weightings: UPDATE old row is_current=false, then INSERT the new current row).
create trigger recompute_fit_scores_on_profile_change
  after insert on public.tactical_profile
  for each row
  when (new.is_current)
  execute function public.notify_recompute_fit_scores();
