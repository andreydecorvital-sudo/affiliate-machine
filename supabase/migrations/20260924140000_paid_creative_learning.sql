create table if not exists public.paid_creatives (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_account_id text not null,
  external_campaign_id text not null,
  external_adset_id text null,
  external_ad_id text not null,
  external_creative_id text null,
  campaign_id uuid null references public.traffic_campaigns(id) on delete set null,
  creative_key text null,
  campaign_name text null,
  adset_name text null,
  ad_name text null,
  creative_name text null,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, external_account_id, external_ad_id)
);

create unique index if not exists paid_creatives_campaign_key_unique_idx
  on public.paid_creatives(campaign_id, creative_key)
  where campaign_id is not null and creative_key is not null;

create index if not exists paid_creatives_campaign_idx
  on public.paid_creatives(campaign_id, last_seen_at desc);

create table if not exists public.paid_creative_spend (
  id bigint generated always as identity primary key,
  paid_creative_id uuid not null
    references public.paid_creatives(id) on delete cascade,
  provider text not null,
  external_account_id text not null,
  external_campaign_id text not null,
  external_adset_id text null,
  external_ad_id text not null,
  spent_on date not null,
  currency text not null default 'BRL'
    check (char_length(currency) = 3),
  spend numeric(18,6) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  platform_clicks bigint not null default 0 check (platform_clicks >= 0),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(
    provider,
    external_account_id,
    external_ad_id,
    spent_on,
    currency
  )
);

create index if not exists paid_creative_spend_creative_date_idx
  on public.paid_creative_spend(paid_creative_id, spent_on desc);

