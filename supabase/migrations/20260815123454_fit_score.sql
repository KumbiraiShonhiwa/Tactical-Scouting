-- Per ADD 3.3 DDL extract. Append-only historical record (TP-04) — no updated_at/update
-- trigger, since a fit_score row is never edited after computation, only superseded by a new
-- row with a higher profile_version.
create table public.fit_score (
  fit_score_id         uuid primary key default gen_random_uuid(),
  player_id            uuid not null references public.player(player_id) on delete cascade,
  club_id              uuid not null references public.club(club_id) on delete cascade,
  profile_version      int  not null,
  score                numeric(6,4) not null check (score between 0 and 1),
  contributing_metrics jsonb not null default '{}'::jsonb,
  computed_at          timestamptz not null default now()
);

create index fit_score_club_score_idx on public.fit_score (club_id, score desc);
create unique index fit_score_latest_uq
  on public.fit_score (player_id, club_id, profile_version);

alter table public.fit_score enable row level security;

grant select on public.fit_score to anon, authenticated;

-- Per ADD 4.1.2 (reproduced verbatim).
create policy "fit_score_public_read"
  on public.fit_score for select
  to anon, authenticated
  using (true);
