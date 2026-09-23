create table if not exists public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_item_id text not null,
  external_shop_id text null,
  product_name text not null,
  shop_name text null,
  product_link text null,
  image_url text null,
  category_ids jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (provider, external_item_id)
);

create table if not exists public.offer_snapshots (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.affiliate_products(id) on delete cascade,
  provider text not null,
  captured_at timestamptz not null default now(),
  offer_link text not null,
  price numeric(18,6) null,
  price_min numeric(18,6) null,
  price_max numeric(18,6) null,
  discount_rate numeric(12,6) null,
  sales bigint null,
  rating numeric(12,6) null,
  commission_rate numeric(12,6) null,
  seller_commission_rate numeric(12,6) null,
  provider_commission_rate numeric(12,6) null,
  estimated_commission numeric(18,6) null,
  period_start_at timestamptz null,
  period_end_at timestamptz null,
  raw jsonb not null default '{}'::jsonb
);

create index if not exists offer_snapshots_product_time_idx
  on public.offer_snapshots(product_id, captured_at desc);

create index if not exists offer_snapshots_provider_time_idx
  on public.offer_snapshots(provider, captured_at desc);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  product_id uuid null references public.affiliate_products(id) on delete set null,
  origin_url text not null,
  affiliate_url text not null,
  sub_ids jsonb not null default '[]'::jsonb,
  tracking_key text null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_links_tracking_idx
  on public.affiliate_links(provider, tracking_key)
  where tracking_key is not null;

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_conversion_id text not null,
  purchase_at timestamptz not null,
  click_at timestamptz null,
  total_commission numeric(18,6) not null default 0,
  seller_commission numeric(18,6) null,
  provider_commission numeric(18,6) null,
  buyer_type text null,
  device text null,
  utm_content text null,
  order_status text null,
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  unique(provider, external_conversion_id)
);

create index if not exists conversions_purchase_time_idx
  on public.conversions(provider, purchase_at desc);

create index if not exists conversions_utm_content_idx
  on public.conversions(provider, utm_content)
  where utm_content is not null;

create table if not exists public.conversion_items (
  id bigint generated always as identity primary key,
  conversion_id uuid not null references public.conversions(id) on delete cascade,
  external_order_id text not null,
  external_item_id text null,
  item_name text null,
  shop_name text null,
  item_price numeric(18,6) null,
  quantity integer not null default 1 check (quantity > 0),
  item_commission numeric(18,6) null,
  order_status text null,
  complete_at timestamptz null,
  attribution_type text null
);

create index if not exists conversion_items_conversion_idx
  on public.conversion_items(conversion_id);

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_conversion_id text not null,
  conversion_id uuid not null references public.conversions(id) on delete cascade,
  amount numeric(18,6) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','paid')),
  observed_order_status text null,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(provider, external_conversion_id)
);

alter table public.affiliate_products enable row level security;
alter table public.offer_snapshots enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.conversions enable row level security;
alter table public.conversion_items enable row level security;
alter table public.commission_ledger enable row level security;

revoke all on table public.affiliate_products from anon, authenticated;
revoke all on table public.offer_snapshots from anon, authenticated;
revoke all on table public.affiliate_links from anon, authenticated;
revoke all on table public.conversions from anon, authenticated;
revoke all on table public.conversion_items from anon, authenticated;
revoke all on table public.commission_ledger from anon, authenticated;

grant select, insert, update, delete on table public.affiliate_products to service_role;
grant select, insert, update, delete on table public.offer_snapshots to service_role;
grant select, insert, update, delete on table public.affiliate_links to service_role;
grant select, insert, update, delete on table public.conversions to service_role;
grant select, insert, update, delete on table public.conversion_items to service_role;
grant select, insert, update, delete on table public.commission_ledger to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.persist_shopee_offer_snapshot(p_offer jsonb)
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
    raw
  )
  values (
    product_uuid,
    'shopee',
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
    coalesce(p_offer->'raw', '{}'::jsonb)
  );

  return product_uuid;
end;
$$;

