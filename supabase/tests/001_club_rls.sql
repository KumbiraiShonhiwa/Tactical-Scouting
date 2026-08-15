-- RLS: public.club (policy: club_public_read)
begin;
select plan(4);

set local role anon;
select is(
  (select count(*)::int from public.club),
  6,
  'anon can read all 6 seeded clubs'
);
select throws_ok(
  $$ insert into public.club (name) values ('Should Not Insert FC') $$,
  '42501',
  null,
  'anon cannot insert into club'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099"}', true);
select is(
  (select count(*)::int from public.club),
  6,
  'authenticated (non-admin) can read all 6 seeded clubs'
);
select throws_ok(
  $$ insert into public.club (name) values ('Should Not Insert FC') $$,
  '42501',
  null,
  'authenticated (non-admin) cannot insert into club'
);

select * from finish();
rollback;
