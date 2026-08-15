create table public.club (
  club_id    uuid primary key default gen_random_uuid(),
  name       text not null unique,
  league     text not null default 'Premier League',
  crest_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_club_updated_at
  before update on public.club
  for each row execute function public.set_updated_at();

alter table public.club enable row level security;

-- Postgres requires both a table-level GRANT and an RLS policy — the GRANT is the coarse
-- gate, the policy is the row-level filter within it.
grant select on public.club to anon, authenticated;

-- Public read (AD-02): anon and authenticated can both browse the six clubs.
create policy "club_public_read"
  on public.club for select
  to anon, authenticated
  using (true);

-- No anon/authenticated write policy is defined at all, so INSERT/UPDATE/DELETE from those
-- roles is rejected by RLS's default-deny (club rows are seeded/managed via service_role,
-- not edited through the public API in this release).
