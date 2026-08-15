create table public.pipeline_run (
  run_id             uuid primary key default gen_random_uuid(),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  status             text not null default 'queued'
                        check (status in ('queued', 'running', 'success', 'partial_failure', 'failure')),
  records_processed  int,
  error_log          text,
  triggered_by       text not null default 'schedule' check (triggered_by in ('schedule', 'admin')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index pipeline_run_started_at_idx on public.pipeline_run (started_at desc);

create trigger set_pipeline_run_updated_at
  before update on public.pipeline_run
  for each row execute function public.set_updated_at();

alter table public.pipeline_run enable row level security;

grant select on public.pipeline_run to anon, authenticated;
grant insert on public.pipeline_run to authenticated;

-- Admin-only read (AD-03) — not public, unlike every other table above.
create policy "pipeline_run_admin_read"
  on public.pipeline_run for select
  to authenticated
  using (public.is_admin());

-- No anon/authenticated write policy: pipeline_run rows are written by the ETL loader and
-- the pipeline-webhook Edge Function via service_role only.
