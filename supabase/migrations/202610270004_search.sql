-- WorldSpeak Phase 2 · 004 trigram search indexes.
-- Owner-scoped NFC-normalized exact-substring search with escaped LIKE
-- metacharacters (app layer), cursor pagination (created_at, id), page 30.
-- No stemmer, embeddings, or platform FTS dependency.

create extension if not exists "pg_trgm";

create index conversations_title_trgm on public.conversations
  using gin (lower(title) gin_trgm_ops);
create index messages_text_trgm on public.messages
  using gin (lower(text) gin_trgm_ops);

create index conversations_owner_time on public.conversations (owner_id, created_at desc, id desc);
create index messages_owner_time on public.messages (owner_id, created_at desc, id desc);
