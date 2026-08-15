-- RLS: public.tactical_profile (policies: tactical_profile_public_read,
-- tactical_profile_admin_write, tactical_profile_admin_update)
begin;
select plan(6);

-- Test fixtures: one admin user, one non-admin authenticated user (rolled back at end).
insert into auth.users (id, email) values
  ('99999999-0000-0000-0000-000000000001', 'admin@example.test'),
  ('99999999-0000-0000-0000-000000000002', 'scout@example.test');
update public.profiles set role = 'admin' where id = '99999999-0000-0000-0000-000000000001';

set local role anon;
select is(
  (select count(*)::int from public.tactical_profile),
  6,
  'anon can read all 6 seeded tactical profiles'
);
select throws_ok(
  $$ insert into public.tactical_profile (club_id, version, weightings)
     values ('c1111111-1111-1111-1111-111111111111', 2, '{}') $$,
  '42501',
  null,
  'anon cannot insert a tactical_profile'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000002"}', true);
select throws_ok(
  $$ insert into public.tactical_profile (club_id, version, weightings)
     values ('c1111111-1111-1111-1111-111111111111', 2, '{}') $$,
  '42501',
  null,
  'authenticated non-admin cannot insert a tactical_profile'
);
with upd as (
  update public.tactical_profile set effective_date = effective_date
  where profile_id = 'a1111111-0001-0001-0001-000000000001'
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'authenticated non-admin cannot update tactical_profile (0 rows affected)'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000001"}', true);
select lives_ok(
  $$ insert into public.tactical_profile (club_id, version, weightings, is_current)
     values ('c1111111-1111-1111-1111-111111111111', 99, '{}', false) $$,
  'admin can insert a new tactical_profile version'
);
with upd as (
  update public.tactical_profile set effective_date = effective_date
  where profile_id = 'a1111111-0001-0001-0001-000000000001'
  returning 1
)
select is(
  (select count(*)::int from upd),
  1,
  'admin can update tactical_profile (1 row affected)'
);

select * from finish();
rollback;
