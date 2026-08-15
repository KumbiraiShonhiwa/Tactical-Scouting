-- RLS: private.quarantine — no policies at all; only service_role (RLS-bypassing) should
-- ever reach this table. anon/authenticated shouldn't even have schema USAGE.
begin;
select plan(2);

insert into private.quarantine (source_table, raw_record, reason, data_source) values
  ('public.player', '{"full_name":"Bad Row"}', 'missing position', 'fbref');

set local role anon;
select throws_ok(
  $$ select count(*) from private.quarantine $$,
  '42501',
  null,
  'anon cannot access the private.quarantine schema/table at all'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099"}', true);
select throws_ok(
  $$ select count(*) from private.quarantine $$,
  '42501',
  null,
  'authenticated cannot access the private.quarantine schema/table at all'
);

select * from finish();
rollback;
