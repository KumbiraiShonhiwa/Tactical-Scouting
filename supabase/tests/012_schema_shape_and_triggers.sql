-- Schema-shape and trigger tests (pgTAP), per Automated Testing Documentation 3.3:
-- column existence/types/checks cannot be meaningfully unit-tested outside the database.
begin;
select plan(6);

-- fit_score.score check constraint (0..1), per ADD 3.3.
select has_column('public', 'fit_score', 'score', 'fit_score has a score column');
select col_type_is('public', 'fit_score', 'score', 'numeric(6,4)', 'fit_score.score is numeric(6,4)');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.fit_score'::regclass and contype = 'c'
  ),
  'fit_score has at least one check constraint'
);

-- updated_at trigger: updating a club row changes updated_at.
select lives_ok(
  $$ update public.club set crest_url = 'https://example.test/crest.png'
     where club_id = 'c1111111-1111-1111-1111-111111111111' $$,
  'club row can be updated'
);
select isnt(
  (select updated_at from public.club where club_id = 'c1111111-1111-1111-1111-111111111111'),
  (select created_at from public.club where club_id = 'c1111111-1111-1111-1111-111111111111'),
  'club.updated_at differs from created_at after an update (trigger fired)'
);

-- is_admin() is marked stable (ADD 4.1.2).
select is(
  (select provolatile from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace),
  's',
  'public.is_admin() is marked STABLE'
);

select * from finish();
rollback;
