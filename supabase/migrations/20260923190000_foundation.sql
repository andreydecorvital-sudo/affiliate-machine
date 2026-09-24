create extension if not exists pgcrypto;
create extension if not exists pgmq;
create extension if not exists pg_cron;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  sensitive boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.system_idempotency (
  key text primary key,
  scope text not null,
  payload_hash text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create table if not exists public.universal_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null,
  entity_type text null,
  entity_id text null,
  idempotency_key text null unique,
  correlation_id text null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists universal_events_type_time_idx
  on public.universal_events (event_type, occurred_at desc);

create index if not exists universal_events_entity_idx
  on public.universal_events (entity_type, entity_id, occurred_at desc);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_type text not null check (actor_type in ('user','system','job','provider')),
  actor_id text null,
  action text not null,
  target_type text null,
  target_id text null,
  correlation_id text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_target_idx
  on public.audit_log (target_type, target_id, created_at desc);

create table if not exists public.health_snapshots (
  id bigint generated always as identity primary key,
  component text not null,
  state text not null check (state in ('ok','degraded','down','unknown')),
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists health_snapshots_component_idx
  on public.health_snapshots (component, checked_at desc);

alter table public.app_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.system_idempotency enable row level security;
alter table public.universal_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.health_snapshots enable row level security;

revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.feature_flags from anon, authenticated;
revoke all on table public.system_idempotency from anon, authenticated;
revoke all on table public.universal_events from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.health_snapshots from anon, authenticated;

grant select, insert, update, delete on table public.app_settings to service_role;
grant select, insert, update, delete on table public.feature_flags to service_role;
grant select, insert, update, delete on table public.system_idempotency to service_role;
grant select, insert, update, delete on table public.universal_events to service_role;
grant select, insert, update, delete on table public.audit_log to service_role;
grant select, insert, update, delete on table public.health_snapshots to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into public.app_settings (key, value)
values ('system.version', '{"version":"0.1.0","phase":"foundation"}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

insert into public.feature_flags (key, enabled, metadata)
values
  ('autopilot', false, '{"description":"Global autonomous execution gate"}'::jsonb),
  ('whatsapp_real_send', false, '{"description":"Allows real WhatsApp sends"}'::jsonb),
  ('meta_ads_write', false, '{"description":"Allows Meta Ads mutations"}'::jsonb)
on conflict (key) do nothing;

select pgmq.create('offer_hunting');
select pgmq.create('offer_revalidation');
select pgmq.create('creative_generation');
select pgmq.create('post_distribution');
select pgmq.create('conversion_sync');
select pgmq.create('analytics_rollup');

create or replace function public.enqueue_job(
  queue_name text,
  message jsonb,
  delay_seconds integer default 0
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id bigint;
begin
  if not (queue_name = any(array[
    'offer_hunting',
    'offer_revalidation',
    'creative_generation',
    'post_distribution',
    'conversion_sync',
    'analytics_rollup'
  ])) then
    raise exception 'Queue not allowed: %', queue_name;
  end if;

  select * into new_id
  from pgmq.send(queue_name, message, greatest(delay_seconds, 0));

  return new_id;
end;
$$;

create or replace function public.read_jobs(
  queue_name text,
  visibility_seconds integer default 60,
  batch_size integer default 1
)
returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (queue_name = any(array[
    'offer_hunting',
    'offer_revalidation',
    'creative_generation',
    'post_distribution',
    'conversion_sync',
    'analytics_rollup'
  ])) then
    raise exception 'Queue not allowed: %', queue_name;
  end if;

  return query
  select q.msg_id, q.read_ct, q.enqueued_at, q.vt, q.message
  from pgmq.read(
    queue_name,
    greatest(visibility_seconds, 1),
    greatest(least(batch_size, 25), 1)
  ) q;
end;
$$;

create or replace function public.archive_job(queue_name text, message_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  archived boolean;
begin
  if not (queue_name = any(array[
    'offer_hunting',
    'offer_revalidation',
    'creative_generation',
    'post_distribution',
    'conversion_sync',
    'analytics_rollup'
  ])) then
    raise exception 'Queue not allowed: %', queue_name;
  end if;

  select pgmq.archive(queue_name, message_id) into archived;
  return archived;
end;
$$;

create or replace function public.claim_idempotency(
  idempotency_key text,
  idempotency_scope text,
  hash_value text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_rows integer;
begin
  insert into public.system_idempotency(key, scope, payload_hash)
  values (idempotency_key, idempotency_scope, hash_value)
  on conflict (key) do nothing;

  get diagnostics inserted_rows = row_count;
  return inserted_rows = 1;
end;
$$;

create or replace function public.record_event(
  p_event_type text,
  p_source text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_idempotency_key text default null,
  p_correlation_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id uuid;
begin
  insert into public.universal_events(
    event_type,
    source,
    entity_type,
    entity_id,
    idempotency_key,
    correlation_id,
    payload
  )
  values (
    p_event_type,
    p_source,
    p_entity_type,
    p_entity_id,
    p_idempotency_key,
    p_correlation_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (idempotency_key)
  do update set idempotency_key = excluded.idempotency_key
  returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.enqueue_job(text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.read_jobs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.archive_job(text, bigint) from public, anon, authenticated;
revoke all on function public.claim_idempotency(text, text, text) from public, anon, authenticated;
revoke all on function public.record_event(text, text, text, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.enqueue_job(text, jsonb, integer) to service_role;
grant execute on function public.read_jobs(text, integer, integer) to service_role;
grant execute on function public.archive_job(text, bigint) to service_role;
grant execute on function public.claim_idempotency(text, text, text) to service_role;
grant execute on function public.record_event(text, text, text, text, text, text, jsonb) to service_role;
