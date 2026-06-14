-- 004_admin_rls_helper.sql
-- Replace inline subqueries with a security definer helper for admin checks.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins manage all profiles" on public.profiles;
create policy "Admins manage all profiles"
  on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users read own organization" on public.organizations;
create policy "Users read own organization"
  on public.organizations for select
  using (
    id = (select organization_id from public.profiles where id = auth.uid())
    or public.is_admin()
  );
