-- 003_add_roles_and_contracts.sql

-- 1. Create organizations table for B2B shared quotas
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'free' check (plan in ('free', 'pro', 'premium')),
  plan_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Alter profiles to add new fields
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists contract_type text default 'b2c';
alter table public.profiles add column if not exists preferred_language text default 'fr';
alter table public.profiles add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Set defaults for existing profiles if columns are null
update public.profiles set role = 'user' where role is null;
update public.profiles set contract_type = 'b2c' where contract_type is null;
update public.profiles set preferred_language = 'fr' where preferred_language is null;

alter table public.profiles alter column role set not null;
alter table public.profiles alter column contract_type set not null;
alter table public.profiles alter column preferred_language set not null;

-- Add constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_contract_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_contract_check check (contract_type in ('b2c', 'b2b'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_language_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_language_check check (preferred_language in ('ar', 'fr', 'en'));
  end if;
end $$;

-- 3. Update profiles RLS to allow admins to select/update all
drop policy if exists "Admins manage all profiles" on public.profiles;
create policy "Admins manage all profiles"
  on public.profiles
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Organizations RLS
alter table public.organizations enable row level security;

drop policy if exists "Users read own organization" on public.organizations;
create policy "Users read own organization"
  on public.organizations for select
  using (
    id = (select organization_id from public.profiles where id = auth.uid())
    or
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
