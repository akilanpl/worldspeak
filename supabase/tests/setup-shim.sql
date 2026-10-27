-- Local-test shim emulating the Supabase platform surface that migrations
-- rely on (auth.users, auth.uid(), storage schema). Runs BEFORE migrations
-- in `pnpm test:db`. NEVER applied to a real project: real Supabase
-- provides these. Policies under test are identical in both environments.

create extension if not exists "pgcrypto";

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

-- Test-local auth.uid(): reads the subject the harness sets per transaction.
-- Real Supabase reads the verified JWT; the app always uses verified users.
create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select string_to_array(name, '/')
$$;

-- Platform roles (provided by Supabase; created here for the local harness).
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;

-- Test-local emulation of the hosted public-function default grant. ALTER
-- FUNCTION RENAME preserves it; omitting this hid the migration-008 ACL gap.
-- Private world_inference functions do not receive this grant.
alter default privileges in schema public grant execute on functions to service_role;

-- Managed Storage provides these grants and RLS before app migrations.
grant select, insert, update, delete on storage.objects to anon, authenticated;
alter table storage.objects enable row level security;
