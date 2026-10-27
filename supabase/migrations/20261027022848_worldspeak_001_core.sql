-- WorldSpeak Phase 2 · 001 core tables and provisioning.
-- Assumes the platform `auth.users(id uuid)` table exists (real Supabase) or
-- is provided by the local-test shim (supabase/tests/setup-shim.sql) which
-- emulates the platform for `pnpm test:db`. No app content is seeded here.
-- Every user table carries owner_id + created_at (+ updated_at where mutable).
-- Ownership never comes from request JSON; it is derived from auth.uid().

create extension if not exists "pgcrypto";

-- Profiles: minimal, no duplicated identity/demographic data.
create table public.profiles (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  display_name varchar(80) not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len check (char_length(display_name) <= 80)
);

-- Accessibility preferences: provisioned defaults, narrow updates only.
create table public.accessibility_preferences (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  ui_locale text not null default 'en' constraint prefs_ui_locale check (ui_locale in ('en', 'ta')),
  communication_locale text not null default 'en' constraint prefs_comm_locale check (communication_locale in ('en', 'ta')),
  text_scale numeric not null default 1 constraint prefs_text_scale check (text_scale >= 1 and text_scale <= 2),
  high_contrast boolean not null default false,
  reduce_motion boolean not null default false,
  target_size integer not null default 48 constraint prefs_target_size check (target_size >= 48 and target_size <= 96),
  speech_rate numeric not null default 1 constraint prefs_speech_rate check (speech_rate >= 0.5 and speech_rate <= 1.5),
  voice_uri text,
  history_enabled boolean not null default false,
  revision integer not null default 1 constraint prefs_revision check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Consent events: append-only. Server timestamps; revocation is a new row.
create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  scope text not null constraint consent_scope
    check (scope in ('scene_upload', 'video_upload', 'partner_audio', 'pictogram_generation', 'history')),
  decision text not null constraint consent_decision check (decision in ('grant', 'revoke')),
  notice_version text not null,
  capture_id uuid,
  created_at timestamptz not null default now()
);
create index consent_events_owner_lookup on public.consent_events (owner_id, scope, created_at desc);

-- Conversations: created only when saving is enabled or explicitly requested.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title varchar(100) not null default '' constraint conversations_title_len check (char_length(title) <= 100),
  language text not null default 'en' constraint conversations_lang check (language in ('en', 'ta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_owner unique (owner_id, id)
);

-- Messages: immutable snapshots. Edit/replay creates a new revision row.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  kind text not null constraint messages_kind check (kind in ('communication', 'partner')),
  text varchar(1000) not null constraint messages_text_len check (char_length(text) >= 1 and char_length(text) <= 1000),
  locale text not null constraint messages_locale check (locale in ('en', 'ta')),
  intent jsonb,
  origin text not null constraint messages_origin check (origin in ('template', 'user_text', 'partner_transcript')),
  revision integer not null default 1 constraint messages_revision check (revision >= 1),
  text_hash text not null,
  template_version text,
  client_event_id uuid not null,
  created_at timestamptz not null default now(),
  constraint messages_owner unique (owner_id, id),
  constraint messages_owned_conversation
    foreign key (owner_id, conversation_id)
    references public.conversations (owner_id, id) on delete cascade,
  constraint messages_idempotent unique (owner_id, client_event_id)
);

-- Favorites: explicit persistent saves, even when general history is off.
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null,
  created_at timestamptz not null default now(),
  constraint favorites_owned_message
    foreign key (owner_id, message_id)
    references public.messages (owner_id, id) on delete cascade,
  constraint favorites_unique unique (owner_id, message_id)
);

-- updated_at maintenance (fixed search_path, no user input).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger prefs_updated before update on public.accessibility_preferences
  for each row execute function public.set_updated_at();
create trigger conversations_updated before update on public.conversations
  for each row execute function public.set_updated_at();

-- Minimal provisioning on signup: defaults only, never trust user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (owner_id) values (new.id) on conflict do nothing;
  insert into public.accessibility_preferences (owner_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
