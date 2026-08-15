-- profiles: extends auth.users with application-specific fields (role), per ADD 3.1.
-- Never modifies auth.users directly.

create extension if not exists pgcrypto;

-- pgTAP: required for the RLS positive/negative test suite under supabase/tests/. Harmless
-- to have enabled outside test environments (unused extension, no runtime cost).
create extension if not exists pgtap with schema extensions;

-- Shared updated_at trigger function, used by every table's `before update` trigger
-- (defined once here so it isn't duplicated per-table; ADD 3.2).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'standard' check (role in ('admin', 'standard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profiles row for every new auth.users row (default role = standard).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

-- A user can read and update their own profile row.
create policy "profiles_own_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_own_update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No anon access at all: profiles are only meaningful once authenticated.
-- Admin "select all profiles" policy is added in the is_admin_function migration,
-- once public.is_admin() exists to reference.
