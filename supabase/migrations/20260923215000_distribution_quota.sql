alter table public.posts
  add column if not exists first_sent_at timestamptz null;

create or replace function public.distribution_quota_status()
returns table (
  sent_today integer,
  sent_current_hour integer,
  daily_limit integer,
  hourly_limit integer,
  allowed boolean
)
language sql
security definer
set search_path = ''
as $$
  with metrics as (
    select
      count(*) filter (
        where (p.first_sent_at at time zone 'America/Sao_Paulo')::date =
              (now() at time zone 'America/Sao_Paulo')::date
      )::integer as today_count,
      count(*) filter (
        where date_trunc('hour', p.first_sent_at at time zone 'America/Sao_Paulo') =
              date_trunc('hour', now() at time zone 'America/Sao_Paulo')
      )::integer as hour_count
    from public.posts p
    where p.first_sent_at is not null
  )
  select
    today_count,
    hour_count,
    35,
    3,
    today_count < 35 and hour_count < 3
  from metrics;
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
  quota record;
begin
  select * into quota from public.distribution_quota_status();

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
    and (
      p.first_sent_at is not null
      or quota.allowed = true
    )
  order by
    case when p.first_sent_at is not null then 0 else 1 end,
    coalesce(d.next_attempt_at, d.created_at),
    d.created_at
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

  if p_status in ('accepted','confirmed') then
    update public.posts
    set first_sent_at = coalesce(first_sent_at, now()),
        updated_at = now()
    where id = parent_post;
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

revoke all on function public.distribution_quota_status() from public, anon, authenticated;
grant execute on function public.distribution_quota_status() to service_role;
