-- private schema: excluded from supabase/config.toml's [api].schemas list (and the
-- equivalent hosted-project "exposed schemas" setting), so this is unreachable via
-- PostgREST by construction, not convention (ADD 3.2, section 8).
create schema if not exists private;

create table private.quarantine (
  quarantine_id   uuid primary key default gen_random_uuid(),
  source_table    text not null,
  raw_record      jsonb not null,
  reason          text not null,
  data_source     text not null,
  quarantined_at  timestamptz not null default now(),
  pipeline_run_id uuid references public.pipeline_run(run_id) on delete set null
);

create index quarantine_pipeline_run_idx on private.quarantine (pipeline_run_id);

-- RLS enabled even though the schema isn't exposed, for defense in depth: if the exposed-
-- schema setting is ever misconfigured, this table still grants nothing to anon/authenticated.
alter table private.quarantine enable row level security;

-- Intentionally no policies: only service_role (which bypasses RLS entirely) can read/write.
