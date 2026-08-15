-- is_admin(): centralized admin-privilege check, used by every admin-write RLS policy
-- instead of duplicating the exists(...) check inline (ADD 4.1.2).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Now that is_admin() exists, admins can read every profile row (not just their own).
create policy "profiles_admin_select_all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());
