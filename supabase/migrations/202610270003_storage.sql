-- WorldSpeak Phase 2 · 003 private storage buckets and access policies.
-- All buckets private. Server chooses <auth.uid>/<asset_uuid>/<filename>;
-- signed URLs expire in 60s and are never logged. Local-test shim provides
-- the storage schema (supabase/tests/setup-shim.sql); real Supabase does.

insert into storage.buckets (id, name, public) values
  ('transient-inputs', 'transient-inputs', false),
  ('private-results', 'private-results', false),
  ('private-pictograms', 'private-pictograms', false)
on conflict (id) do nothing;

-- Revoke broad access, then grant narrowly to authenticated.
revoke all on storage.objects from anon, authenticated;

grant select, insert, delete on storage.objects to authenticated;

alter table storage.objects enable row level security;
alter table storage.objects force row level security;

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
