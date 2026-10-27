-- WorldSpeak Phase 2 · 002 ownership, grants, RLS, immutable-owner trigger.
-- Defense in depth: RLS on every user table, anon revoked everywhere,
-- narrow grants, owner_id immutable. Mirrors docs/WORLDSPEAK-PHASE-0.md §C.

-- Immutable owner_id: updates are prohibited on every user table.
create or replace function public.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_owner_immutable before update on public.profiles
  for each row execute function public.prevent_owner_change();
create trigger prefs_owner_immutable before update on public.accessibility_preferences
  for each row execute function public.prevent_owner_change();
create trigger consent_owner_immutable before update on public.consent_events
  for each row execute function public.prevent_owner_change();
create trigger conversations_owner_immutable before update on public.conversations
  for each row execute function public.prevent_owner_change();
create trigger messages_owner_immutable before update on public.messages
  for each row execute function public.prevent_owner_change();
create trigger favorites_owner_immutable before update on public.favorites
  for each row execute function public.prevent_owner_change();

-- Deny the anonymous role on every user table (offline board is static).
revoke all on public.profiles from anon;
revoke all on public.accessibility_preferences from anon;
revoke all on public.consent_events from anon;
revoke all on public.conversations from anon;
revoke all on public.messages from anon;
revoke all on public.favorites from anon;

-- Narrow grants to authenticated (provisioning trigger bypasses RLS as definer).
revoke all on public.profiles from authenticated;
revoke all on public.accessibility_preferences from authenticated;
revoke all on public.consent_events from authenticated;
revoke all on public.conversations from authenticated;
revoke all on public.messages from authenticated;
revoke all on public.favorites from authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select on public.accessibility_preferences to authenticated;
grant update (ui_locale, communication_locale, text_scale, high_contrast,
  reduce_motion, target_size, speech_rate, voice_uri, history_enabled, revision)
  on public.accessibility_preferences to authenticated;

grant select, insert on public.consent_events to authenticated;

grant select, insert, update, delete on public.conversations to authenticated;

-- Messages are immutable snapshots: no update grant.
grant select, insert, delete on public.messages to authenticated;

grant select, insert, delete on public.favorites to authenticated;

-- RLS enable + force on every user table.
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.accessibility_preferences enable row level security;
alter table public.accessibility_preferences force row level security;
alter table public.consent_events enable row level security;
alter table public.consent_events force row level security;
alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.favorites enable row level security;
alter table public.favorites force row level security;

-- Owner-only policies (server derives owner from verified auth.uid()).
create policy profiles_read on public.profiles for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy prefs_read on public.accessibility_preferences for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy prefs_update on public.accessibility_preferences for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy consent_read on public.consent_events for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy consent_insert on public.consent_events for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy conversations_read on public.conversations for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy conversations_insert on public.conversations for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy conversations_update on public.conversations for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy conversations_delete on public.conversations for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy messages_read on public.messages for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy messages_insert on public.messages for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy messages_delete on public.messages for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy favorites_read on public.favorites for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy favorites_insert on public.favorites for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy favorites_delete on public.favorites for delete to authenticated
  using ((select auth.uid()) = owner_id);
