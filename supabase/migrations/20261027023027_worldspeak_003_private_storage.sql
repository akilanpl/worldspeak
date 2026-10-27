-- WorldSpeak Phase 2 · 003 private storage buckets and access policies.
-- All buckets private. Server chooses <auth.uid>/<asset_uuid>/<filename>;
-- signed URLs expire in 60s and are never logged. Local-test shim provides
-- the storage schema (supabase/tests/setup-shim.sql); real Supabase does.

insert into storage.buckets (id, name, public) values
  ('transient-inputs', 'transient-inputs', false),
  ('private-results', 'private-results', false),
  ('private-pictograms', 'private-pictograms', false)
on conflict (id) do nothing;

-- Supabase owns storage.objects and already enables RLS/grants. Do not ALTER
-- the managed table or change its platform grants. With no matching policy,
-- anonymous access and UPDATE/upsert remain denied. The local shim supplies
-- the same platform RLS/grant surface before applying application policies.

-- First path segment must equal the caller's user id; bucket allowlisted.
create policy storage_read on storage.objects for select to authenticated
  using (
    bucket_id in ('transient-inputs', 'private-results', 'private-pictograms')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('transient-inputs', 'private-results', 'private-pictograms')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('transient-inputs', 'private-results', 'private-pictograms')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
