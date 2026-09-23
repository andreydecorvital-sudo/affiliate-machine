create table if not exists public.hunter_strategies (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'shopee',
  name text not null,
  niche text not null default 'general',
  keyword text null,
  product_cat_id integer null,
  list_type integer not null default 0,
  sort_type integer not null default 0,
  pages_per_run integer not null default 1 check (pages_per_run between 1 and 10),
  page_size integer not null default 50 check (page_size between 1 and 100),
  priority integer not null default 100,
  enabled boolean not null default true,
  last_run_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, name)
);

create table if not exists public.hunter_runs (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.hunter_strategies(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null default 'running'
    check (status in ('running','success','partial','error')),
  pages_fetched integer not null default 0,
  offers_fetched integer not null default 0,
  offers_persisted integer not null default 0,
  unique_items integer not null default 0,
  error text null
);

create index if not exists hunter_strategies_enabled_priority_idx
  on public.hunter_strategies(enabled, priority, created_at);

create index if not exists hunter_runs_strategy_time_idx
  on public.hunter_runs(strategy_id, started_at desc);

alter table public.hunter_strategies enable row level security;
alter table public.hunter_runs enable row level security;

revoke all on table public.hunter_strategies from anon, authenticated;
revoke all on table public.hunter_runs from anon, authenticated;

grant select, insert, update, delete on table public.hunter_strategies to service_role;
grant select, insert, update, delete on table public.hunter_runs to service_role;

insert into public.hunter_strategies(
  provider, name, niche, keyword, priority, pages_per_run, page_size
)
values
  ('shopee','general-discovery','general',null,10,2,50),
  ('shopee','casa','casa','casa',20,1,50),
  ('shopee','cozinha','casa','cozinha',25,1,50),
  ('shopee','tecnologia','tech','eletronicos',30,1,50),
  ('shopee','beleza','beleza','beleza',40,1,50),
  ('shopee','ferramentas','ferramentas','ferramentas',50,1,50),
  ('shopee','pet','pet','pet',60,1,50),
  ('shopee','automotivo','auto','automotivo',70,1,50),
  ('shopee','moda','moda','moda',80,1,50),
  ('shopee','organizacao','casa','organizador',90,1,50)
on conflict (provider, name) do nothing;

alter table public.offer_snapshots
  add column if not exists discovery_niche text null,
  add column if not exists discovery_strategy_id uuid null
    references public.hunter_strategies(id) on delete set null;

create index if not exists offer_snapshots_discovery_idx
  on public.offer_snapshots(discovery_niche, captured_at desc);

drop function if exists public.persist_shopee_offer_snapshot(jsonb);

create or replace function public.persist_shopee_offer_snapshot(
  p_offer jsonb,
  p_discovery_niche text default null,
  p_discovery_strategy_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_uuid uuid;
begin
  if nullif(p_offer->>'itemId', '') is null then
    raise exception 'itemId is required';
  end if;

  if nullif(p_offer->>'offerLink', '') is null then
    raise exception 'offerLink is required';
  end if;

  insert into public.affiliate_products (
    provider,
    external_item_id,
    external_shop_id,
    product_name,
    shop_name,
    product_link,
    image_url,
    category_ids,
    metadata
  )
  values (
    'shopee',
    p_offer->>'itemId',
    nullif(p_offer->>'shopId', ''),
    coalesce(nullif(p_offer->>'productName', ''), 'Produto sem nome'),
    nullif(p_offer->>'shopName', ''),
    nullif(p_offer->>'productLink', ''),
    nullif(p_offer->>'imageUrl', ''),
    coalesce(p_offer->'categoryIds', '[]'::jsonb),
    '{}'::jsonb
  )
  on conflict (provider, external_item_id)
  do update set
    external_shop_id = excluded.external_shop_id,
    product_name = excluded.product_name,
    shop_name = excluded.shop_name,
    product_link = excluded.product_link,
    image_url = excluded.image_url,
    category_ids = excluded.category_ids,
    last_seen_at = now()
  returning id into product_uuid;

  insert into public.offer_snapshots (
    product_id,
    provider,
    captured_at,
    offer_link,
    price,
    price_min,
    price_max,
    discount_rate,
    sales,
    rating,
    commission_rate,
    seller_commission_rate,
    provider_commission_rate,
    estimated_commission,
    period_start_at,
    period_end_at,
    discovery_niche,
    discovery_strategy_id,
    raw
  )
  values (
    product_uuid,
    'shopee',
    now(),
    p_offer->>'offerLink',
    nullif(p_offer->>'price', '')::numeric,
    nullif(p_offer->>'priceMin', '')::numeric,
    nullif(p_offer->>'priceMax', '')::numeric,
    nullif(p_offer->>'discountRate', '')::numeric,
    nullif(p_offer->>'sales', '')::bigint,
    nullif(p_offer->>'rating', '')::numeric,
    nullif(p_offer->>'commissionRate', '')::numeric,
    nullif(p_offer->>'sellerCommissionRate', '')::numeric,
    nullif(p_offer->>'shopeeCommissionRate', '')::numeric,
    nullif(p_offer->>'estimatedCommission', '')::numeric,
    nullif(p_offer->>'periodStartAt', '')::timestamptz,
    nullif(p_offer->>'periodEndAt', '')::timestamptz,
    nullif(p_discovery_niche, ''),
    p_discovery_strategy_id,
    coalesce(p_offer->'raw', '{}'::jsonb)
  );

  return product_uuid;
end;
$$;

revoke all on function public.persist_shopee_offer_snapshot(jsonb, text, uuid)
  from public, anon, authenticated;
grant execute on function public.persist_shopee_offer_snapshot(jsonb, text, uuid)
  to service_role;

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
  recent_publication_count bigint
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
    ) as recent_publication_count
  from public.offer_snapshots s
  join public.affiliate_products p on p.id = s.product_id
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

drop function if exists public.get_publishable_opportunities(integer);

create or replace function public.get_publishable_opportunities(
  p_limit integer default 25
)
returns table (
  offer_score_id bigint,
  offer_snapshot_id bigint,
  external_item_id text,
  product_name text,
  offer_link text,
  price numeric,
  price_min numeric,
  discount_rate numeric,
  sales bigint,
  rating numeric,
  score numeric,
  confidence numeric,
  discovery_niche text
)
language sql
security definer
set search_path = ''
as $$
  with eligible as (
    select
      os.id as offer_score_id,
      s.id as offer_snapshot_id,
      s.product_id,
      p.external_item_id,
      p.product_name,
      s.offer_link,
      s.price,
      s.price_min,
      s.discount_rate,
      s.sales,
      s.rating,
      os.score,
      os.confidence,
      coalesce(nullif(s.discovery_niche, ''), 'general') as discovery_niche,
      row_number() over (
        partition by s.product_id
        order by os.score desc, os.confidence desc, s.captured_at desc
      ) as product_rank
    from public.offer_scores os
    join public.offer_snapshots s on s.id = os.offer_snapshot_id
    join public.affiliate_products p on p.id = s.product_id
    left join public.posts exact_post on exact_post.offer_score_id = os.id
    where os.decision = 'PUBLISH'
      and exact_post.id is null
      and not exists (
        select 1
        from public.posts prior_post
        join public.offer_snapshots prior_snapshot
          on prior_snapshot.id = prior_post.offer_snapshot_id
        where prior_snapshot.product_id = s.product_id
          and prior_post.created_at >= now() - interval '7 days'
          and prior_post.status not in ('cancelled','failed')
      )
  )
  select
    offer_score_id,
    offer_snapshot_id,
    external_item_id,
    product_name,
    offer_link,
    price,
    price_min,
    discount_rate,
    sales,
    rating,
    score,
    confidence,
    discovery_niche
  from eligible
  where product_rank = 1
  order by score desc, confidence desc, offer_snapshot_id desc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

revoke all on function public.get_publishable_opportunities(integer)
  from public, anon, authenticated;
grant execute on function public.get_publishable_opportunities(integer)
  to service_role;
