-- Phase 5 wiring checks (pgTAP): the pg_net-based recompute trigger and the private exports
-- Storage bucket exist and are shaped as the migrations intend.
begin;
select plan(8);

-- pg_net extension enabled (recompute-fit-scores trigger depends on it).
select ok(
  exists (select 1 from pg_extension where extname = 'pg_net'),
  'pg_net extension is installed'
);

-- Trigger function exists, is a trigger function.
select ok(
  exists (
    select 1 from pg_proc
    where proname = 'notify_recompute_fit_scores' and pronamespace = 'public'::regnamespace
  ),
  'public.notify_recompute_fit_scores() exists'
);

-- Trigger is attached to tactical_profile, AFTER INSERT.
select ok(
  exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'public.tactical_profile'::regclass
      and p.proname = 'notify_recompute_fit_scores'
      and t.tgtype & 2 = 0   -- BEFORE bit (value 2) unset -> AFTER
      and t.tgtype & 1 = 1   -- ROW bit (value 1) set -> per-row (not statement)
      and t.tgtype & 4 = 4   -- INSERT bit (value 4) set
  ),
  'recompute_fit_scores_on_profile_change fires AFTER INSERT, per-row, on tactical_profile'
);

-- Inserting a new current profile version doesn't error even with no Vault secrets configured
-- (the trigger function's graceful no-op path — see the migration's comment) — proves the
-- trigger doesn't break the normal admin-write flow in an environment before the one-time
-- Vault setup.
select lives_ok(
  $$ update public.tactical_profile set is_current = false
     where club_id = 'c1111111-1111-1111-1111-111111111111' and is_current;
     insert into public.tactical_profile (club_id, version, weightings, is_current)
     values ('c1111111-1111-1111-1111-111111111111', 99, '{}'::jsonb, true) $$,
  'inserting a new current tactical_profile version does not error with no Vault secrets configured'
);

-- exports Storage bucket exists and is private (ADD §5.4: never a public bucket).
select ok(
  exists (select 1 from storage.buckets where id = 'exports'),
  'exports Storage bucket exists'
);
select ok(
  (select public from storage.buckets where id = 'exports') = false,
  'exports Storage bucket is private'
);

-- No anon/authenticated policies exist on storage.objects — only the service-role client
-- (which bypasses RLS entirely) ever touches the exports bucket, per the ADD.
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (roles && array['anon', 'authenticated']::name[])
  ),
  'no anon/authenticated RLS policies exist on storage.objects'
);

-- Real bug found during manual verification: service_role has rolbypassrls=true but RLS
-- bypass is a separate authorization layer from table GRANTs — PostgREST calls made with the
-- service_role key (pipeline-webhook's UPDATE) still need explicit privileges. Every earlier
-- phase's server code connects directly as the postgres superuser, which never exercised this
-- path. See the Phase 5 grant migration's comment for the full story.
select ok(
  exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'service_role' and table_schema = 'public' and table_name = 'pipeline_run'
      and privilege_type = 'UPDATE'
  ),
  'service_role has UPDATE on public.pipeline_run (needed by pipeline-webhook via PostgREST)'
);

select * from finish();
rollback;
