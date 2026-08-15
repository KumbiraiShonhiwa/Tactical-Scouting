-- RLS: public.fit_score (policy: fit_score_public_read) — reproduces the ADD 4.1.2 example.
begin;
select plan(4);

set local role anon;
select is(
  (select count(*)::int from public.fit_score),
  12,
  'anon can read all 12 seeded fit_score rows'
);
select throws_ok(
  $$ insert into public.fit_score (player_id, club_id, profile_version, score)
     values ('b1111111-0001-0001-0001-000000000001', 'c1111111-1111-1111-1111-111111111111', 2, 0.5) $$,
  '42501',
  null,
  'anon cannot insert into fit_score'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099"}', true);
select is(
  (select count(*)::int from public.fit_score),
  12,
  'authenticated (non-admin) can read all 12 seeded fit_score rows'
);
select throws_ok(
  $$ insert into public.fit_score (player_id, club_id, profile_version, score)
     values ('b1111111-0001-0001-0001-000000000001', 'c1111111-1111-1111-1111-111111111111', 2, 0.5) $$,
  '42501',
  null,
  'authenticated (non-admin) cannot insert into fit_score'
);

select * from finish();
rollback;
