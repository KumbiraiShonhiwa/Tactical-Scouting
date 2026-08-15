-- RLS: public.undervaluation_index (policy: undervaluation_index_public_read)
begin;
select plan(4);

set local role anon;
select is(
  (select count(*)::int from public.undervaluation_index),
  12,
  'anon can read all 12 seeded undervaluation_index rows'
);
select throws_ok(
  $$ insert into public.undervaluation_index (player_id, club_id, fit_score_id, index_value)
     values ('b1111111-0001-0001-0001-000000000001', 'c1111111-1111-1111-1111-111111111111',
             'd1111111-0001-0001-0001-000000000001', 9.9) $$,
  '42501',
  null,
  'anon cannot insert into undervaluation_index'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099"}', true);
select is(
  (select count(*)::int from public.undervaluation_index),
  12,
  'authenticated (non-admin) can read all 12 seeded undervaluation_index rows'
);
select throws_ok(
  $$ insert into public.undervaluation_index (player_id, club_id, fit_score_id, index_value)
     values ('b1111111-0001-0001-0001-000000000001', 'c1111111-1111-1111-1111-111111111111',
             'd1111111-0001-0001-0001-000000000001', 9.9) $$,
  '42501',
  null,
  'authenticated (non-admin) cannot insert into undervaluation_index'
);

select * from finish();
rollback;
