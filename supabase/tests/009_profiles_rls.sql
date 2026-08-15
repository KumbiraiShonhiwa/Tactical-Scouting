-- RLS: public.profiles (policies: profiles_own_select, profiles_own_update,
-- profiles_admin_select_all)
begin;
select plan(6);

insert into auth.users (id, email) values
  ('99999999-0000-0000-0000-000000000005', 'admin3@example.test'),
  ('99999999-0000-0000-0000-000000000006', 'scoutA@example.test'),
  ('99999999-0000-0000-0000-000000000007', 'scoutB@example.test');
update public.profiles set role = 'admin' where id = '99999999-0000-0000-0000-000000000005';

-- scoutA can see their own profile row, not scoutB's.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000006"}', true);
select is(
  (select count(*)::int from public.profiles where id = '99999999-0000-0000-0000-000000000006'),
  1,
  'authenticated user can read their own profile row'
);
select is(
  (select count(*)::int from public.profiles where id = '99999999-0000-0000-0000-000000000007'),
  0,
  'authenticated user cannot read another user''s profile row'
);

-- scoutA can update their own row, not scoutB's.
with upd as (
  update public.profiles set role = role where id = '99999999-0000-0000-0000-000000000006'
  returning 1
)
select is(
  (select count(*)::int from upd),
  1,
  'authenticated user can update their own profile row'
);
with upd as (
  update public.profiles set role = role where id = '99999999-0000-0000-0000-000000000007'
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'authenticated user cannot update another user''s profile row'
);

-- Admin can see every profile row.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000005"}', true);
select is(
  (select count(*)::int from public.profiles
   where id in ('99999999-0000-0000-0000-000000000006', '99999999-0000-0000-0000-000000000007')),
  2,
  'admin can read every profile row'
);

-- Unauthenticated (anon) cannot read any profile row (no GRANT to anon at all — profiles
-- are only meaningful once authenticated).
set local role anon;
select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501',
  null,
  'anon cannot access the profiles table at all'
);

select * from finish();
rollback;
