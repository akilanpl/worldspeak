-- Owner-derived, SECURITY INVOKER RPC: one transaction, no orphan conversations.
create function public.save_favorite_snapshot(snapshot jsonb, conversation_title text default '')
returns public.favorites language plpgsql security invoker set search_path = '' as $$
declare caller uuid := auth.uid(); m public.messages; f public.favorites; cid uuid;
begin
  if caller is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into m from public.messages where owner_id=caller and client_event_id=(snapshot->>'client_event_id')::uuid;
  if found then
    if m.text is distinct from snapshot->>'text' or m.locale is distinct from snapshot->>'locale' or m.text_hash is distinct from snapshot->>'text_hash' then
      raise exception 'idempotency payload conflict' using errcode='23505';
    end if;
  else
    insert into public.conversations(owner_id,title,language)
      values(caller,left(coalesce(nullif(conversation_title,''),snapshot->>'text'),100),snapshot->>'locale') returning id into cid;
    insert into public.messages(owner_id,conversation_id,kind,text,locale,intent,origin,revision,text_hash,template_version,client_event_id)
      values(caller,cid,coalesce(snapshot->>'kind','communication'),snapshot->>'text',snapshot->>'locale',snapshot->'intent',snapshot->>'origin',
        coalesce((snapshot->>'revision')::integer,1),snapshot->>'text_hash',snapshot->>'template_version',(snapshot->>'client_event_id')::uuid) returning * into m;
  end if;
  insert into public.favorites(owner_id,message_id) values(caller,m.id) on conflict(owner_id,message_id) do nothing;
  select * into f from public.favorites where owner_id=caller and message_id=m.id;
  return f;
end $$;
revoke all on function public.save_favorite_snapshot(jsonb,text) from public,anon;
grant execute on function public.save_favorite_snapshot(jsonb,text) to authenticated;
