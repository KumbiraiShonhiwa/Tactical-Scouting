-- RLS: public.player_statistics (policy: player_statistics_public_read)
begin;
select plan(4);

set local role anon;
select is(
  (select count(*)::int from public.player_statistics),
  12,
  'anon can read all 12 seeded player_statistics rows'
);
select throws_ok(
  $$ insert into public.player_statistics (player_id, season, minutes_played, data_source)
     values ('b1111111-0001-0001-0001-000000000001', '2024/2025', 100, 'fbref') $$,
  '42501',
  null,
  'anon cannot insert into player_statistics'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099"}', true);
select is(
  (select count(*)::int from public.player_statistics),
  12,
  'authenticated (non-admin) can read all 12 seeded player_statistics rows'
);
select throws_ok(
  $$ insert into public.player_statistics (player_id, season, minutes_played, data_source)
     values ('b1111111-0001-0001-0001-000000000001', '2024/2025', 100, 'fbref') $$,
  '42501',
  null,
  'authenticated (non-admin) cannot insert into player_statistics'
);

select * from finish();
rollback;
