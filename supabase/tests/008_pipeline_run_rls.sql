-- RLS: public.pipeline_run (policy: pipeline_run_admin_read — admin-only, unlike every
-- other table above which is public-read).
begin;
select plan(4);

-- Fixture: one pipeline_run row + one admin user + one non-admin user (rolled back at end).
insert into public.pipeline_run (run_id, status, triggered_by) values
  ('e1111111-0000-0000-0000-000000000001', 'success', 'schedule');
insert into auth.users (id, email) values
  ('99999999-0000-0000-0000-000000000003', 'admin2@example.test'),
  ('99999999-0000-0000-0000-000000000004', 'scout2@example.test');
update public.profiles set role = 'admin' where id = '99999999-0000-0000-0000-000000000003';

set local role anon;
select is(
  (select count(*)::int from public.pipeline_run),
  0,
  'anon cannot read any pipeline_run rows'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000004"}', true);
select is(
  (select count(*)::int from public.pipeline_run),
  0,
  'authenticated (non-admin) cannot read any pipeline_run rows'
);
select throws_ok(
  $$ insert into public.pipeline_run (status, triggered_by) values ('queued', 'admin') $$,
  '42501',
  null,
  'authenticated (non-admin) cannot insert into pipeline_run'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000003"}', true);
select is(
  (select count(*)::int from public.pipeline_run),
  1,
  'admin can read pipeline_run rows'
);

select * from finish();
rollback;
