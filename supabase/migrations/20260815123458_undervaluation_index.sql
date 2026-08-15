create table public.undervaluation_index (
  index_id      uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.player(player_id) on delete cascade,
  club_id       uuid not null references public.club(club_id) on delete cascade,
  fit_score_id  uuid not null references public.fit_score(fit_score_id) on delete cascade,
  index_value   numeric(8,4) not null,
  recommended   boolean not null default false,
  computed_at   timestamptz not null default now()
);

create index undervaluation_index_club_idx on public.undervaluation_index (club_id, index_value desc);

alter table public.undervaluation_index enable row level security;

grant select on public.undervaluation_index to anon, authenticated;

create policy "undervaluation_index_public_read"
  on public.undervaluation_index for select
  to anon, authenticated
  using (true);
