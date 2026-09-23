create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  phone text null,
  status text not null default 'disconnected'
    check (status in ('disconnected','pairing','connected','error')),
  enabled boolean not null default false,
  last_connected_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_session_secrets (
  account_id uuid primary key references public.whatsapp_accounts(id) on delete cascade,
  auth_bundle jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  group_jid text not null,
  name text not null,
  member_count integer not null default 0 check (member_count >= 0),
  niche text not null default 'general',
  active boolean not null default true,
  accepting_traffic boolean not null default true,
  last_synced_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(account_id, group_jid)
);

create index if not exists whatsapp_groups_niche_active_idx
  on public.whatsapp_groups(niche, active, accepting_traffic);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  offer_score_id bigint not null references public.offer_scores(id) on delete restrict,
  offer_snapshot_id bigint not null references public.offer_snapshots(id) on delete restrict,
  affiliate_link_id uuid not null references public.affiliate_links(id) on delete restrict,
  short_link_id uuid not null references public.short_links(id) on delete restrict,
  niche text not null default 'general',
  content text not null,
  status text not null default 'ready'
    check (status in ('draft','ready','queued','partially_sent','sent','cancelled','failed')),
  scheduled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(offer_score_id, short_link_id)
);

create index if not exists posts_status_schedule_idx
  on public.posts(status, scheduled_at, created_at);

