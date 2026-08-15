create table public.player (
  player_id     uuid primary key default gen_random_uuid(),
  full_name     text not null,
  date_of_birth date,
  nationality   text,
  position      text not null check (
    position in ('GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST')
  ),
  current_club  text,
  source_ids    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index player_position_idx on public.player (position);
create index player_source_ids_gin on public.player using gin (source_ids);

create trigger set_player_updated_at
  before update on public.player
  for each row execute function public.set_updated_at();

alter table public.player enable row level security;

grant select on public.player to anon, authenticated;

create policy "player_public_read"
  on public.player for select
  to anon, authenticated
  using (true);

-- No anon/authenticated write policy: players are ETL-loaded via service_role only.
