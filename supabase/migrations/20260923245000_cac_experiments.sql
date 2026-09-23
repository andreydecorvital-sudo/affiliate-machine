create table if not exists public.paid_traffic_spend (
  id bigint generated always as identity primary key,
  provider text not null,
  external_account_id text null,
  external_campaign_id text not null,
  campaign_id uuid null references public.traffic_campaigns(id) on delete set null,
  spent_on date not null,
  currency text not null default 'BRL' check (char_length(currency) = 3),
  spend numeric(18,6) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  platform_clicks bigint not null default 0 check (platform_clicks >= 0),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, external_campaign_id, spent_on, currency)
);

create index if not exists paid_traffic_spend_campaign_date_idx
  on public.paid_traffic_spend(campaign_id, spent_on desc);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'message_copy'
    check (kind in ('message_copy')),
  niche text null,
  objective text not null default 'rpc'
    check (objective in ('rpc','cvr','commission_per_delivery')),
  status text not null default 'draft'
    check (status in ('draft','running','paused','completed')),
  min_clicks_per_variant integer not null default 30
    check (min_clicks_per_variant between 5 and 100000),
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.experiment_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  variant_key text not null,
  label text not null,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(experiment_id, variant_key)
);

create table if not exists public.experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  variant_id uuid not null references public.experiment_variants(id) on delete cascade,
  delivery_id uuid not null unique references public.post_deliveries(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

create index if not exists experiments_running_niche_idx
  on public.experiments(status, niche, created_at);

create index if not exists experiment_assignments_experiment_variant_idx
  on public.experiment_assignments(experiment_id, variant_id);

alter table public.paid_traffic_spend enable row level security;
alter table public.experiments enable row level security;
alter table public.experiment_variants enable row level security;
alter table public.experiment_assignments enable row level security;

revoke all on table public.paid_traffic_spend from anon, authenticated;
revoke all on table public.experiments from anon, authenticated;
revoke all on table public.experiment_variants from anon, authenticated;
revoke all on table public.experiment_assignments from anon, authenticated;

grant select, insert, update, delete on table public.paid_traffic_spend to service_role;
grant select, insert, update, delete on table public.experiments to service_role;
grant select, insert, update, delete on table public.experiment_variants to service_role;
grant select, insert, update, delete on table public.experiment_assignments to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.assign_message_experiment(p_delivery_id uuid)
returns table (
  experiment_id uuid,
  experiment_name text,
  objective text,
  min_clicks_per_variant integer,
  variant_id uuid,
  variant_key text,
  variant_label text,
  variant_config jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing record;
  chosen_experiment record;
  chosen_variant record;
  variant_count integer;
  slot integer;
  delivery_niche text;
begin
  select
    ea.experiment_id,
    e.name as experiment_name,
    e.objective,
    e.min_clicks_per_variant,
    ev.id as variant_id,
    ev.variant_key,
    ev.label as variant_label,
    ev.config as variant_config
  into existing
  from public.experiment_assignments ea
  join public.experiments e on e.id = ea.experiment_id
  join public.experiment_variants ev on ev.id = ea.variant_id
  where ea.delivery_id = p_delivery_id
  limit 1;

  if existing.experiment_id is not null then
    return query select
      existing.experiment_id,
      existing.experiment_name,
      existing.objective,
      existing.min_clicks_per_variant,
      existing.variant_id,
      existing.variant_key,
      existing.variant_label,
      existing.variant_config;
    return;
  end if;

  select p.niche
  into delivery_niche
  from public.post_deliveries d
  join public.posts p on p.id = d.post_id
  where d.id = p_delivery_id
  limit 1;

  if delivery_niche is null then
    return;
  end if;

  select e.*
  into chosen_experiment
  from public.experiments e
  where e.status = 'running'
    and e.kind = 'message_copy'
    and (e.niche is null or e.niche = delivery_niche)
    and (e.starts_at is null or e.starts_at <= now())
    and (e.ends_at is null or e.ends_at > now())
    and (
      select count(*)
      from public.experiment_variants ev
      where ev.experiment_id = e.id
        and ev.active = true
    ) >= 2
  order by
    case when e.niche = delivery_niche then 0 else 1 end,
    e.created_at asc
  limit 1;

  if chosen_experiment.id is null then
    return;
  end if;

  select count(*)::integer
  into variant_count
  from public.experiment_variants ev
  where ev.experiment_id = chosen_experiment.id
    and ev.active = true;

  slot := mod(
    abs(hashtextextended(
      p_delivery_id::text || '|' || chosen_experiment.id::text,
      0
    )),
    variant_count
  )::integer;

  select ranked.*
  into chosen_variant
  from (
    select
      ev.*,
      row_number() over (order by ev.variant_key, ev.id) - 1 as zero_index
    from public.experiment_variants ev
    where ev.experiment_id = chosen_experiment.id
      and ev.active = true
  ) ranked
  where ranked.zero_index = slot
  limit 1;

  insert into public.experiment_assignments(
    experiment_id,
    variant_id,
    delivery_id
  )
  values(
    chosen_experiment.id,
    chosen_variant.id,
    p_delivery_id
  )
  on conflict (delivery_id) do nothing;

  return query
  select
    chosen_experiment.id,
    chosen_experiment.name,
    chosen_experiment.objective,
    chosen_experiment.min_clicks_per_variant,
    chosen_variant.id,
    chosen_variant.variant_key,
    chosen_variant.label,
    chosen_variant.config;
end;
$$;

create or replace function public.experiment_performance(p_experiment_id uuid)
returns table (
  variant_id uuid,
  variant_key text,
  variant_label text,
  assigned_deliveries bigint,
  successful_deliveries bigint,
  clicks bigint,
  conversions bigint,
  commission numeric,
  cvr numeric,
  rpc numeric,
  commission_per_delivery numeric,
  sample_ready boolean
)
language sql
security definer
set search_path = ''
as $$
  with variant_base as (
    select ev.id, ev.variant_key, ev.label
    from public.experiment_variants ev
    where ev.experiment_id = p_experiment_id
  ),
  assignment_agg as (
    select
      ea.variant_id,
      count(*)::bigint as assigned_deliveries,
      count(*) filter (
        where d.status in ('accepted','confirmed')
      )::bigint as successful_deliveries
    from public.experiment_assignments ea
    join public.post_deliveries d on d.id = ea.delivery_id
    where ea.experiment_id = p_experiment_id
    group by ea.variant_id
  ),
  click_agg as (
    select
      ea.variant_id,
      count(ce.id)::bigint as clicks
    from public.experiment_assignments ea
    join public.post_deliveries d on d.id = ea.delivery_id
    join public.click_events ce on ce.short_link_id = d.short_link_id
    where ea.experiment_id = p_experiment_id
      and ce.is_bot = false
    group by ea.variant_id
  ),
  conversion_agg as (
    select
      ea.variant_id,
      count(distinct ca.conversion_id)::bigint as conversions,
      coalesce(
        sum(l.amount) filter (where l.status <> 'rejected'),
        0
      )::numeric as commission
    from public.experiment_assignments ea
    join public.post_deliveries d on d.id = ea.delivery_id
    join public.conversion_attributions ca on ca.delivery_id = d.id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    where ea.experiment_id = p_experiment_id
    group by ea.variant_id
  ),
  experiment_config as (
    select min_clicks_per_variant
    from public.experiments
    where id = p_experiment_id
  )
  select
    vb.id,
    vb.variant_key,
    vb.label,
    coalesce(a.assigned_deliveries, 0),
    coalesce(a.successful_deliveries, 0),
    coalesce(cl.clicks, 0),
    coalesce(cv.conversions, 0),
    coalesce(cv.commission, 0),
    case
      when coalesce(cl.clicks, 0) > 0
      then round(coalesce(cv.conversions, 0)::numeric / cl.clicks::numeric, 8)
      else 0
    end,
    case
      when coalesce(cl.clicks, 0) > 0
      then round(coalesce(cv.commission, 0) / cl.clicks::numeric, 8)
      else 0
    end,
    case
      when coalesce(a.successful_deliveries, 0) > 0
      then round(
        coalesce(cv.commission, 0) / a.successful_deliveries::numeric,
        8
      )
      else 0
    end,
    coalesce(cl.clicks, 0) >= ec.min_clicks_per_variant
  from variant_base vb
  cross join experiment_config ec
  left join assignment_agg a on a.variant_id = vb.id
  left join click_agg cl on cl.variant_id = vb.id
  left join conversion_agg cv on cv.variant_id = vb.id
  order by vb.variant_key;
$$;

create or replace function public.paid_campaign_performance(p_days integer default 30)
returns table (
  campaign_id uuid,
  campaign_key text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  spend numeric,
  impressions bigint,
  platform_clicks bigint,
  routed_visits bigint,
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
      pts.campaign_id,
      sum(pts.spend)::numeric as spend,
      sum(pts.impressions)::bigint as impressions,
      sum(pts.platform_clicks)::bigint as platform_clicks
    from public.paid_traffic_spend pts, bounds
    where pts.spent_on >= bounds.start_date
      and pts.campaign_id is not null
    group by pts.campaign_id
  ),
  visit_agg as (
    select
      av.campaign_id,
      count(*) filter (
        where av.routed = true
          and av.user_agent_family <> 'bot'
      )::bigint as routed_visits
    from public.acquisition_visits av, bounds
    where (av.created_at at time zone 'America/Sao_Paulo')::date
      >= bounds.start_date
      and av.campaign_id is not null
    group by av.campaign_id
  )
  select
    tc.id,
    tc.campaign_key,
    tc.utm_source,
    tc.utm_medium,
    tc.utm_campaign,
    coalesce(sa.spend, 0),
    coalesce(sa.impressions, 0),
    coalesce(sa.platform_clicks, 0),
    coalesce(va.routed_visits, 0),
    case
      when coalesce(va.routed_visits, 0) > 0
      then round(coalesce(sa.spend, 0) / va.routed_visits::numeric, 8)
      else 0
    end
  from public.traffic_campaigns tc
  left join spend_agg sa on sa.campaign_id = tc.id
  left join visit_agg va on va.campaign_id = tc.id
  where coalesce(sa.spend, 0) > 0
    or coalesce(va.routed_visits, 0) > 0
  order by coalesce(sa.spend, 0) desc, tc.created_at desc;
$$;

create or replace function public.paid_group_economics(p_days integer default 30)
returns table (
  group_id uuid,
  group_name text,
  niche text,
  routed_paid_visits bigint,
  modeled_spend numeric,
  attributed_commission numeric,
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
  spend_daily as (
    select
      pts.campaign_id,
      pts.spent_on,
      sum(pts.spend)::numeric as spend
    from public.paid_traffic_spend pts, bounds
    where pts.spent_on >= bounds.start_date
      and pts.campaign_id is not null
    group by pts.campaign_id, pts.spent_on
  ),
  visits_daily as (
    select
      av.campaign_id,
      av.group_id,
      (av.created_at at time zone 'America/Sao_Paulo')::date as visit_date,
      count(*)::bigint as visits
    from public.acquisition_visits av, bounds
    where (av.created_at at time zone 'America/Sao_Paulo')::date
      >= bounds.start_date
      and av.campaign_id is not null
      and av.group_id is not null
      and av.routed = true
      and av.user_agent_family <> 'bot'
    group by
      av.campaign_id,
      av.group_id,
      (av.created_at at time zone 'America/Sao_Paulo')::date
  ),
  visit_totals as (
    select
      campaign_id,
      visit_date,
      sum(visits)::bigint as total_visits
    from visits_daily
    group by campaign_id, visit_date
  ),
  allocation as (
    select
      vd.group_id,
      sum(vd.visits)::bigint as routed_paid_visits,
      sum(
        sd.spend
        * vd.visits::numeric
        / greatest(vt.total_visits, 1)::numeric
      )::numeric as modeled_spend
    from visits_daily vd
    join visit_totals vt
      on vt.campaign_id = vd.campaign_id
     and vt.visit_date = vd.visit_date
    join spend_daily sd
      on sd.campaign_id = vd.campaign_id
     and sd.spent_on = vd.visit_date
    group by vd.group_id
  ),
  commission_by_group as (
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
    where (c.purchase_at at time zone 'America/Sao_Paulo')::date
      >= bounds.start_date
    group by d.group_id
  )
  select
    g.id,
    g.name,
    g.niche,
    coalesce(a.routed_paid_visits, 0),
    round(coalesce(a.modeled_spend, 0), 6),
    round(coalesce(cg.commission, 0), 6),
    round(coalesce(cg.commission, 0) - coalesce(a.modeled_spend, 0), 6),
    case
      when coalesce(a.modeled_spend, 0) > 0
      then round(coalesce(cg.commission, 0) / a.modeled_spend, 8)
      else 0
    end,
    case
      when coalesce(a.routed_paid_visits, 0) > 0
      then round(
        coalesce(a.modeled_spend, 0)
        / a.routed_paid_visits::numeric,
        8
      )
      else 0
    end
  from public.whatsapp_groups g
  left join allocation a on a.group_id = g.id
  left join commission_by_group cg on cg.group_id = g.id
  where coalesce(a.modeled_spend, 0) > 0
    or coalesce(cg.commission, 0) > 0
  order by
    (coalesce(cg.commission, 0) - coalesce(a.modeled_spend, 0)) desc,
    coalesce(cg.commission, 0) desc;
$$;

revoke all on function public.assign_message_experiment(uuid)
  from public, anon, authenticated;
revoke all on function public.experiment_performance(uuid)
  from public, anon, authenticated;
revoke all on function public.paid_campaign_performance(integer)
  from public, anon, authenticated;
revoke all on function public.paid_group_economics(integer)
  from public, anon, authenticated;

grant execute on function public.assign_message_experiment(uuid) to service_role;
grant execute on function public.experiment_performance(uuid) to service_role;
grant execute on function public.paid_campaign_performance(integer) to service_role;
grant execute on function public.paid_group_economics(integer) to service_role;
