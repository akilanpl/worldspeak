-- PENDING: no hosted application or generation authorization. Creates no ticket.
-- Independent second-test capability; never updates first-smoke permits/tombstone.
-- All state transitions take the existing global budget lock before row locks.
create table world_inference.sam_test_authorizations (
 singleton boolean primary key default true check(singleton),
 id uuid not null unique default gen_random_uuid(),
 approval_ref text not null unique check(length(approval_ref) between 8 and 200),
 owner_id uuid not null, -- no Auth FK: consumed approval survives identity deletion
 model text not null check(model='sam-3.1'), operation text not null check(operation='segment'),
 concept text not null check(concept='chair'),
 input_sha256 text not null check(input_sha256='a27313c7b3732ec3a3dea8df1f920c9c105884068705093608676ee248e4f8cc'),
 cap_micro bigint not null check(cap_micro=2500),
 pricing_ref text not null check(pricing_ref='meta-standard-sam-image-2500-v1'),
 issued_at timestamptz not null default now(), expires_at timestamptz not null,
 check(expires_at>issued_at and expires_at<=issued_at+interval '30 minutes')
);
create table world_inference.sam_test_events (
 authorization_id uuid not null references world_inference.sam_test_authorizations(id),
 event text not null check(event in('admitted','dispatched','revoked','closed')),
 job_id uuid, created_at timestamptz not null default now(),
 primary key(authorization_id,event),
 check(event not in('admitted','dispatched') or job_id is not null)
);
create unique index sam_test_one_job on world_inference.sam_test_events(job_id) where event='admitted';
alter table world_inference.sam_test_authorizations enable row level security;
alter table world_inference.sam_test_events enable row level security;
revoke all on world_inference.sam_test_authorizations,world_inference.sam_test_events from public,anon,authenticated,worldspeak_inference_worker;
create function world_inference.immutable_sam_test() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'SAM_TEST_APPEND_ONLY'; end $$;
create trigger sam_test_authorization_immutable before update or delete on world_inference.sam_test_authorizations for each row execute function world_inference.immutable_sam_test();
create trigger sam_test_event_immutable before update or delete on world_inference.sam_test_events for each row execute function world_inference.immutable_sam_test();
create trigger sam_test_authorization_no_truncate before truncate on world_inference.sam_test_authorizations for each statement execute function world_inference.immutable_sam_test();
create trigger sam_test_event_no_truncate before truncate on world_inference.sam_test_events for each statement execute function world_inference.immutable_sam_test();

