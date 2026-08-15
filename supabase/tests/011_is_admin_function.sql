-- public.is_admin() correctness, with known role/profile fixtures.
begin;
select plan(3);

insert into auth.users (id, email) values
  ('99999999-0000-0000-0000-000000000008', 'admin4@example.test'),
  ('99999999-0000-0000-0000-000000000009', 'scoutC@example.test');
update public.profiles set role = 'admin' where id = '99999999-0000-0000-0000-000000000008';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000008"}', true);
select ok(public.is_admin(), 'is_admin() returns true for an admin-role profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000009"}', true);
select ok(not public.is_admin(), 'is_admin() returns false for a standard-role profile');

set local role anon;
select ok(not public.is_admin(), 'is_admin() returns false with no authenticated user (auth.uid() is null)');

select * from finish();
rollback;