create table if not exists public.post_deliveries (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  group_id uuid not null references public.whatsapp_groups(id) on delete restrict,
  account_id uuid not null references public.whatsapp_accounts(id) on delete restrict,
  idempotency_key text not null unique,
  status text not null default 'queued'
    check (status in ('queued','sending','accepted','confirmed','failed','skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz null,
  provider_message_id text null,
  accepted_at timestamptz null,
  confirmed_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_id, group_id)
);

create index if not exists post_deliveries_work_idx
  on public.post_deliveries(status, next_attempt_at, created_at);

alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_session_secrets enable row level security;
alter table public.whatsapp_groups enable row level security;
alter table public.posts enable row level security;
alter table public.post_deliveries enable row level security;

revoke all on table public.whatsapp_accounts from anon, authenticated;
revoke all on table public.whatsapp_session_secrets from anon, authenticated;
revoke all on table public.whatsapp_groups from anon, authenticated;
revoke all on table public.posts from anon, authenticated;
revoke all on table public.post_deliveries from anon, authenticated;

grant select, insert, update, delete on table public.whatsapp_accounts to service_role;
grant select, insert, update, delete on table public.whatsapp_session_secrets to service_role;
grant select, insert, update, delete on table public.whatsapp_groups to service_role;
grant select, insert, update, delete on table public.posts to service_role;
grant select, insert, update, delete on table public.post_deliveries to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.fanout_post(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_row record;
  group_row record;
  delivery_key text;
  inserted_count integer := 0;
  affected integer := 0;
begin
  select id, niche, status into post_row
  from public.posts
  where id = p_post_id;

  if post_row.id is null then
    raise exception 'Post not found: %', p_post_id;
  end if;

  if post_row.status in ('cancelled','sent') then
    return 0;
  end if;

  for group_row in
    select g.id, g.account_id
    from public.whatsapp_groups g
    join public.whatsapp_accounts a on a.id = g.account_id
    where g.active = true
      and a.enabled = true
      and (g.niche = post_row.niche or g.niche = 'general')
  loop
    delivery_key := 'delivery:' || encode(
      digest(post_row.id::text || '|' || group_row.id::text, 'sha256'),
      'hex'
    );

    insert into public.post_deliveries(
      post_id,
      group_id,
      account_id,
      idempotency_key,
      status
    )
    values (
      post_row.id,
      group_row.id,
      group_row.account_id,
      delivery_key,
      'queued'
    )
    on conflict (post_id, group_id) do nothing;

    get diagnostics affected = row_count;
    inserted_count := inserted_count + affected;
  end loop;

  if exists(select 1 from public.post_deliveries where post_id = post_row.id) then
    update public.posts
    set status = case when status = 'ready' then 'queued' else status end,
        updated_at = now()
    where id = post_row.id;
  end if;

  return inserted_count;
end;
$$;

create or replace function public.create_post_with_deliveries(
  p_offer_score_id bigint,
  p_offer_snapshot_id bigint,
  p_affiliate_link_id uuid,
  p_short_link_id uuid,
  p_niche text,
  p_content text,
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_uuid uuid;
begin
  insert into public.posts(
    offer_score_id,
    offer_snapshot_id,
    affiliate_link_id,
    short_link_id,
    niche,
    content,
    status,
    scheduled_at
  )
  values (
    p_offer_score_id,
    p_offer_snapshot_id,
    p_affiliate_link_id,
    p_short_link_id,
    coalesce(nullif(p_niche, ''), 'general'),
    p_content,
    'ready',
    p_scheduled_at
  )
  on conflict (offer_score_id, short_link_id)
  do update set
    content = excluded.content,
    niche = excluded.niche,
    scheduled_at = excluded.scheduled_at,
    updated_at = now()
  returning id into post_uuid;

  perform public.fanout_post(post_uuid);
  return post_uuid;
end;
$$;

create or replace function public.claim_next_delivery()
returns table (
  delivery_id uuid,
  post_id uuid,
  account_id uuid,
  group_id uuid,
  group_jid text,
  content text,
  attempt_count integer,
  idempotency_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_id uuid;
begin
  select d.id into selected_id
  from public.post_deliveries d
  join public.posts p on p.id = d.post_id
  join public.whatsapp_groups g on g.id = d.group_id
  join public.whatsapp_accounts a on a.id = d.account_id
  where d.status in ('queued','failed')
    and (d.next_attempt_at is null or d.next_attempt_at <= now())
    and p.status not in ('cancelled','sent')
    and (p.scheduled_at is null or p.scheduled_at <= now())
    and g.active = true
    and a.enabled = true
  order by coalesce(d.next_attempt_at, d.created_at), d.created_at
  for update of d skip locked
  limit 1;

  if selected_id is null then
    return;
  end if;

  update public.post_deliveries
  set status = 'sending',
      attempt_count = attempt_count + 1,
      last_error = null,
      updated_at = now()
  where id = selected_id;

  return query
  select
    d.id,
    d.post_id,
    d.account_id,
    d.group_id,
    g.group_jid,
    p.content,
    d.attempt_count,
    d.idempotency_key
  from public.post_deliveries d
  join public.posts p on p.id = d.post_id
  join public.whatsapp_groups g on g.id = d.group_id
  where d.id = selected_id;
end;
$$;

create or replace function public.finish_delivery(
  p_delivery_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error text default null,
  p_retry_after_seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_post uuid;
  remaining_count integer;
  success_count integer;
  failed_count integer;
begin
  if p_status not in ('accepted','confirmed','failed','skipped') then
    raise exception 'Invalid delivery status: %', p_status;
  end if;

  update public.post_deliveries
  set status = p_status,
      provider_message_id = coalesce(p_provider_message_id, provider_message_id),
      accepted_at = case
        when p_status in ('accepted','confirmed') and accepted_at is null then now()
        else accepted_at
      end,
      confirmed_at = case
        when p_status = 'confirmed' then now()
        else confirmed_at
      end,
      last_error = p_error,
      next_attempt_at = case
        when p_status = 'failed' and p_retry_after_seconds is not null
          then now() + make_interval(secs => greatest(1, p_retry_after_seconds))
        else null
      end,
      updated_at = now()
  where id = p_delivery_id
  returning post_id into parent_post;

  if parent_post is null then
    raise exception 'Delivery not found: %', p_delivery_id;
  end if;

  select
    count(*) filter (where status in ('queued','sending')),
    count(*) filter (where status in ('accepted','confirmed')),
    count(*) filter (where status = 'failed')
  into remaining_count, success_count, failed_count
  from public.post_deliveries
  where post_id = parent_post;

  update public.posts
  set status = case
      when remaining_count = 0 and failed_count = 0 and success_count > 0 then 'sent'
      when success_count > 0 then 'partially_sent'
      when failed_count > 0 and remaining_count = 0 then 'failed'
      else 'queued'
    end,
    updated_at = now()
  where id = parent_post;
end;
$$;

revoke all on function public.fanout_post(uuid) from public, anon, authenticated;
revoke all on function public.create_post_with_deliveries(bigint, bigint, uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_next_delivery() from public, anon, authenticated;
revoke all on function public.finish_delivery(uuid, text, text, text, integer) from public, anon, authenticated;

grant execute on function public.fanout_post(uuid) to service_role;
grant execute on function public.create_post_with_deliveries(bigint, bigint, uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.claim_next_delivery() to service_role;
grant execute on function public.finish_delivery(uuid, text, text, text, integer) to service_role;