-- Operator-only issuance requires a fresh approval reference and pricing assertion.
-- A permanent singleton makes rerunning setup fail, including after account deletion.
create function world_inference.authorize_sam_test(p_owner uuid,p_approval text,p_sha256 text,p_price bigint,p_pricing_ref text,p_expires timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare t world_inference.sam_test_authorizations; old_owner uuid;
begin
 perform world_inference.lock_budget();
 if exists(select 1 from world_inference.sam_test_authorizations) then raise exception 'SAM_TEST_ALREADY_ISSUED'; end if;
 if p_owner is null or not exists(select 1 from auth.users where id=p_owner) then raise exception 'SAM_TEST_OWNER_NOT_FOUND'; end if;
 if p_price is distinct from 2500 or p_pricing_ref is distinct from 'meta-standard-sam-image-2500-v1' then raise exception 'SAM_TEST_PRICING_NOT_CONFIRMED'; end if;
 if p_sha256 is distinct from 'a27313c7b3732ec3a3dea8df1f920c9c105884068705093608676ee248e4f8cc' or p_approval is null or length(p_approval) not between 8 and 200
 or p_expires is null or p_expires<=now() or p_expires>now()+interval '30 minutes' then raise exception 'SAM_TEST_SCOPE_MISMATCH'; end if;
 select owner_id into old_owner from world_inference.smoke_authorizations;
 if old_owner is null or (select count(*) from world_inference.generation_permits)<>2
 or not exists(select 1 from world_inference.generation_permits where operation='scene' and owner_id=old_owner and remaining=0 and consumed_at is not null)
 or not exists(select 1 from world_inference.generation_permits where operation='segment' and owner_id=old_owner and remaining=0 and consumed_at is null)
 then raise exception 'SAM_TEST_HISTORY_MISMATCH'; end if;
 -- Exact historical receipt pair, retained even when original Auth/job was deleted.
 if (select count(*) from world_inference.credit_events)<>2
 or not exists(select 1 from world_inference.credit_events r join world_inference.credit_events s using(job_id)
 where r.event='reserve' and r.amount_micro=25000 and s.event='settle' and s.amount_micro=4402)
 or not exists(select 1 from world_inference.budgets where account='global' and spent_micro=4402)
 or exists(select 1 from world_inference.budgets where limit_micro<>0 or reserved_micro<>0)
 or exists(select 1 from world_inference.budgets where account<>'global' and spent_micro<>0 and (account<>old_owner::text or spent_micro<>4402))
 or exists(select 1 from public.inference_jobs)
 or exists(select 1 from world_inference.cleanup where status<>'done')
 then raise exception 'SAM_TEST_RECONCILIATION_REQUIRED'; end if;
 insert into world_inference.sam_test_authorizations(approval_ref,owner_id,model,operation,concept,input_sha256,cap_micro,pricing_ref,expires_at)
 values(p_approval,p_owner,'sam-3.1','segment','chair',p_sha256,p_price,p_pricing_ref,p_expires) returning * into t;
 insert into world_inference.budgets(account) values(p_owner::text) on conflict do nothing;
 update world_inference.budgets set limit_micro=spent_micro+2500 where account in('global',p_owner::text);
 return t.id;
end $$;

-- Admission has exactly one immutable job binding, including canceled/failed jobs.
create function world_inference.submit_sam_test(p_asset uuid,p_operation text,p_key uuid,p_concept text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t world_inference.sam_test_authorizations; a public.inference_media; j public.inference_jobs; h text;
begin
 if u is null then raise exception 'UNAUTHENTICATED'; end if;
 perform world_inference.lock_budget();
 select * into t from world_inference.sam_test_authorizations where owner_id=u for update;
 if not found or p_operation is distinct from t.operation or p_concept is distinct from t.concept or p_key is null then raise exception 'SAM_TEST_NOT_AUTHORIZED'; end if;
 h:=encode(pg_catalog.sha256(convert_to(jsonb_build_array(p_asset,p_operation,p_concept,'meta-v1')::text,'UTF8')),'hex');
 select j0.* into j from public.inference_jobs j0 join world_inference.sam_test_events e on e.job_id=j0.id and e.event='admitted' and e.authorization_id=t.id
 where j0.owner_id=u and j0.operation=p_operation and j0.idempotency_key=p_key;
 if found then
  if j.input_hash<>h then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return j.id;
 end if;
 if t.expires_at<=now() or exists(select 1 from world_inference.sam_test_events where authorization_id=t.id and event in('revoked','closed')) then raise exception 'SAM_TEST_NOT_AUTHORIZED'; end if;
 if exists(select 1 from world_inference.sam_test_events where authorization_id=t.id and event='admitted') then raise exception 'SAM_TEST_ALREADY_ADMITTED'; end if;
 select * into a from public.inference_media where id=p_asset and owner_id=u and state='ready' and expires_at>now() and sha256=t.input_sha256 and width=512 and height=512 and bytes=25949;
 if not found then raise exception 'SAM_TEST_MEDIA_MISMATCH'; end if;
 if exists(select 1 from public.inference_jobs where status in('queued','leased','dispatching','uncertain')) then raise exception 'RATE_LIMITED'; end if;
 if exists(select 1 from world_inference.budgets where account in('global',u::text) and spent_micro+reserved_micro+2500>limit_micro)
 or (select count(*) from world_inference.budgets where account in('global',u::text))<>2 then raise exception 'BUDGET_EXCEEDED'; end if;
 update world_inference.budgets set reserved_micro=reserved_micro+2500 where account in('global',u::text);
 insert into public.inference_jobs(owner_id,asset_id,operation,concept,idempotency_key,input_hash,reserved_micro)
 values(u,p_asset,'segment','chair',p_key,h,2500) returning * into j;
 insert into world_inference.credit_events(job_id,event,amount_micro) values(j.id,'reserve',2500);
 insert into world_inference.sam_test_events(authorization_id,event,job_id) values(t.id,'admitted',j.id);
 return j.id;
end $$;

-- Keep the published client contract. After a new ticket exists, legacy admission
-- cannot use its budget headroom. No frontend owner/authorization ID is accepted.
alter function public.submit_inference_job(uuid,text,uuid,text) rename to submit_legacy_inference_job;
revoke all on function public.submit_legacy_inference_job(uuid,text,uuid,text) from public,anon,authenticated,worldspeak_inference_worker;
create function public.submit_inference_job(p_asset uuid,p_operation text,p_key uuid,p_concept text default null) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform world_inference.lock_budget();
 if exists(select 1 from world_inference.sam_test_authorizations) then return world_inference.submit_sam_test(p_asset,p_operation,p_key,p_concept); end if;
 return public.submit_legacy_inference_job(p_asset,p_operation,p_key,p_concept);
end $$;
revoke all on function public.submit_inference_job(uuid,text,uuid,text) from public,anon;
grant execute on function public.submit_inference_job(uuid,text,uuid,text) to authenticated;

-- Old live marker cannot claim/dispatch a ticket job or fall back to old permits.
alter function world_inference.claim() rename to claim_legacy;
revoke all on function world_inference.claim_legacy() from public,anon,authenticated,worldspeak_inference_worker;
create function world_inference.claim() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform world_inference.lock_budget();
 if exists(select 1 from world_inference.sam_test_authorizations) then return null; end if;
 return world_inference.claim_legacy();
end $$;
alter function world_inference.dispatch(uuid,uuid) rename to dispatch_legacy;
revoke all on function world_inference.dispatch_legacy(uuid,uuid) from public,anon,authenticated,worldspeak_inference_worker;
create function world_inference.dispatch(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform world_inference.lock_budget();
 if exists(select 1 from world_inference.sam_test_events where job_id=p_id and event='admitted') then return null; end if;
 return world_inference.dispatch_legacy(p_id,p_token);
end $$;

create function world_inference.claim_sam_test() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs; t world_inference.sam_test_authorizations;
begin
 perform world_inference.lock_budget(); perform world_inference.sweep();
 select * into t from world_inference.sam_test_authorizations where expires_at>now();
 if not found or exists(select 1 from world_inference.sam_test_events where authorization_id=t.id and event in('dispatched','revoked','closed')) then return null; end if;
 -- A pre-dispatch lease crash is terminal too: no automatic second attempt.
 for j in select j0.* from public.inference_jobs j0 join world_inference.sam_test_events e on e.job_id=j0.id and e.event='admitted' and e.authorization_id=t.id
 where j0.status='queued' and j0.attempt_count>0 loop
  perform world_inference.settle(j,0);
  update public.inference_jobs set status='failed',error_code='SAM_TEST_NO_RETRY',lease_token=null,lease_until=null where id=j.id;
  insert into world_inference.sam_test_events(authorization_id,event,job_id) values(t.id,'closed',j.id) on conflict do nothing;
  update world_inference.budgets set limit_micro=0 where account in('global',t.owner_id::text);
  return null;
 end loop;
 select j0.* into j from public.inference_jobs j0 join world_inference.sam_test_events e on e.job_id=j0.id and e.event='admitted' and e.authorization_id=t.id
 where j0.owner_id=t.owner_id and j0.status='queued' and not j0.cancel_requested and j0.attempt_count=0 for update of j0 skip locked;
 if not found then return null; end if;
 update public.inference_jobs set status='leased',lease_token=gen_random_uuid(),lease_until=now()+interval '45 seconds',attempt_count=1 where id=j.id returning * into j;
 return to_jsonb(j);
end $$;

-- Commit this durable consumption before opening any provider connection.
create function world_inference.dispatch_sam_test(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs; t world_inference.sam_test_authorizations; a public.inference_media;
begin
 perform world_inference.lock_budget();
 select t0.* into t from world_inference.sam_test_authorizations t0 join world_inference.sam_test_events e on e.authorization_id=t0.id and e.event='admitted' and e.job_id=p_id for update of t0;
 if not found or t.expires_at<=now() or exists(select 1 from world_inference.sam_test_events where authorization_id=t.id and event in('dispatched','revoked','closed')) then return null; end if;
 select * into j from public.inference_jobs where id=p_id and owner_id=t.owner_id and operation=t.operation and concept=t.concept and reserved_micro=t.cap_micro
 and status='leased' and lease_token=p_token and lease_until>now() and not cancel_requested and dispatched_at is null for update;
 if not found then return null; end if;
 select * into a from public.inference_media where id=j.asset_id and owner_id=t.owner_id and sha256=t.input_sha256 and width=512 and height=512 and bytes=25949 and state='ready' and expires_at>now();
 if not found then return null; end if;
 insert into world_inference.sam_test_events(authorization_id,event,job_id) values(t.id,'dispatched',j.id);
 update public.inference_jobs set status='dispatching',dispatched_at=now() where id=j.id;
 -- No further admission headroom even while the sole reservation remains held.
 update world_inference.budgets set limit_micro=0 where account in('global',t.owner_id::text);
 return jsonb_build_object('job',to_jsonb(j),'media',to_jsonb(a));
end $$;

-- A generic worker finish cannot bypass the ticket's stricter provenance fence.
alter function world_inference.finish(uuid,uuid,text,bigint,jsonb,text) rename to finish_legacy;
revoke all on function world_inference.finish_legacy(uuid,uuid,text,bigint,jsonb,text) from public,anon,authenticated,worldspeak_inference_worker;
create function world_inference.finish(p_id uuid,p_token uuid,p_outcome text,p_cost bigint,p_result jsonb,p_error text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform world_inference.lock_budget();
 if exists(select 1 from world_inference.sam_test_events where job_id=p_id and event='admitted') then return false; end if;
 return world_inference.finish_legacy(p_id,p_token,p_outcome,p_cost,p_result,p_error);
end $$;
revoke all on function world_inference.finish(uuid,uuid,text,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function world_inference.finish(uuid,uuid,text,bigint,jsonb,text) to worldspeak_inference_worker;

create function world_inference.finish_sam_test(p_id uuid,p_token uuid,p_outcome text,p_cost bigint,p_result jsonb,p_error text) returns boolean
language plpgsql security definer set search_path='' as $$
declare t world_inference.sam_test_authorizations; ok boolean;
begin
 perform world_inference.lock_budget();
 select t0.* into t from world_inference.sam_test_authorizations t0 join world_inference.sam_test_events e on e.authorization_id=t0.id and e.event='admitted' and e.job_id=p_id;
 if not found then return false; end if;
 if (p_outcome in('succeeded','uncertain') or p_cost>0) and not exists(select 1 from world_inference.sam_test_events where authorization_id=t.id and event='dispatched' and job_id=p_id) then raise exception 'SAM_TEST_NOT_DISPATCHED'; end if;
 if (p_outcome='succeeded' and p_result is null) or (p_result is not null and (jsonb_typeof(p_result) is distinct from 'object' or p_result->'provenance'->>'source' is distinct from 'model' or p_result->'provenance'->>'model' is distinct from t.model or p_result->'provenance'->>'inputSha256' is distinct from t.input_sha256)) then raise exception 'SAM_TEST_RESULT_MISMATCH'; end if;
 ok:=world_inference.finish_legacy(p_id,p_token,p_outcome,p_cost,p_result,p_error);
 if ok then
  insert into world_inference.sam_test_events(authorization_id,event,job_id) values(t.id,'closed',p_id) on conflict do nothing;
  update world_inference.budgets set limit_micro=0 where account in('global',t.owner_id::text);
 end if;
 return ok;
end $$;

-- Immediate admission deactivation; cannot retract a dispatched provider call.
-- Preserve any uncertain reservation/receipt; queue real Storage cleanup.
create function world_inference.deactivate_sam_test() returns boolean language plpgsql security definer set search_path='' as $$
declare t world_inference.sam_test_authorizations; j public.inference_jobs;
begin
 perform world_inference.lock_budget();
 select * into t from world_inference.sam_test_authorizations for update;
 if not found then return false; end if;
 insert into world_inference.sam_test_events(authorization_id,event) values(t.id,'revoked') on conflict do nothing;
 for j in select j0.* from public.inference_jobs j0 join world_inference.sam_test_events e on e.job_id=j0.id and e.event='admitted' and e.authorization_id=t.id loop
  insert into public.consent_events(owner_id,scope,decision,notice_version,capture_id)
  select t.owner_id,'scene_upload','revoke','scene-v1',j.asset_id where exists(select 1 from auth.users where id=t.owner_id);
 end loop;
 update world_inference.budgets set limit_micro=0 where account in('global',t.owner_id::text);
 return true;
end $$;

revoke all on function world_inference.immutable_sam_test(),world_inference.authorize_sam_test(uuid,text,text,bigint,text,timestamptz),world_inference.submit_sam_test(uuid,text,uuid,text),world_inference.claim(),world_inference.dispatch(uuid,uuid),world_inference.claim_sam_test(),world_inference.dispatch_sam_test(uuid,uuid),world_inference.finish_sam_test(uuid,uuid,text,bigint,jsonb,text),world_inference.deactivate_sam_test() from public,anon,authenticated,worldspeak_inference_worker;
grant execute on function world_inference.claim(),world_inference.dispatch(uuid,uuid),world_inference.claim_sam_test(),world_inference.dispatch_sam_test(uuid,uuid),world_inference.finish_sam_test(uuid,uuid,text,bigint,jsonb,text) to worldspeak_inference_worker;

-- Cleanup supervision also retires expired authorization and abandoned first
-- leases; it never creates a ticket, arms a permit or performs provider I/O.
alter function world_inference.sweep() rename to sweep_legacy;
revoke all on function world_inference.sweep_legacy() from public,anon,authenticated,worldspeak_inference_worker;
create function world_inference.sweep() returns void language plpgsql security definer set search_path='' as $$
declare t world_inference.sam_test_authorizations; j public.inference_jobs;
begin
 perform world_inference.lock_budget(); perform world_inference.sweep_legacy();
 select * into t from world_inference.sam_test_authorizations;
 if not found then return; end if;
 if t.expires_at<=now() and not exists(select 1 from world_inference.sam_test_events where authorization_id=t.id and event='revoked') then
  perform world_inference.deactivate_sam_test();
 end if;
 for j in select j0.* from public.inference_jobs j0 join world_inference.sam_test_events e on e.job_id=j0.id and e.event='admitted' and e.authorization_id=t.id
 where j0.status='queued' and j0.attempt_count>0 loop
  perform world_inference.settle(j,0);
  update public.inference_jobs set status='failed',error_code='SAM_TEST_NO_RETRY',lease_token=null,lease_until=null where id=j.id;
 end loop;
 if exists(select 1 from public.inference_jobs j0 join world_inference.sam_test_events e on e.job_id=j0.id and e.event='admitted' and e.authorization_id=t.id where j0.status in('failed','canceled','succeeded','uncertain')) then
  insert into world_inference.sam_test_events(authorization_id,event,job_id)
  select t.id,'closed',job_id from world_inference.sam_test_events where authorization_id=t.id and event='admitted' on conflict do nothing;
  update world_inference.budgets set limit_micro=0 where account in('global',t.owner_id::text);
 end if;
end $$;
revoke all on function world_inference.sweep() from public,anon,authenticated;
grant execute on function world_inference.sweep() to worldspeak_inference_worker;

-- Identity deletion must close unused headroom immediately, not wait for expiry.
-- Existing identity/media triggers still own monetary settlement and outbox work.
create function world_inference.on_sam_identity_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from world_inference.sam_test_authorizations where owner_id=old.id) then perform world_inference.deactivate_sam_test(); end if;
 return old;
end $$;
create trigger sam_test_identity_delete before delete on auth.users for each row execute function world_inference.on_sam_identity_delete();
revoke all on function world_inference.on_sam_identity_delete() from public,anon,authenticated,worldspeak_inference_worker;
