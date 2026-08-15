-- Column list per docs/data-dictionary.md's flagged decision: the SRS does not enumerate
-- PlayerStatistics fields, so this is a concrete proposal pending project-owner confirmation
-- before Phase 2 (ETL) starts writing to it.
create table public.player_statistics (
  stat_id                      uuid primary key default gen_random_uuid(),
  player_id                    uuid not null references public.player(player_id) on delete cascade,
  season                       text not null,
  minutes_played               int not null check (minutes_played >= 0),
  appearances                  int check (appearances >= 0),
  possession_involvement_pct   numeric(5,2),
  passes_completed_per90       numeric(6,2),
  pass_completion_pct          numeric(5,2),
  progressive_passes_per90     numeric(6,2),
  progressive_carries_per90    numeric(6,2),
  defensive_actions_per90      numeric(6,2),
  pressures_per90              numeric(6,2),
  tackles_won_per90            numeric(6,2),
  interceptions_per90          numeric(6,2),
  crosses_per90                numeric(6,2),
  goals_per90                  numeric(6,2),
  assists_per90                numeric(6,2),
  expected_goals_per90         numeric(6,2),
  expected_assists_per90       numeric(6,2),
  data_source                  text not null check (data_source in ('fbref', 'footystats', 'whoscored', 'transfermarkt')),
  retrieved_at                 timestamptz not null default now(),
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  unique (player_id, season, data_source)
);

create index player_statistics_player_season_idx on public.player_statistics (player_id, season);

create trigger set_player_statistics_updated_at
  before update on public.player_statistics
  for each row execute function public.set_updated_at();

alter table public.player_statistics enable row level security;

grant select on public.player_statistics to anon, authenticated;

create policy "player_statistics_public_read"
  on public.player_statistics for select
  to anon, authenticated
  using (true);
