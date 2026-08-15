create table public.market_valuation (
  valuation_id     uuid primary key default gen_random_uuid(),
  player_id        uuid not null references public.player(player_id) on delete cascade,
  valuation_amount numeric(12,2) not null check (valuation_amount >= 0),
  currency         text not null default 'EUR',
  valuation_date   date not null,
  data_source      text not null default 'transfermarkt',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (player_id, valuation_date, data_source)
);

create index market_valuation_player_date_idx on public.market_valuation (player_id, valuation_date desc);

create trigger set_market_valuation_updated_at
  before update on public.market_valuation
  for each row execute function public.set_updated_at();

alter table public.market_valuation enable row level security;

grant select on public.market_valuation to anon, authenticated;

create policy "market_valuation_public_read"
  on public.market_valuation for select
  to anon, authenticated
  using (true);
