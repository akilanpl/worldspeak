-- Forward-only. Defaults deny paid admission. No hosted application performed.
-- All mutators serialize on one global budget row, then user/job/media rows.
create schema if not exists world_inference;
revoke all on schema world_inference from public, anon, authenticated;
create table world_inference.budgets (
 account text primary key, limit_micro bigint not null default 0 check(limit_micro between 0 and 1000000000),
 reserved_micro bigint not null default 0 check(reserved_micro>=0), spent_micro bigint not null default 0 check(spent_micro>=0)
);
insert into world_inference.budgets(account) values('global');
alter table world_inference.budgets enable row level security;

-- Explicit one-shot smoke permits, consumed atomically at dispatch (not at claim).
create table world_inference.generation_permits(
 operation text primary key check(operation in('scene','segment')),
 remaining integer not null default 0 check(remaining between 0 and 1),
 owner_id uuid, armed_at timestamptz, consumed_at timestamptz,
 check(remaining=0 or (owner_id is not null and armed_at is not null and consumed_at is null))
);
-- Permanent operator authorization tombstone; no Auth FK/cascade may erase it.
create table world_inference.smoke_authorizations(
 singleton boolean primary key default true check(singleton),
 owner_id uuid not null, cap_micro bigint not null check(cap_micro=50000),
 operations text[] not null check(operations=array['scene','segment']::text[]),
 armed_at timestamptz not null default now()
);
alter table world_inference.smoke_authorizations enable row level security;
insert into world_inference.generation_permits(operation) values('scene'),('segment');
alter table world_inference.generation_permits enable row level security;

create table public.inference_media (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 path text not null unique, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 width integer not null check(width between 1 and 512), height integer not null check(height between 1 and 512),
 bytes integer not null check(bytes between 1 and 1048576), notice_version text not null check(notice_version='scene-v1'),
 state text not null default 'pending' check(state in ('pending','ready','revoked','deleted')),
 expires_at timestamptz not null default now()+interval '15 minutes', created_at timestamptz not null default now(),
 unique(owner_id,id)
);
alter table public.inference_media enable row level security;
revoke all on public.inference_media from public, anon, authenticated;
grant select on public.inference_media to authenticated;
create policy inference_media_read on public.inference_media for select to authenticated using(owner_id=(select auth.uid()) and state='ready' and expires_at>now());
create index inference_media_owner on public.inference_media(owner_id,created_at);
create index inference_media_expiry on public.inference_media(expires_at) where state<>'deleted';

create table public.inference_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 asset_id uuid not null, operation text not null check(operation in ('scene','segment')), concept text,
 idempotency_key uuid not null, input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'queued' check(status in ('queued','leased','dispatching','succeeded','failed','canceled','uncertain')),
 reserved_micro bigint not null check(reserved_micro in(2500,25000)), actual_micro bigint check(actual_micro>=0),
 settled boolean not null default false, cancel_requested boolean not null default false,
 attempt_count integer not null default 0 check(attempt_count between 0 and 3),
 lease_token uuid, lease_until timestamptz, dispatched_at timestamptz, result jsonb, error_code text,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
 unique(owner_id,operation,idempotency_key), unique(owner_id,id),
 foreign key(owner_id,asset_id) references public.inference_media(owner_id,id) on delete cascade,
 check((operation='scene' and concept is null) or (operation='segment' and length(concept) between 1 and 80 and concept !~ '[\n\r,;+<>]')),
 check(result is null or octet_length(result::text)<=12000000)
);
alter table public.inference_jobs enable row level security;
revoke all on public.inference_jobs from public,anon,authenticated;
-- Clients cannot read lease tokens or mutate ledger/state/results directly.
grant select(id,owner_id,asset_id,operation,status,cancel_requested,created_at,expires_at) on public.inference_jobs to authenticated;
create policy inference_jobs_read on public.inference_jobs for select to authenticated using(owner_id=(select auth.uid()) and (expires_at>now() or status='uncertain'));
create index inference_jobs_owner on public.inference_jobs(owner_id,created_at);
create index inference_jobs_media on public.inference_jobs(owner_id,asset_id);
create index inference_jobs_pending on public.inference_jobs(created_at) where status='queued';
create index inference_jobs_active_expiry on public.inference_jobs(lease_until,expires_at) where status in('queued','leased','dispatching');
create index inference_jobs_result_expiry on public.inference_jobs(expires_at) where result is not null;

