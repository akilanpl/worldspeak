-- Phase 2 hosted advisor remediation and atomic owner-scoped data erasure.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_owner_change() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
create index messages_owned_conversation_idx on public.messages(owner_id, conversation_id);

-- No identity parameter: the verified JWT is the only authority. A data reset
-- retains the Auth identity and minimal default profile/preferences honestly.
create function public.erase_my_saved_data(reset_settings boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'authentication required' using errcode='42501'; end if;
  delete from public.conversations where owner_id=caller;
  if reset_settings then
    delete from public.consent_events where owner_id=caller;
    update public.profiles set display_name='' where owner_id=caller;
    update public.accessibility_preferences set ui_locale='en',communication_locale='en',
      text_scale=1,high_contrast=false,reduce_motion=false,target_size=48,speech_rate=1,
      voice_uri=null,history_enabled=false,revision=revision+1 where owner_id=caller;
  end if;
end $$;
revoke all on function public.erase_my_saved_data(boolean) from public,anon;
grant execute on function public.erase_my_saved_data(boolean) to authenticated;
