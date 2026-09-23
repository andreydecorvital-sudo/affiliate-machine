create table if not exists public.offer_scores (
  id bigint generated always as identity primary key,
  offer_snapshot_id bigint not null references public.offer_snapshots(id) on delete cascade,
  product_id uuid not null references public.affiliate_products(id) on delete cascade,
  algorithm_version text not null,
  score numeric(8,2) not null check (score >= 0 and score <= 100),
  confidence numeric(8,6) not null check (confidence >= 0 and confidence <= 1),
  decision text not null check (decision in ('REJECT','REVIEW','PUBLISH')),
  factors jsonb not null default '[]'::jsonb,
  thresholds jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(offer_snapshot_id, algorithm_version)
);

create index if not exists offer_scores_decision_score_idx
  on public.offer_scores(decision, score desc, created_at desc);

alter table public.offer_scores enable row level security;
revoke all on table public.offer_scores from anon, authenticated;
grant select, insert, update, delete on table public.offer_scores to service_role;
grant usage, select on all sequences in schema public to service_role;

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
  captured_at timestamptz
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
    s.captured_at
  from public.offer_snapshots s
  join public.affiliate_products p on p.id = s.product_id
  left join public.offer_scores os
    on os.offer_snapshot_id = s.id
   and os.algorithm_version = p_algorithm_version
  where os.id is null
  order by s.captured_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

create or replace function public.persist_offer_score(
  p_offer_snapshot_id bigint,
  p_algorithm_version text,
  p_score numeric,
  p_confidence numeric,
  p_decision text,
  p_factors jsonb,
  p_thresholds jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_uuid uuid;
  score_id bigint;
begin
  select product_id into product_uuid
  from public.offer_snapshots
  where id = p_offer_snapshot_id;

  if product_uuid is null then
    raise exception 'Offer snapshot not found: %', p_offer_snapshot_id;
  end if;

  insert into public.offer_scores(
    offer_snapshot_id,
    product_id,
    algorithm_version,
    score,
    confidence,
    decision,
    factors,
    thresholds
  )
  values (
    p_offer_snapshot_id,
    product_uuid,
    p_algorithm_version,
    p_score,
    p_confidence,
    p_decision,
    coalesce(p_factors, '[]'::jsonb),
    coalesce(p_thresholds, '{}'::jsonb)
  )
  on conflict (offer_snapshot_id, algorithm_version)
  do update set
    score = excluded.score,
    confidence = excluded.confidence,
    decision = excluded.decision,
    factors = excluded.factors,
    thresholds = excluded.thresholds
  returning id into score_id;

  return score_id;
end;
$$;

revoke all on function public.get_unscored_offer_candidates(text, integer) from public, anon, authenticated;
revoke all on function public.persist_offer_score(bigint, text, numeric, numeric, text, jsonb, jsonb) from public, anon, authenticated;

grant execute on function public.get_unscored_offer_candidates(text, integer) to service_role;
grant execute on function public.persist_offer_score(bigint, text, numeric, numeric, text, jsonb, jsonb) to service_role;
