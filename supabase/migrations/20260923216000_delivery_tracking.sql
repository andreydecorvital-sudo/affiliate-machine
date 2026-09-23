create unique index if not exists affiliate_links_provider_tracking_unique
  on public.affiliate_links(provider, tracking_key)
  where tracking_key is not null;

create unique index if not exists short_links_provider_tracking_unique
  on public.short_links(provider, tracking_key)
  where tracking_key is not null;

alter table public.post_deliveries
  add column if not exists affiliate_link_id uuid null references public.affiliate_links(id) on delete set null,
  add column if not exists short_link_id uuid null references public.short_links(id) on delete set null,
  add column if not exists tracking_key text null,
  add column if not exists content_override text null;

create unique index if not exists post_deliveries_tracking_unique
  on public.post_deliveries(tracking_key)
  where tracking_key is not null;

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
  if nullif(p_tracking_key, '') is not null then
    select id into link_uuid
    from public.affiliate_links
    where provider = p_provider
      and tracking_key = p_tracking_key
    limit 1;

    if link_uuid is not null then
      return link_uuid;
    end if;
  end if;

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
  on conflict do nothing
  returning id into link_uuid;

  if link_uuid is null and nullif(p_tracking_key, '') is not null then
    select id into link_uuid
    from public.affiliate_links
    where provider = p_provider
      and tracking_key = p_tracking_key
    limit 1;
  end if;

  if link_uuid is null then
    raise exception 'Could not persist affiliate link';
  end if;

  return link_uuid;
end;
$$;

create or replace function public.get_delivery_tracking_context(p_delivery_id uuid)
returns table (
  delivery_id uuid,
  post_id uuid,
  group_id uuid,
  group_name text,
  niche text,
  external_item_id text,
  origin_url text,
  product_name text,
  price numeric,
  price_min numeric,
  discount_rate numeric,
  sales bigint,
  rating numeric,
  affiliate_link_id uuid,
  short_link_id uuid,
  tracking_key text,
  content_override text
)
language sql
security definer
set search_path = ''
as $$
  select
    d.id,
    d.post_id,
    d.group_id,
    g.name,
    p.niche,
    ap.external_item_id,
    os.offer_link,
    ap.product_name,
    os.price,
    os.price_min,
    os.discount_rate,
    os.sales,
    os.rating,
    d.affiliate_link_id,
    d.short_link_id,
    d.tracking_key,
    d.content_override
  from public.post_deliveries d
  join public.posts p on p.id = d.post_id
  join public.whatsapp_groups g on g.id = d.group_id
  join public.offer_snapshots os on os.id = p.offer_snapshot_id
  join public.affiliate_products ap on ap.id = os.product_id
  where d.id = p_delivery_id
  limit 1;
$$;

create or replace function public.attach_delivery_tracking(
  p_delivery_id uuid,
  p_affiliate_link_id uuid,
  p_short_link_id uuid,
  p_tracking_key text,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.post_deliveries
  set affiliate_link_id = p_affiliate_link_id,
      short_link_id = p_short_link_id,
      tracking_key = p_tracking_key,
      content_override = p_content,
      updated_at = now()
  where id = p_delivery_id;

  if not found then
    raise exception 'Delivery not found: %', p_delivery_id;
  end if;
end;
$$;

revoke all on function public.get_delivery_tracking_context(uuid) from public, anon, authenticated;
revoke all on function public.attach_delivery_tracking(uuid, uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.get_delivery_tracking_context(uuid) to service_role;
grant execute on function public.attach_delivery_tracking(uuid, uuid, uuid, text, text) to service_role;
