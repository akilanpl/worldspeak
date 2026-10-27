-- WorldSpeak Phase 2 · ownership isolation tests (two users + anonymous).
-- Run via `pnpm test:db` after migrations. Every scenario ends with a PASS
-- notice; any unexpected error aborts the run (ON_ERROR_STOP). Expected
-- denials are caught inside DO blocks; a missing denial raises.
-- Users: A = 11111111-..., B = 22222222-... (in auth.users).

-- ---------- setup (superuser): two users, provisioned by trigger ----------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test')
on conflict (id) do nothing;

do $$
begin
  if (select count(*) from public.profiles) <> 2 then
    raise exception 'provisioning trigger failed';
  end if;
  if exists (select 1 from public.accessibility_preferences where history_enabled) then
    raise exception 'history must default to off';
  end if;
  raise notice 'PASS: provisioning creates profiles + opt-out preferences';
end $$;

-- ---------- anonymous is denied everywhere ----------
begin;
set local role anon;
do $$
declare denied boolean := false;
begin
  begin
    perform 1 from public.conversations;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'anon read was not denied'; end if;
  denied := false;
  begin
    insert into public.messages (owner_id, conversation_id, kind, text, locale, origin, text_hash, client_event_id)
      values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
        'communication', 'x', 'en', 'template', 'deadbeef', gen_random_uuid());
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'anon insert was not denied'; end if;
  denied := false;
  begin
    insert into storage.objects (bucket_id, name) values ('transient-inputs', 'x/y.png');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'anon storage insert was not denied'; end if;
  raise notice 'PASS: anonymous denied on rows and storage';
end $$;
commit;

-- ---------- A writes and reads own conversation ----------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.conversations (id, owner_id, title, language) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A talk', 'en');
do $$
declare n integer;
begin
  select count(*) into n from public.conversations;
  if n <> 1 then raise exception 'A should see exactly own conversation'; end if;
  raise notice 'PASS: owner reads own rows';
end $$;
commit;

-- ---------- B cannot see, edit, or delete A's rows ----------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
insert into public.conversations (id, owner_id, title, language) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B talk', 'en');
do $$
declare n integer; changed integer;
begin
  select count(*) into n from public.conversations;
  if n <> 1 then raise exception 'B leaked into A rows'; end if;
  update public.conversations set title = 'hijack'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'cross-user update applied'; end if;
  delete from public.conversations where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'cross-user delete applied'; end if;
  raise notice 'PASS: cross-user read/update/delete blocked';
end $$;
commit;

-- ---------- spoofed owner on insert rejected ----------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
declare denied boolean := false;
begin
  begin
    insert into public.conversations (owner_id, title) values
      ('22222222-2222-2222-2222-222222222222', 'spoof');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'spoofed owner insert allowed'; end if;
  raise notice 'PASS: spoofed owner_id rejected';
end $$;
commit;

-- ---------- owner_id updates prohibited; cross-owner links rejected ----------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
declare denied boolean := false;
begin
  begin
    update public.conversations set owner_id = '22222222-2222-2222-2222-222222222222'
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'owner_id update allowed'; end if;
  denied := false;
  begin
    insert into public.messages (owner_id, conversation_id, kind, text, locale, origin, text_hash, client_event_id)
      values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'communication', 'I want water.', 'en', 'template', 'abc123ef',
        '33333333-3333-3333-3333-333333333333');
  exception when foreign_key_violation then denied := true;
  end;
  if not denied then raise exception 'cross-owner link allowed'; end if;
  raise notice 'PASS: owner immutable; cross-owner links rejected';
end $$;
commit;

-- ---------- messages immutable; idempotent; favorites cascade ----------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.messages (id, owner_id, conversation_id, kind, text, locale, origin, text_hash, client_event_id) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'communication', 'I want water.', 'en', 'template',
    'abc123ef', '44444444-4444-4444-4444-444444444444');
insert into public.favorites (owner_id, message_id) values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
do $$
declare denied boolean := false; n integer;
begin
  begin
    update public.messages set text = 'rewritten' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'message update allowed'; end if;
  denied := false;
  begin
    insert into public.messages (owner_id, conversation_id, kind, text, locale, origin, text_hash, client_event_id)
      values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'communication', 'dup', 'en', 'template', 'abc123ef', '44444444-4444-4444-4444-444444444444');
  exception when unique_violation then denied := true;
  end;
  if not denied then raise exception 'duplicate client_event_id allowed'; end if;
  denied := false;
  begin
    -- RLS rejects before the composite FK is even consulted; either way the
    -- foreign favorite must not exist.
    insert into public.favorites (owner_id, message_id) values
      ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
  exception when foreign_key_violation or insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'favorite of foreign message allowed'; end if;
  delete from public.messages where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  select count(*) into n from public.favorites;
  if n <> 0 then raise exception 'favorite survived message deletion'; end if;
  raise notice 'PASS: messages immutable/idempotent; favorites cascade';
end $$;
commit;

-- ---------- consent append-only; preferences narrow ----------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.consent_events (owner_id, scope, decision, notice_version) values
  ('11111111-1111-1111-1111-111111111111', 'history', 'grant', 'v1');
update public.accessibility_preferences set history_enabled = true where owner_id = '11111111-1111-1111-1111-111111111111';
do $$
declare denied boolean := false; n integer;
begin
  begin
    update public.consent_events set decision = 'revoke';
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'consent update allowed'; end if;
  select count(*) into n from public.consent_events;
  if n <> 1 then raise exception 'consent row leaked or lost'; end if;
  raise notice 'PASS: consent append-only; preferences narrow update';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
declare n integer;
begin
  select count(*) into n from public.consent_events;
  if n <> 0 then raise exception 'B reads A consent'; end if;
  select count(*) into n from public.accessibility_preferences;
  if n <> 1 then raise exception 'B should see only own preferences'; end if;
  raise notice 'PASS: consent/preferences isolated';
end $$;
commit;

-- ---------- storage folder isolation ----------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into storage.objects (bucket_id, name) values
  ('transient-inputs', '11111111-1111-1111-1111-111111111111/asset/x.png');
do $$
declare denied boolean := false; n integer;
begin
  begin
    insert into storage.objects (bucket_id, name) values
      ('transient-inputs', '22222222-2222-2222-2222-222222222222/asset/y.png');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'cross-user storage insert allowed'; end if;
  denied := false;
  begin
    insert into storage.objects (bucket_id, name) values ('wrong-bucket', '11111111-1111-1111-1111-111111111111/asset/y.png');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'unlisted bucket insert allowed'; end if;
  select count(*) into n from storage.objects;
  if n <> 1 then raise exception 'storage read leaked'; end if;
  delete from storage.objects where name like '22222222%';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'cross-user storage delete applied'; end if;
  raise notice 'PASS: storage folder isolation';
end $$;
commit;

select 'ALL RLS ISOLATION TESTS PASSED' as result;
