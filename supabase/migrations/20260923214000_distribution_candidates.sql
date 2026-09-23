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
  confidence numeric
)
language sql
security definer
set search_path = ''
as $$
  select
    os.id,
    s.id,
    p.external_item_id,
    p.product_name,
    s.offer_link,
    s.price,
    s.price_min,
    s.discount_rate,
    s.sales,
    s.rating,
    os.score,
    os.confidence
  from public.offer_scores os
  join public.offer_snapshots s on s.id = os.offer_snapshot_id
  join public.affiliate_products p on p.id = s.product_id
  left join public.posts po on po.offer_score_id = os.id
  where os.decision = 'PUBLISH'
    and po.id is null
  order by os.score desc, os.confidence desc, os.created_at asc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

revoke all on function public.get_publishable_opportunities(integer) from public, anon, authenticated;
grant execute on function public.get_publishable_opportunities(integer) to service_role;
