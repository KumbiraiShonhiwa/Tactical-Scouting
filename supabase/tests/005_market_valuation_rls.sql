-- RLS: public.market_valuation (policy: market_valuation_public_read)
begin;
select plan(4);

set local role anon;
select is(
  (select count(*)::int from public.market_valuation),
  12,
  'anon can read all 12 seeded market_valuation rows'
);
select throws_ok(
  $$ insert into public.market_valuation (player_id, valuation_amount, valuation_date)
     values ('b1111111-0001-0001-0001-000000000001', 1000000, current_date) $$,
  '42501',
  null,
  'anon cannot insert into market_valuation'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099"}', true);
select is(
  (select count(*)::int from public.market_valuation),
  12,
  'authenticated (non-admin) can read all 12 seeded market_valuation rows'
);
select throws_ok(
  $$ insert into public.market_valuation (player_id, valuation_amount, valuation_date)
     values ('b1111111-0001-0001-0001-000000000001', 1000000, current_date) $$,
  '42501',
  null,
  'authenticated (non-admin) cannot insert into market_valuation'
);

select * from finish();
rollback;