create table if not exists public.paid_creative_metrics (
  paid_creative_id uuid primary key
    references public.paid_creatives(id) on delete cascade,
  period_days integer not null,
  spend numeric(18,6) not null default 0,
  impressions bigint not null default 0,
  platform_clicks bigint not null default 0,
  routed_visits bigint not null default 0,
  modeled_commission numeric(18,6) not null default 0,
  modeled_net_commission numeric(18,6) not null default 0,
  modeled_commission_roas numeric(18,8) null,
  cost_per_routed_visit numeric(18,8) null,
  raw_net_per_routed_visit numeric(18,8) null,
  smoothed_net_per_routed_visit numeric(18,8) null,
  sample_confidence numeric(8,6) not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists paid_creative_metrics_rank_idx
  on public.paid_creative_metrics(
    sample_confidence desc,
    smoothed_net_per_routed_visit desc
  );

alter table public.paid_creatives enable row level security;
alter table public.paid_creative_spend enable row level security;
alter table public.paid_creative_metrics enable row level security;

revoke all on table public.paid_creatives from anon, authenticated;
revoke all on table public.paid_creative_spend from anon, authenticated;
revoke all on table public.paid_creative_metrics from anon, authenticated;

grant select, insert, update, delete on table public.paid_creatives to service_role;
grant select, insert, update, delete on table public.paid_creative_spend to service_role;
grant select, insert, update, delete on table public.paid_creative_metrics to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.link_paid_creative(
  p_paid_creative_id uuid,
  p_campaign_key text,
  p_creative_key text
)
returns table (
  paid_creative_id uuid,
  campaign_id uuid,
  campaign_key text,
  creative_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_campaign uuid;
  clean_campaign_key text;
  clean_creative_key text;
begin
  clean_campaign_key := nullif(trim(p_campaign_key), '');
  clean_creative_key := nullif(trim(p_creative_key), '');

  if clean_campaign_key is null then
    raise exception 'campaign_key is required';
  end if;

  if clean_creative_key is null then
    raise exception 'creative_key is required';
  end if;

  if not exists (
    select 1
    from public.paid_creatives pc
    where pc.id = p_paid_creative_id
  ) then
    raise exception 'paid creative not found: %', p_paid_creative_id;
  end if;

  insert into public.traffic_campaigns(campaign_key)
  values(clean_campaign_key)
  on conflict on constraint traffic_campaigns_campaign_key_key do nothing;

  select tc.id
  into target_campaign
  from public.traffic_campaigns tc
  where tc.campaign_key = clean_campaign_key
  limit 1;

  update public.paid_creatives
  set campaign_id = target_campaign,
      creative_key = clean_creative_key,
      updated_at = now()
  where id = p_paid_creative_id;

  return query
  select
    p_paid_creative_id,
    target_campaign,
    clean_campaign_key,
    clean_creative_key;
end;
$$;

create or replace function public.unlink_paid_creative(
  p_paid_creative_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.paid_creatives
  set campaign_id = null,
      creative_key = null,
      updated_at = now()
  where id = p_paid_creative_id;

  return found;
end;
$$;

create or replace function public.paid_creative_performance(
  p_days integer default 30
)
returns table (
  paid_creative_id uuid,
  provider text,
  campaign_id uuid,
  creative_key text,
  campaign_name text,
  adset_name text,
  ad_name text,
  external_ad_id text,
  spend numeric,
  impressions bigint,
  platform_clicks bigint,
  routed_visits bigint,
  modeled_commission numeric,
  modeled_net_commission numeric,
  modeled_commission_roas numeric,
  cost_per_routed_visit numeric
)
language sql
security definer
set search_path = ''
as $$
  with bounds as (
    select
      current_date - greatest(1, least(coalesce(p_days, 30), 365)) + 1
      as start_date
  ),
  spend_agg as (
    select
      pcs.paid_creative_id,
      sum(pcs.spend)::numeric as spend,
      sum(pcs.impressions)::bigint as impressions,
      sum(pcs.platform_clicks)::bigint as platform_clicks
    from public.paid_creative_spend pcs, bounds
    where pcs.spent_on >= bounds.start_date
    group by pcs.paid_creative_id
  ),
  creative_group_visits as (
    select
      pc.id as paid_creative_id,
      av.group_id,
      count(*)::bigint as visits
    from public.paid_creatives pc
    join public.acquisition_visits av
      on av.campaign_id = pc.campaign_id
     and av.utm_content = pc.creative_key
    cross join bounds
    where pc.campaign_id is not null
      and pc.creative_key is not null
      and av.group_id is not null
      and av.routed = true
      and av.user_agent_family <> 'bot'
      and (av.created_at at time zone 'America/Sao_Paulo')::date
        >= bounds.start_date
    group by pc.id, av.group_id
  ),
  group_visit_totals as (
    select
      cgv.group_id,
      sum(cgv.visits)::bigint as total_visits
    from creative_group_visits cgv
    group by cgv.group_id
  ),
  group_commission as (
    select
      d.group_id,
      coalesce(
        sum(l.amount) filter (where l.status <> 'rejected'),
        0
      )::numeric as commission
    from public.conversion_attributions ca
    join public.post_deliveries d on d.id = ca.delivery_id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    cross join bounds
    where d.group_id is not null
      and (c.purchase_at at time zone 'America/Sao_Paulo')::date
        >= bounds.start_date
    group by d.group_id
  ),
  creative_visits_and_commission as (
    select
      cgv.paid_creative_id,
      sum(cgv.visits)::bigint as routed_visits,
      sum(
        coalesce(gc.commission, 0)
        * cgv.visits::numeric
        / greatest(gvt.total_visits, 1)::numeric
      )::numeric as modeled_commission
    from creative_group_visits cgv
    join group_visit_totals gvt on gvt.group_id = cgv.group_id
    left join group_commission gc on gc.group_id = cgv.group_id
    group by cgv.paid_creative_id
  )
  select
    pc.id,
    pc.provider,
    pc.campaign_id,
    pc.creative_key,
    pc.campaign_name,
    pc.adset_name,
    pc.ad_name,
    pc.external_ad_id,
    round(coalesce(sa.spend, 0), 6),
    coalesce(sa.impressions, 0),
    coalesce(sa.platform_clicks, 0),
    coalesce(cvc.routed_visits, 0),
    round(coalesce(cvc.modeled_commission, 0), 6),
    round(
      coalesce(cvc.modeled_commission, 0) - coalesce(sa.spend, 0),
      6
    ),
    case
      when coalesce(sa.spend, 0) > 0
      then round(
        coalesce(cvc.modeled_commission, 0) / sa.spend,
        8
      )
      else null
    end,
    case
      when coalesce(cvc.routed_visits, 0) > 0
      then round(
        coalesce(sa.spend, 0) / cvc.routed_visits::numeric,
        8
      )
      else null
    end
  from public.paid_creatives pc
  left join spend_agg sa on sa.paid_creative_id = pc.id
  left join creative_visits_and_commission cvc
    on cvc.paid_creative_id = pc.id
  where coalesce(sa.spend, 0) > 0
     or coalesce(cvc.routed_visits, 0) > 0
  order by
    (
      coalesce(cvc.modeled_commission, 0) - coalesce(sa.spend, 0)
    ) desc,
    coalesce(sa.spend, 0) desc;
$$;

create or replace function public.refresh_paid_creative_learning(
  p_days integer default 30
)
returns table (
  creative_rows integer,
  global_routed_visits bigint,
  global_modeled_net numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_days integer := greatest(7, least(coalesce(p_days, 30), 365));
  refreshed_at timestamptz := clock_timestamp();
  row_count_value integer := 0;
  global_visits bigint := 0;
  global_net numeric := 0;
  global_net_per_visit numeric := 0;
  prior_visits numeric := 20;
begin
  select
    coalesce(sum(p.routed_visits), 0)::bigint,
    coalesce(sum(p.modeled_net_commission), 0)::numeric
  into global_visits, global_net
  from public.paid_creative_performance(safe_days) p;

  if global_visits > 0 then
    global_net_per_visit := global_net / global_visits::numeric;
  end if;

  insert into public.paid_creative_metrics(
    paid_creative_id,
    period_days,
    spend,
    impressions,
    platform_clicks,
    routed_visits,
    modeled_commission,
    modeled_net_commission,
    modeled_commission_roas,
    cost_per_routed_visit,
    raw_net_per_routed_visit,
    smoothed_net_per_routed_visit,
    sample_confidence,
    updated_at
  )
  select
    p.paid_creative_id,
    safe_days,
    p.spend,
    p.impressions,
    p.platform_clicks,
    p.routed_visits,
    p.modeled_commission,
    p.modeled_net_commission,
    p.modeled_commission_roas,
    p.cost_per_routed_visit,
    case
      when p.routed_visits > 0
      then round(
        p.modeled_net_commission / p.routed_visits::numeric,
        8
      )
      else null
    end,
    case
      when p.routed_visits >= 5
      then round(
        (
          p.modeled_net_commission
          + global_net_per_visit * prior_visits
        ) / (p.routed_visits::numeric + prior_visits),
        8
      )
      else null
    end,
    least(1, p.routed_visits::numeric / 50),
    refreshed_at
  from public.paid_creative_performance(safe_days) p
  on conflict (paid_creative_id)
  do update set
    period_days = excluded.period_days,
    spend = excluded.spend,
    impressions = excluded.impressions,
    platform_clicks = excluded.platform_clicks,
    routed_visits = excluded.routed_visits,
    modeled_commission = excluded.modeled_commission,
    modeled_net_commission = excluded.modeled_net_commission,
    modeled_commission_roas = excluded.modeled_commission_roas,
    cost_per_routed_visit = excluded.cost_per_routed_visit,
    raw_net_per_routed_visit = excluded.raw_net_per_routed_visit,
    smoothed_net_per_routed_visit = excluded.smoothed_net_per_routed_visit,
    sample_confidence = excluded.sample_confidence,
    updated_at = excluded.updated_at;

  get diagnostics row_count_value = row_count;

  delete from public.paid_creative_metrics
  where updated_at < refreshed_at;

  return query
  select row_count_value, global_visits, global_net;
end;
$$;

revoke all on function public.link_paid_creative(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.unlink_paid_creative(uuid)
  from public, anon, authenticated;
revoke all on function public.paid_creative_performance(integer)
  from public, anon, authenticated;
revoke all on function public.refresh_paid_creative_learning(integer)
  from public, anon, authenticated;

grant execute on function public.link_paid_creative(uuid, text, text)
  to service_role;
grant execute on function public.unlink_paid_creative(uuid)
  to service_role;
grant execute on function public.paid_creative_performance(integer)
  to service_role;
grant execute on function public.refresh_paid_creative_learning(integer)
  to service_role;