create or replace function public.persist_affiliate_link(
  p_provider text,
  p_external_item_id text,
  p_origin_url text,
  p_affiliate_url text,
  p_sub_ids jsonb default '[]'::jsonb,
  p_tracking_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_uuid uuid;
  link_uuid uuid;
begin
  select id into product_uuid
  from public.affiliate_products
  where provider = p_provider
    and external_item_id = p_external_item_id
  limit 1;

  insert into public.affiliate_links(
    provider,
    product_id,
    origin_url,
    affiliate_url,
    sub_ids,
    tracking_key
  )
  values (
    p_provider,
    product_uuid,
    p_origin_url,
    p_affiliate_url,
    coalesce(p_sub_ids, '[]'::jsonb),
    nullif(p_tracking_key, '')
  )
  returning id into link_uuid;

  return link_uuid;
end;
$$;

create or replace function public.persist_shopee_conversion(p_conversion jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversion_uuid uuid;
  item jsonb;
  ledger_status text;
begin
  if nullif(p_conversion->>'conversionId', '') is null then
    raise exception 'conversionId is required';
  end if;

  ledger_status := case upper(coalesce(p_conversion->>'orderStatus', ''))
    when 'COMPLETED' then 'approved'
    when 'CANCELLED' then 'rejected'
    else 'pending'
  end;

  insert into public.conversions(
    provider,
    external_conversion_id,
    purchase_at,
    click_at,
    total_commission,
    seller_commission,
    provider_commission,
    buyer_type,
    device,
    utm_content,
    order_status,
    raw
  )
  values (
    'shopee',
    p_conversion->>'conversionId',
    (p_conversion->>'purchaseAt')::timestamptz,
    nullif(p_conversion->>'clickAt', '')::timestamptz,
    coalesce(nullif(p_conversion->>'totalCommission', '')::numeric, 0),
    nullif(p_conversion->>'sellerCommission', '')::numeric,
    nullif(p_conversion->>'shopeeCommission', '')::numeric,
    nullif(p_conversion->>'buyerType', ''),
    nullif(p_conversion->>'device', ''),
    nullif(p_conversion->>'utmContent', ''),
    nullif(p_conversion->>'orderStatus', ''),
    p_conversion
  )
  on conflict (provider, external_conversion_id)
  do update set
    purchase_at = excluded.purchase_at,
    click_at = excluded.click_at,
    total_commission = excluded.total_commission,
    seller_commission = excluded.seller_commission,
    provider_commission = excluded.provider_commission,
    buyer_type = excluded.buyer_type,
    device = excluded.device,
    utm_content = excluded.utm_content,
    order_status = excluded.order_status,
    last_synced_at = now(),
    raw = excluded.raw
  returning id into conversion_uuid;

  delete from public.conversion_items
  where conversion_id = conversion_uuid;

  for item in
    select value from jsonb_array_elements(coalesce(p_conversion->'items', '[]'::jsonb))
  loop
    insert into public.conversion_items(
      conversion_id,
      external_order_id,
      external_item_id,
      item_name,
      shop_name,
      item_price,
      quantity,
      item_commission,
      order_status,
      complete_at,
      attribution_type
    )
    values (
      conversion_uuid,
      coalesce(nullif(item->>'orderId', ''), 'unknown'),
      nullif(item->>'itemId', ''),
      nullif(item->>'itemName', ''),
      nullif(item->>'shopName', ''),
      nullif(item->>'itemPrice', '')::numeric,
      greatest(coalesce(nullif(item->>'quantity', '')::integer, 1), 1),
      nullif(item->>'itemCommission', '')::numeric,
      nullif(item->>'orderStatus', ''),
      nullif(item->>'completeAt', '')::timestamptz,
      nullif(item->>'attributionType', '')
    );
  end loop;

  insert into public.commission_ledger(
    provider,
    external_conversion_id,
    conversion_id,
    amount,
    status,
    observed_order_status
  )
  values (
    'shopee',
    p_conversion->>'conversionId',
    conversion_uuid,
    coalesce(nullif(p_conversion->>'totalCommission', '')::numeric, 0),
    ledger_status,
    nullif(p_conversion->>'orderStatus', '')
  )
  on conflict (provider, external_conversion_id)
  do update set
    conversion_id = excluded.conversion_id,
    amount = excluded.amount,
    status = excluded.status,
    observed_order_status = excluded.observed_order_status,
    updated_at = now();

  return conversion_uuid;
end;
$$;

revoke all on function public.persist_shopee_offer_snapshot(jsonb) from public, anon, authenticated;
revoke all on function public.persist_affiliate_link(text, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.persist_shopee_conversion(jsonb) from public, anon, authenticated;

grant execute on function public.persist_shopee_offer_snapshot(jsonb) to service_role;
grant execute on function public.persist_affiliate_link(text, text, text, text, jsonb, text) to service_role;
grant execute on function public.persist_shopee_conversion(jsonb) to service_role;
