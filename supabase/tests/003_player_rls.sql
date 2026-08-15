-- RLS: public.player (policy: player_public_read)
begin;
select plan(4);

set local role anon;
select is(
  (select count(*)::int from public.player),
  12,
  'anon can read all 12 seeded players'
);
select throws_ok(
  $$ insert into public.player (full_name, position) values ('Nobody FC', 'ST') $$,
  '42501',
  null,
  'anon cannot insert into player'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099"}', true);
select is(
  (select count(*)::int from public.player),
  12,
  'authenticated (non-admin) can read all 12 seeded players'
);
select throws_ok(
  $$ insert into public.player (full_name, position) values ('Nobody FC', 'ST') $$,
  '42501',
  null,
  'authenticated (non-admin) cannot insert into player'
);

select * from finish();
rollback;
