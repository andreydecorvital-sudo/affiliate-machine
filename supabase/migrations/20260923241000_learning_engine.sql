create table if not exists public.learning_product_metrics (
  product_id uuid primary key references public.affiliate_products(id) on delete cascade,
  period_days integer not null,
  successful_deliveries bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  commission numeric(18,6) not null default 0,
  raw_cvr numeric(18,8) null,
  smoothed_cvr numeric(18,8) null,
  raw_rpc numeric(18,8) null,
  smoothed_rpc numeric(18,8) null,
  sample_confidence numeric(8,6) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_strategy_metrics (
  strategy_id uuid primary key references public.hunter_strategies(id) on delete cascade,
  period_days integer not null,
  published_products bigint not null default 0,
  successful_deliveries bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  commission numeric(18,6) not null default 0,
  raw_cvr numeric(18,8) null,
  smoothed_cvr numeric(18,8) null,
  raw_rpc numeric(18,8) null,
  smoothed_rpc numeric(18,8) null,
  sample_confidence numeric(8,6) not null default 0,
  performance_index numeric(8,6) null,
  updated_at timestamptz not null default now()
);

alter table public.learning_product_metrics enable row level security;
alter table public.learning_strategy_metrics enable row level security;

revoke all on table public.learning_product_metrics from anon, authenticated;
revoke all on table public.learning_strategy_metrics from anon, authenticated;

grant select, insert, update, delete on table public.learning_product_metrics to service_role;
grant select, insert, update, delete on table public.learning_strategy_metrics to service_role;

create index if not exists learning_product_metrics_rpc_idx
  on public.learning_product_metrics(smoothed_rpc desc nulls last);

create index if not exists learning_strategy_metrics_index_idx
  on public.learning_strategy_metrics(performance_index desc nulls last);

create or replace function public.refresh_learning_metrics(p_days integer default 90)
returns table (
  product_rows integer,
  strategy_rows integer,
  global_clicks bigint,
  global_conversions bigint,
  global_commission numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_days integer := greatest(7, least(coalesce(p_days, 90), 365));
  since_at timestamptz;
  refresh_started timestamptz := clock_timestamp();
  global_click_count bigint := 0;
  global_conversion_count bigint := 0;
  global_commission_total numeric := 0;
  global_cvr numeric := null;
  global_rpc numeric := null;
  product_count integer := 0;
  strategy_count integer := 0;
  prior_clicks numeric := 20;
begin
  since_at := now() - make_interval(days => safe_days);

  select count(ce.id)::bigint
  into global_click_count
  from public.click_events ce
  join public.post_deliveries d on d.short_link_id = ce.short_link_id
  where ce.is_bot = false
    and ce.occurred_at >= since_at
    and d.accepted_at >= since_at
    and d.status in ('accepted','confirmed');

  select
    count(distinct c.id)::bigint,
    coalesce(sum(l.amount) filter (where l.status <> 'rejected'), 0)::numeric
  into global_conversion_count, global_commission_total
  from public.conversion_attributions ca
  join public.post_deliveries d on d.id = ca.delivery_id
  join public.conversions c on c.id = ca.conversion_id
  left join public.commission_ledger l on l.conversion_id = c.id
  where c.purchase_at >= since_at
    and d.accepted_at >= since_at
    and d.status in ('accepted','confirmed');

  if global_click_count > 0 then
    global_cvr := global_conversion_count::numeric / global_click_count::numeric;
    global_rpc := global_commission_total / global_click_count::numeric;
  end if;

  with delivery_base as (
    select
      d.id as delivery_id,
      d.short_link_id,
      p.id as post_id,
      s.product_id,
      s.discovery_strategy_id
    from public.post_deliveries d
    join public.posts p on p.id = d.post_id
    join public.offer_snapshots s on s.id = p.offer_snapshot_id
    where d.accepted_at >= since_at
      and d.status in ('accepted','confirmed')
  ),
  delivery_agg as (
    select product_id, count(*)::bigint as successful_deliveries
    from delivery_base
    group by product_id
  ),
  click_agg as (
    select db.product_id, count(ce.id)::bigint as clicks
    from delivery_base db
    join public.click_events ce on ce.short_link_id = db.short_link_id
    where ce.is_bot = false
      and ce.occurred_at >= since_at
    group by db.product_id
  ),
  conversion_agg as (
    select
      db.product_id,
      count(distinct ca.conversion_id)::bigint as conversions,
      coalesce(sum(l.amount) filter (where l.status <> 'rejected'), 0)::numeric as commission
    from delivery_base db
    join public.conversion_attributions ca on ca.delivery_id = db.delivery_id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    where c.purchase_at >= since_at
    group by db.product_id
  ),
  combined as (
    select
      p.id as product_id,
      coalesce(d.successful_deliveries, 0)::bigint as successful_deliveries,
      coalesce(cl.clicks, 0)::bigint as clicks,
      coalesce(cv.conversions, 0)::bigint as conversions,
      coalesce(cv.commission, 0)::numeric as commission
    from public.affiliate_products p
    left join delivery_agg d on d.product_id = p.id
    left join click_agg cl on cl.product_id = p.id
    left join conversion_agg cv on cv.product_id = p.id
    where
      coalesce(d.successful_deliveries, 0) > 0
      or coalesce(cl.clicks, 0) > 0
      or coalesce(cv.conversions, 0) > 0
  )
  insert into public.learning_product_metrics(
    product_id, period_days, successful_deliveries, clicks, conversions,
    commission, raw_cvr, smoothed_cvr, raw_rpc, smoothed_rpc,
    sample_confidence, updated_at
  )
  select
    product_id,
    safe_days,
    successful_deliveries,
    clicks,
    conversions,
    commission,
    case when clicks > 0 then conversions::numeric / clicks::numeric end,
    case
      when clicks >= 5 and global_cvr is not null
      then (conversions::numeric + global_cvr * prior_clicks)
        / (clicks::numeric + prior_clicks)
    end,
    case when clicks > 0 then commission / clicks::numeric end,
    case
      when clicks >= 5 and global_rpc is not null
      then (commission + global_rpc * prior_clicks)
        / (clicks::numeric + prior_clicks)
    end,
    least(1, clicks::numeric / 50),
    clock_timestamp()
  from combined
  on conflict (product_id)
  do update set
    period_days = excluded.period_days,
    successful_deliveries = excluded.successful_deliveries,
    clicks = excluded.clicks,
    conversions = excluded.conversions,
    commission = excluded.commission,
    raw_cvr = excluded.raw_cvr,
    smoothed_cvr = excluded.smoothed_cvr,
    raw_rpc = excluded.raw_rpc,
    smoothed_rpc = excluded.smoothed_rpc,
    sample_confidence = excluded.sample_confidence,
    updated_at = excluded.updated_at;

  get diagnostics product_count = row_count;

  delete from public.learning_product_metrics
  where updated_at < refresh_started;

  with delivery_base as (
    select
      d.id as delivery_id,
      d.short_link_id,
      p.id as post_id,
      s.discovery_strategy_id
    from public.post_deliveries d
    join public.posts p on p.id = d.post_id
    join public.offer_snapshots s on s.id = p.offer_snapshot_id
    where d.accepted_at >= since_at
      and d.status in ('accepted','confirmed')
      and s.discovery_strategy_id is not null
  ),
  delivery_agg as (
    select
      discovery_strategy_id as strategy_id,
      count(*)::bigint as successful_deliveries,
      count(distinct post_id)::bigint as published_products
    from delivery_base
    group by discovery_strategy_id
  ),
  click_agg as (
    select
      db.discovery_strategy_id as strategy_id,
      count(ce.id)::bigint as clicks
    from delivery_base db
    join public.click_events ce on ce.short_link_id = db.short_link_id
    where ce.is_bot = false
      and ce.occurred_at >= since_at
    group by db.discovery_strategy_id
  ),
  conversion_agg as (
    select
      db.discovery_strategy_id as strategy_id,
      count(distinct ca.conversion_id)::bigint as conversions,
      coalesce(sum(l.amount) filter (where l.status <> 'rejected'), 0)::numeric as commission
    from delivery_base db
    join public.conversion_attributions ca on ca.delivery_id = db.delivery_id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    where c.purchase_at >= since_at
    group by db.discovery_strategy_id
  ),
  combined as (
    select
      hs.id as strategy_id,
      coalesce(d.published_products, 0)::bigint as published_products,
      coalesce(d.successful_deliveries, 0)::bigint as successful_deliveries,
      coalesce(cl.clicks, 0)::bigint as clicks,
      coalesce(cv.conversions, 0)::bigint as conversions,
      coalesce(cv.commission, 0)::numeric as commission
    from public.hunter_strategies hs
    left join delivery_agg d on d.strategy_id = hs.id
    left join click_agg cl on cl.strategy_id = hs.id
    left join conversion_agg cv on cv.strategy_id = hs.id
  )
  insert into public.learning_strategy_metrics(
    strategy_id, period_days, published_products, successful_deliveries,
    clicks, conversions, commission, raw_cvr, smoothed_cvr, raw_rpc,
    smoothed_rpc, sample_confidence, performance_index, updated_at
  )
  select
    strategy_id,
    safe_days,
    published_products,
    successful_deliveries,
    clicks,
    conversions,
    commission,
    case when clicks > 0 then conversions::numeric / clicks::numeric end,
    case
      when clicks >= 5 and global_cvr is not null
      then (conversions::numeric + global_cvr * prior_clicks)
        / (clicks::numeric + prior_clicks)
    end,
    case when clicks > 0 then commission / clicks::numeric end,
    case
      when clicks >= 5 and global_rpc is not null
      then (commission + global_rpc * prior_clicks)
        / (clicks::numeric + prior_clicks)
    end,
    least(1, clicks::numeric / 100),
    case
      when clicks >= 5 and global_rpc is not null and global_rpc > 0
      then least(
        2,
        greatest(
          0,
          ((commission + global_rpc * prior_clicks)
            / (clicks::numeric + prior_clicks)) / global_rpc
        )
      )
    end,
    clock_timestamp()
  from combined
  on conflict (strategy_id)
  do update set
    period_days = excluded.period_days,
    published_products = excluded.published_products,
    successful_deliveries = excluded.successful_deliveries,
    clicks = excluded.clicks,
    conversions = excluded.conversions,
    commission = excluded.commission,
    raw_cvr = excluded.raw_cvr,
    smoothed_cvr = excluded.smoothed_cvr,
    raw_rpc = excluded.raw_rpc,
    smoothed_rpc = excluded.smoothed_rpc,
    sample_confidence = excluded.sample_confidence,
    performance_index = excluded.performance_index,
    updated_at = excluded.updated_at;

  get diagnostics strategy_count = row_count;

  return query
  select product_count, strategy_count, global_click_count,
         global_conversion_count, global_commission_total;
end;
$$;

revoke all on function public.refresh_learning_metrics(integer)
  from public, anon, authenticated;
grant execute on function public.refresh_learning_metrics(integer) to service_role;

drop function if exists public.get_unscored_offer_candidates(text, integer);

create or replace function public.get_unscored_offer_candidates(
  p_algorithm_version text,
  p_limit integer default 100
)
returns table (
  offer_snapshot_id bigint,
  product_id uuid,
  external_item_id text,
  price numeric,
  price_min numeric,
  discount_rate numeric,
  sales bigint,
  rating numeric,
  commission_rate numeric,
  first_seen_at timestamptz,
  captured_at timestamptz,
  recent_publication_count bigint,
  historical_cvr numeric,
  revenue_per_click numeric,
  learning_confidence numeric
)
language sql
security definer
set search_path = ''
as $$
  select
    s.id,
    p.id,
    p.external_item_id,
    s.price,
    s.price_min,
    s.discount_rate,
    s.sales,
    s.rating,
    s.commission_rate,
    p.first_seen_at,
    s.captured_at,
    (
      select count(*)::bigint
      from public.posts prior_post
      join public.offer_snapshots prior_snapshot
        on prior_snapshot.id = prior_post.offer_snapshot_id
      where prior_snapshot.product_id = p.id
        and prior_post.created_at >= now() - interval '7 days'
        and prior_post.status not in ('cancelled','failed')
    ),
    lpm.smoothed_cvr,
    lpm.smoothed_rpc,
    lpm.sample_confidence
  from public.offer_snapshots s
  join public.affiliate_products p on p.id = s.product_id
  left join public.learning_product_metrics lpm on lpm.product_id = p.id
  left join public.offer_scores os
    on os.offer_snapshot_id = s.id
   and os.algorithm_version = p_algorithm_version
  where os.id is null
  order by s.captured_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.get_unscored_offer_candidates(text, integer)
  from public, anon, authenticated;
grant execute on function public.get_unscored_offer_candidates(text, integer)
  to service_role;

create or replace function public.learning_strategy_rank()
returns table (
  strategy_id uuid,
  provider text,
  name text,
  niche text,
  keyword text,
  product_cat_id integer,
  list_type integer,
  sort_type integer,
  pages_per_run integer,
  page_size integer,
  priority integer,
  enabled boolean,
  clicks bigint,
  conversions bigint,
  commission numeric,
  sample_confidence numeric,
  performance_index numeric,
  effective_rank numeric
)
language sql
security definer
set search_path = ''
as $$
  select
    hs.id,
    hs.provider,
    hs.name,
    hs.niche,
    hs.keyword,
    hs.product_cat_id,
    hs.list_type,
    hs.sort_type,
    hs.pages_per_run,
    hs.page_size,
    hs.priority,
    hs.enabled,
    coalesce(lsm.clicks, 0),
    coalesce(lsm.conversions, 0),
    coalesce(lsm.commission, 0),
    coalesce(lsm.sample_confidence, 0),
    lsm.performance_index,
    (
      hs.priority::numeric
      - case
          when coalesce(lsm.sample_confidence, 0) >= 0.25
            and lsm.performance_index is not null
          then least(30, greatest(-30, (lsm.performance_index - 1) * 20))
          else 0
        end
    )
  from public.hunter_strategies hs
  left join public.learning_strategy_metrics lsm on lsm.strategy_id = hs.id
  where hs.enabled = true
  order by 17 asc, hs.priority asc, hs.created_at asc;
$$;

revoke all on function public.learning_strategy_rank()
  from public, anon, authenticated;
grant execute on function public.learning_strategy_rank() to service_role;