-- Append-only operational receipts, containing opaque job IDs and money only.
create table world_inference.credit_events (
 job_id uuid not null, event text not null check(event in('reserve','settle','uncertain')),
 amount_micro bigint not null check(amount_micro>=0), created_at timestamptz not null default now(),
 primary key(job_id,event)
);
alter table world_inference.credit_events enable row level security;

-- No FK to Auth/media: deletion of an identity must not erase the cleanup outbox.
create table world_inference.cleanup (
 asset_id uuid primary key, path text not null unique, due_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','leased','done','blocked')),
 attempts integer not null default 0, lease_token uuid, lease_until timestamptz, last_error text
);
alter table world_inference.cleanup enable row level security;
create index inference_cleanup_due on world_inference.cleanup(due_at) where status in('pending','leased','done');
insert into storage.buckets(id,name,public) values('world-inference','world-inference',false);
-- This dedicated bucket deliberately has NO client Storage policies. All uploads
-- are bounded, normalized and consent-admitted by the authenticated server API.

create function world_inference.lock_budget() returns void language sql security definer set search_path='' as $$
 select account from world_inference.budgets where account='global' for update;
$$;
create function world_inference.settle(j public.inference_jobs, amount bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 if j.settled then return; end if;
 if amount<0 then raise exception 'INVALID_INPUT'; end if;
 update public.inference_jobs set settled=true,actual_micro=amount where id=j.id and not settled;
 if not found then return; end if;
 insert into world_inference.credit_events(job_id,event,amount_micro) values(j.id,'settle',amount);
 update world_inference.budgets set reserved_micro=reserved_micro-j.reserved_micro,spent_micro=spent_micro+amount
 where account in('global',j.owner_id::text);
end $$;

create function public.create_inference_media(p_sha256 text,p_width integer,p_height integer,p_bytes integer,p_notice text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a public.inference_media; n uuid:=gen_random_uuid();
begin
 if u is null then raise exception 'UNAUTHENTICATED'; end if;
 perform world_inference.lock_budget();
 if p_notice<>'scene-v1' then raise exception 'CONSENT_REQUIRED'; end if;
 if (select count(*) from public.inference_media where state<>'deleted')>=16 then raise exception 'RATE_LIMITED'; end if;
 if (select count(*) from public.inference_media where owner_id=u and state in('pending','ready') and expires_at>now())>=3 then raise exception 'RATE_LIMITED'; end if;
 insert into public.inference_media(id,owner_id,path,sha256,width,height,bytes,notice_version) values(n,u,u::text||'/'||n::text||'.png',p_sha256,p_width,p_height,p_bytes,p_notice) returning * into a;
 insert into world_inference.cleanup(asset_id,path,due_at) values(n,a.path,a.expires_at);
 insert into public.consent_events(owner_id,scope,decision,notice_version,capture_id) values(u,'scene_upload','grant',p_notice,n);
 return jsonb_build_object('id',a.id,'path',a.path,'expiresAt',a.expires_at);
end $$;

-- Called only by worker role/server after Storage API upload succeeds.
create function world_inference.media_ready(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform world_inference.lock_budget();
 update public.inference_media set state='ready' where id=p_id and state='pending' and expires_at>now();
 return found;
end $$;

create function public.submit_inference_job(p_asset uuid,p_operation text,p_key uuid,p_concept text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a public.inference_media; j public.inference_jobs; h text; cost bigint;
begin
 if u is null then raise exception 'UNAUTHENTICATED'; end if;
 perform world_inference.lock_budget();
 if p_operation not in('scene','segment') or p_key is null then raise exception 'INVALID_INPUT'; end if;
 if (p_operation='scene' and p_concept is not null) or (p_operation='segment' and (p_concept is null or length(p_concept) not between 1 and 80 or p_concept ~ '[\n\r,;+<>]')) then raise exception 'INVALID_INPUT'; end if;
 h:=encode(pg_catalog.sha256(convert_to(jsonb_build_array(p_asset,p_operation,p_concept,'meta-v1')::text,'UTF8')),'hex');
 select * into j from public.inference_jobs where owner_id=u and operation=p_operation and idempotency_key=p_key;
 if found then
  if j.input_hash<>h then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return j.id;
 end if;
 select * into a from public.inference_media where id=p_asset and owner_id=u and state='ready' and expires_at>now();
 if not found then raise exception 'CONSENT_REQUIRED'; end if;
 if exists(select 1 from public.inference_jobs where owner_id=u and status in('queued','leased','dispatching','uncertain')) then raise exception 'RATE_LIMITED'; end if;
 cost:=case when p_operation='scene' then 25000 else 2500 end;
 insert into world_inference.budgets(account) values(u::text) on conflict do nothing;
 perform 1 from world_inference.budgets where account=u::text for update;
 if exists(select 1 from world_inference.budgets where account in('global',u::text) and spent_micro+reserved_micro+cost>limit_micro) then raise exception 'BUDGET_EXCEEDED'; end if;
 update world_inference.budgets set reserved_micro=reserved_micro+cost where account in('global',u::text);
 insert into public.inference_jobs(owner_id,asset_id,operation,concept,idempotency_key,input_hash,reserved_micro) values(u,p_asset,p_operation,p_concept,p_key,h,cost) returning * into j;
 insert into world_inference.credit_events(job_id,event,amount_micro) values(j.id,'reserve',cost);
 return j.id;
end $$;

create function public.inference_job_status(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 select * into j from public.inference_jobs where id=p_id and owner_id=auth.uid() and (expires_at>now() or status='uncertain');
 if not found then return null; end if;
 return jsonb_build_object('id',j.id,'operation',j.operation,'status',j.status,'cancelRequested',j.cancel_requested,
 'result',case when j.status='succeeded' and not j.cancel_requested then j.result else null end,'errorCode',j.error_code,
 'reservedMicroUsd',j.reserved_micro,'chargedMicroUsd',j.actual_micro,'billingState',case when j.settled then 'settled' when j.status='uncertain' then 'uncertain' else 'reserved' end,'createdAt',j.created_at,'expiresAt',j.expires_at);
end $$;

create function public.cancel_inference_job(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 perform world_inference.lock_budget();
 select * into j from public.inference_jobs where id=p_id and owner_id=auth.uid() for update;
 if not found then return false; end if;
 update public.inference_jobs set cancel_requested=true,result=null where id=j.id;
 if j.status in('queued','leased') then
  perform world_inference.settle(j,0);
  update public.inference_jobs set status='canceled',lease_token=null,lease_until=null where id=j.id;
 elsif j.status='succeeded' then update public.inference_jobs set status='canceled' where id=j.id;
 end if;
 return true;
end $$;

create function public.revoke_inference_media(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare a public.inference_media; j public.inference_jobs;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 perform world_inference.lock_budget();
 select * into a from public.inference_media where id=p_id and owner_id=auth.uid() for update;
 if not found then return false; end if;
 update public.inference_media set state='revoked' where id=a.id and state<>'deleted';
 insert into public.consent_events(owner_id,scope,decision,notice_version,capture_id) values(auth.uid(),'scene_upload','revoke',a.notice_version,a.id);
 for j in select * from public.inference_jobs where asset_id=a.id loop perform public.cancel_inference_job(j.id); end loop;
 -- Wait beyond bounded in-flight server upload to avoid delete-before-late-upload.
 update world_inference.cleanup set due_at=least(due_at,now()+interval '60 seconds'),status='pending' where asset_id=a.id and status<>'done';
 return true;
end $$;

create function world_inference.sweep() returns void language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs;
begin
 perform world_inference.lock_budget();
 for j in select * from public.inference_jobs where
 (status in('queued','leased','dispatching') and (expires_at<=now() or (lease_until<=now() and status<>'queued') or cancel_requested or exists(select 1 from public.inference_media a where a.id=asset_id and (a.state in('revoked','deleted') or a.expires_at<=now())))) loop
  if j.dispatched_at is not null then
   insert into world_inference.credit_events(job_id,event,amount_micro) values(j.id,'uncertain',j.reserved_micro) on conflict do nothing;
   update public.inference_jobs set status='uncertain',error_code='TIMEOUT_UNCERTAIN',result=null,lease_token=null,lease_until=null where id=j.id;
  elsif not j.cancel_requested and j.expires_at>now() and j.attempt_count<3 and exists(select 1 from public.inference_media where id=j.asset_id and state='ready' and expires_at>now()) then
   update public.inference_jobs set status='queued',lease_token=null,lease_until=null where id=j.id;
  else
   perform world_inference.settle(j,0);
   update public.inference_jobs set status=case when j.cancel_requested then 'canceled' else 'failed' end,error_code='MEDIA_EXPIRED',lease_token=null,lease_until=null where id=j.id;
  end if;
 end loop;
 update public.inference_jobs set result=null where expires_at<=now() and result is not null;
 update public.inference_media set state='revoked' where expires_at<=now() and state in('pending','ready');
end $$;

create function world_inference.claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs;
begin
 perform world_inference.lock_budget(); perform world_inference.sweep();
 if (select count(*) from public.inference_jobs where status in('leased','dispatching'))>=2 then return null; end if;
 select * into j from public.inference_jobs where status='queued' and exists(select 1 from world_inference.generation_permits p where p.operation=inference_jobs.operation and p.owner_id=inference_jobs.owner_id and p.remaining>0 and p.consumed_at is null) order by created_at,id for update skip locked limit 1;
 if not found then return null; end if;
 update public.inference_jobs set status='leased',lease_token=gen_random_uuid(),lease_until=now()+interval '45 seconds',attempt_count=attempt_count+1 where id=j.id returning * into j;
 return to_jsonb(j);
end $$;

create function world_inference.heartbeat(p_id uuid,p_token uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform world_inference.lock_budget();
 update public.inference_jobs set lease_until=now()+interval '45 seconds' where id=p_id and lease_token=p_token and lease_until>now() and status in('leased','dispatching') and not cancel_requested;
 return found;
end $$;

-- This transaction MUST commit before opening any provider connection.
create function world_inference.dispatch(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs; a public.inference_media;
begin
 perform world_inference.lock_budget();
 select * into j from public.inference_jobs where id=p_id and lease_token=p_token and lease_until>now() and status='leased' and not cancel_requested for update;
 if not found then return null; end if;
 select * into a from public.inference_media where id=j.asset_id and owner_id=j.owner_id and state='ready' and expires_at>now();
 if not found then return null; end if;
 update world_inference.generation_permits set remaining=0,consumed_at=now() where operation=j.operation and owner_id=j.owner_id and armed_at is not null and consumed_at is null and remaining=1;
 if not found then return null; end if;
 update public.inference_jobs set status='dispatching',dispatched_at=now() where id=j.id;
 return jsonb_build_object('job',to_jsonb(j),'media',to_jsonb(a));
end $$;

create function world_inference.finish(p_id uuid,p_token uuid,p_outcome text,p_cost bigint,p_result jsonb,p_error text) returns boolean language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs; valid boolean;
begin
 perform world_inference.lock_budget();
 select * into j from public.inference_jobs where id=p_id and lease_token=p_token and lease_until>now() and status in('leased','dispatching') for update;
 if not found then return false; end if;
 if p_outcome not in('succeeded','failed','uncertain') then raise exception 'INVALID_INPUT'; end if;
 if p_outcome='uncertain' then
  insert into world_inference.credit_events(job_id,event,amount_micro) values(j.id,'uncertain',j.reserved_micro) on conflict do nothing;
  update public.inference_jobs set status='uncertain',result=null,error_code='TIMEOUT_UNCERTAIN',lease_token=null,lease_until=null where id=j.id;
  return true; -- conservative hold, manual billing reconciliation only
 end if;
 if p_cost is null or p_cost<0 then raise exception 'INVALID_INPUT'; end if;
 -- Actual overrun is recorded, never clamped/hidden; block further admission.
 perform world_inference.settle(j,p_cost);
 valid:=not j.cancel_requested and j.expires_at>now() and exists(select 1 from public.inference_media a where a.id=j.asset_id and a.owner_id=j.owner_id and a.state='ready' and a.expires_at>now());
 update public.inference_jobs set status=case when not valid then 'canceled' else p_outcome end,
 result=case when valid and p_outcome='succeeded' then p_result else null end,error_code=p_error,lease_token=null,lease_until=null where id=j.id;
 return true;
end $$;

-- Manual receipt reconciliation never resubmits the job. Unknown billing stays held.
create function world_inference.reconcile(p_id uuid,p_actual bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs;
begin
 perform world_inference.lock_budget();
 select * into j from public.inference_jobs where id=p_id and status='uncertain' for update;
 if not found or p_actual is null or p_actual<0 then return false; end if;
 perform world_inference.settle(j,p_actual);
 update public.inference_jobs set status=case when cancel_requested then 'canceled' else 'failed' end,error_code='RECONCILED_NO_RETRY',result=null where id=j.id;
 return true;
end $$;

create function world_inference.claim_cleanup() returns jsonb language plpgsql security definer set search_path='' as $$
declare c world_inference.cleanup;
begin
 perform world_inference.lock_budget();
 select * into c from world_inference.cleanup where due_at<=now() and (status in('pending','done') or (status='leased' and lease_until<=now())) order by due_at for update skip locked limit 1;
 if not found then return null; end if;
 if c.attempts>=10 then update world_inference.cleanup set status='blocked',last_error='MANUAL_CLEANUP_REQUIRED' where asset_id=c.asset_id; return null; end if;
 update world_inference.cleanup set status='leased',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '45 seconds' where asset_id=c.asset_id returning * into c;
 return to_jsonb(c);
end $$;
create function world_inference.finish_cleanup(p_asset uuid,p_token uuid,p_success boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform world_inference.lock_budget();
 update world_inference.cleanup set status=case when p_success then 'done' else 'pending' end,due_at=now()+case when p_success then interval '24 hours' else interval '5 minutes' end,attempts=case when p_success then 0 else attempts end,lease_token=null,lease_until=null,last_error=case when p_success then null else 'STORAGE_DELETE_FAILED' end
 where asset_id=p_asset and lease_token=p_token and lease_until>now() and status='leased';
 if not found then return false; end if;
 if p_success then update public.inference_media set state='deleted' where id=p_asset; end if;
 return true;
end $$;

-- Retain cleanup paths across Auth deletion. Charge dispatched unknown calls at
-- full reservation conservatively, rather than losing a global budget hold.
create function world_inference.before_media_delete() returns trigger language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs;
begin
 perform world_inference.lock_budget();
 for j in select * from public.inference_jobs where asset_id=old.id and not settled loop
  perform world_inference.settle(j,case when j.dispatched_at is null then 0 else j.reserved_micro end);
 end loop;
 insert into world_inference.cleanup(asset_id,path,due_at) values(old.id,old.path,now()+interval '60 seconds')
 on conflict(asset_id) do update set status='pending',due_at=least(world_inference.cleanup.due_at,excluded.due_at);
 return old;
end $$;
create trigger inference_media_delete before delete on public.inference_media for each row execute function world_inference.before_media_delete();

-- Definer privilege boundary is necessary: clients must never edit money/leases.
-- Private helpers have NO PUBLIC execute; only dedicated worker can invoke them.
revoke all on all tables in schema world_inference from public,anon,authenticated;
revoke all on all functions in schema world_inference from public,anon,authenticated;
revoke all on function public.create_inference_media(text,integer,integer,integer,text),public.submit_inference_job(uuid,text,uuid,text),public.inference_job_status(uuid),public.cancel_inference_job(uuid),public.revoke_inference_media(uuid) from public,anon;
grant execute on function public.create_inference_media(text,integer,integer,integer,text),public.submit_inference_job(uuid,text,uuid,text),public.inference_job_status(uuid),public.cancel_inference_job(uuid),public.revoke_inference_media(uuid) to authenticated;
-- Role has no login/password by migration. Operator provisions a dedicated login
-- inheriting only this role; never grant it to authenticated/anon/authenticator.
do $$ begin if not exists(select from pg_roles where rolname='worldspeak_inference_worker') then create role worldspeak_inference_worker nologin; end if; end $$;
grant usage on schema world_inference to worldspeak_inference_worker;
grant execute on function world_inference.media_ready(uuid),world_inference.claim(),world_inference.heartbeat(uuid,uuid),world_inference.dispatch(uuid,uuid),world_inference.finish(uuid,uuid,text,bigint,jsonb,text),world_inference.sweep(),world_inference.claim_cleanup(),world_inference.finish_cleanup(uuid,uuid,boolean) to worldspeak_inference_worker;

create function world_inference.load_input(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.inference_media;
begin
 select a0.* into a from public.inference_media a0 join public.inference_jobs j on j.asset_id=a0.id and j.owner_id=a0.owner_id
 where j.id=p_id and j.lease_token=p_token and j.status='leased' and j.lease_until>now() and not j.cancel_requested and a0.state='ready' and a0.expires_at>now();
 if not found then return null; end if;
 return to_jsonb(a);
end $$;
revoke all on function world_inference.load_input(uuid,uuid) from public,anon,authenticated;
grant execute on function world_inference.load_input(uuid,uuid) to worldspeak_inference_worker;

create function world_inference.on_consent_change() returns trigger language plpgsql security definer set search_path='' as $$
declare e public.consent_events; a public.inference_media; j public.inference_jobs;
begin
 e:=case when tg_op='DELETE' then old else new end;
 if e.scope<>'scene_upload' or (tg_op='INSERT' and e.decision<>'revoke') then return null; end if;
 perform world_inference.lock_budget();
 for a in select * from public.inference_media where owner_id=e.owner_id and (e.capture_id is null or id=e.capture_id) and state<>'deleted' loop
  update public.inference_media set state='revoked' where id=a.id;
  update world_inference.cleanup set due_at=least(due_at,now()+interval '60 seconds'),status='pending' where asset_id=a.id and status<>'done';
  for j in select * from public.inference_jobs where asset_id=a.id loop
   update public.inference_jobs set cancel_requested=true,result=null where id=j.id;
   if j.status in('queued','leased') then
    perform world_inference.settle(j,0);
    update public.inference_jobs set status='canceled',lease_token=null,lease_until=null where id=j.id;
   elsif j.status='succeeded' then update public.inference_jobs set status='canceled' where id=j.id;
   end if;
  end loop;
 end loop;
 return null;
end $$;
create trigger inference_consent_revoked after insert or delete on public.consent_events for each row execute function world_inference.on_consent_change();
revoke all on function world_inference.on_consent_change() from public,anon,authenticated;

create function world_inference.before_identity_delete() returns trigger language plpgsql security definer set search_path='' as $$
declare j public.inference_jobs;
begin
 perform world_inference.lock_budget();
 for j in select * from public.inference_jobs where owner_id=old.id and not settled loop
  perform world_inference.settle(j,case when j.dispatched_at is null then 0 else j.reserved_micro end);
 end loop;
 insert into world_inference.cleanup(asset_id,path,due_at) select id,path,now()+interval '60 seconds' from public.inference_media where owner_id=old.id
 on conflict(asset_id) do update set status='pending',due_at=least(world_inference.cleanup.due_at,excluded.due_at);
 delete from world_inference.budgets where account=old.id::text;
 return old;
end $$;
create trigger inference_identity_delete before delete on auth.users for each row execute function world_inference.before_identity_delete();
revoke all on function world_inference.before_identity_delete() from public,anon,authenticated;


-- Operator-only first-smoke activation. Never granted to web/user/worker roles.
-- Atomic and one-shot even after all jobs or the Auth identity are deleted.
create function world_inference.authorize_first_smoke(p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 perform world_inference.lock_budget();
 if p_owner is null or not exists(select 1 from auth.users where id=p_owner) then raise exception 'SMOKE_OWNER_NOT_FOUND'; end if;
 if exists(select 1 from world_inference.smoke_authorizations)
    or exists(select 1 from public.inference_jobs where dispatched_at is not null)
    or exists(select 1 from world_inference.credit_events) then raise exception 'SMOKE_ALREADY_USED'; end if;
 if exists(select 1 from public.inference_jobs) then raise exception 'SMOKE_PENDING_JOBS'; end if;
 if (select count(*) from world_inference.generation_permits)<>2
    or exists(select 1 from world_inference.generation_permits where operation not in('scene','segment') or remaining<>0 or owner_id is not null or armed_at is not null or consumed_at is not null)
 then raise exception 'SMOKE_PERMITS_NOT_PRISTINE'; end if;
 if not exists(select 1 from world_inference.budgets where account='global' and limit_micro=0 and spent_micro=0 and reserved_micro=0)
 then raise exception 'SMOKE_GLOBAL_NOT_PRISTINE'; end if;
 if exists(select 1 from world_inference.budgets where account=p_owner::text and (limit_micro<>0 or spent_micro<>0 or reserved_micro<>0))
 then raise exception 'SMOKE_OWNER_NOT_PRISTINE'; end if;
 if exists(select 1 from world_inference.budgets where account not in('global',p_owner::text) and (limit_micro<>0 or spent_micro<>0 or reserved_micro<>0))
 then raise exception 'SMOKE_OTHER_ACCOUNT_NOT_ZERO'; end if;
 insert into world_inference.smoke_authorizations(owner_id,cap_micro,operations) values(p_owner,50000,array['scene','segment']);
 update world_inference.budgets set limit_micro=50000 where account='global';
 insert into world_inference.budgets(account,limit_micro) values(p_owner::text,50000)
 on conflict(account) do update set limit_micro=excluded.limit_micro;
 update world_inference.generation_permits set remaining=1,owner_id=p_owner,armed_at=now()
 where operation in('scene','segment') and remaining=0 and armed_at is null and consumed_at is null and owner_id is null;
 get diagnostics changed=row_count;
 if changed<>2 then raise exception 'SMOKE_SCOPE_MISMATCH'; end if;
end $$;
revoke all on function world_inference.authorize_first_smoke(uuid) from public,anon,authenticated,worldspeak_inference_worker;
