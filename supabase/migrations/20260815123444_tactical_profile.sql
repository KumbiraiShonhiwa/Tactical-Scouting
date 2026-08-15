create table public.tactical_profile (
  profile_id     uuid primary key default gen_random_uuid(),
  club_id        uuid not null references public.club(club_id) on delete restrict,
  version        int not null,
  weightings     jsonb not null default '{}'::jsonb,
  effective_date date not null default current_date,
  is_current     boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (club_id, version)
);

create trigger set_tactical_profile_updated_at
  before update on public.tactical_profile
  for each row execute function public.set_updated_at();

-- Exactly one "current" profile version per club (TP-04 reproducibility depends on this).
create unique index tactical_profile_current_uq
  on public.tactical_profile (club_id)
  where is_current;

alter table public.tactical_profile enable row level security;

grant select on public.tactical_profile to anon, authenticated;
grant insert, update on public.tactical_profile to authenticated;

-- Public read (AD-02): every version is readable, not just current, so historical fit
-- scores that reference an older profile_version remain fully explainable.
create policy "tactical_profile_public_read"
  on public.tactical_profile for select
  to anon, authenticated
  using (true);

-- Admin-only write (TP-02, UC-5).
create policy "tactical_profile_admin_write"
  on public.tactical_profile for insert
  to authenticated
  with check (public.is_admin());

create policy "tactical_profile_admin_update"
  on public.tactical_profile for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
