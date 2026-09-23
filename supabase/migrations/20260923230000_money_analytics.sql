create table if not exists public.conversion_attributions (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null unique references public.conversions(id) on delete cascade,
  delivery_id uuid not null references public.post_deliveries(id) on delete cascade,
  method text not null
    check (method in ('exact_tracking_key','subid_exact','tracking_key_contains')),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  evidence text null,
  created_at timestamptz not null default now()
);

create index if not exists conversion_attributions_delivery_idx
  on public.conversion_attributions(delivery_id);

alter table public.conversion_attributions enable row level security;
revoke all on table public.conversion_attributions from anon, authenticated;
grant select, insert, update, delete on table public.conversion_attributions to service_role;

create or replace function public.reconcile_conversion_attributions()
returns table (
  attributed integer,
  unattributed integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer := 0;
  remaining_count integer := 0;
begin
  with raw_candidates as (
    select
      c.id as conversion_id,
      d.id as delivery_id,
      case
        when c.utm_content = d.tracking_key then 1
        when c.utm_content = al.tracking_key then 1
        when coalesce(al.sub_ids, '[]'::jsonb) ? c.utm_content then 2
        when d.tracking_key is not null
          and position(d.tracking_key in c.utm_content) > 0 then 3
        else 99
      end as priority,
      case
        when c.utm_content = d.tracking_key
          or c.utm_content = al.tracking_key then 'exact_tracking_key'
        when coalesce(al.sub_ids, '[]'::jsonb) ? c.utm_content then 'subid_exact'
        else 'tracking_key_contains'
      end as method,
      c.utm_content as evidence
    from public.conversions c
    join public.post_deliveries d
      on d.affiliate_link_id is not null
    join public.affiliate_links al
      on al.id = d.affiliate_link_id
    left join public.conversion_attributions ca
      on ca.conversion_id = c.id
    where ca.id is null
      and nullif(c.utm_content, '') is not null
      and (
        c.utm_content = d.tracking_key
        or c.utm_content = al.tracking_key
        or coalesce(al.sub_ids, '[]'::jsonb) ? c.utm_content
        or (
          d.tracking_key is not null
          and position(d.tracking_key in c.utm_content) > 0
        )
      )
  ),
  per_delivery as (
    select *
    from (
      select
        rc.*,
        row_number() over (
          partition by rc.conversion_id, rc.delivery_id
          order by rc.priority
        ) as rn
      from raw_candidates rc
    ) ranked
    where rn = 1
  ),
  unambiguous as (
    select conversion_id
    from per_delivery
    group by conversion_id
    having count(*) = 1
  ),
  chosen as (
    select pd.*
    from per_delivery pd
    join unambiguous u on u.conversion_id = pd.conversion_id
  )
  insert into public.conversion_attributions(
    conversion_id,
    delivery_id,
    method,
    confidence,
    evidence
  )
  select
    conversion_id,
    delivery_id,
    method,
    case method
      when 'exact_tracking_key' then 1.0
      when 'subid_exact' then 0.95
      else 0.85
    end,
    evidence
  from chosen
  on conflict (conversion_id) do nothing;

  get diagnostics inserted_count = row_count;

  select count(*)::integer into remaining_count
  from public.conversions c
  left join public.conversion_attributions ca on ca.conversion_id = c.id
  where ca.id is null;

  return query select inserted_count, remaining_count;
end;
$$;

create or replace function public.money_summary(p_days integer default 30)
returns table (
  period_days integer,
  posts_sent bigint,
  deliveries_sent bigint,
  clicks bigint,
  conversions bigint,
  commission_total numeric,
  commission_pending numeric,
  commission_approved numeric,
  commission_paid numeric,
  epc numeric
)
language sql
security definer
set search_path = ''
as $$
  with bounds as (
    select now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365))) as since
  ),
  p as (
    select count(*)::bigint as value
    from public.posts, bounds
    where first_sent_at >= bounds.since
  ),
  d as (
    select count(*)::bigint as value
    from public.post_deliveries, bounds
    where accepted_at >= bounds.since
      and status in ('accepted','confirmed')
  ),
  cl as (
    select count(*)::bigint as value
    from public.click_events, bounds
    where occurred_at >= bounds.since
      and is_bot = false
  ),
  cv as (
    select count(*)::bigint as value
    from public.conversions, bounds
    where purchase_at >= bounds.since
  ),
  money as (
    select
      coalesce(sum(l.amount) filter (where l.status <> 'rejected'), 0)::numeric as total,
      coalesce(sum(l.amount) filter (where l.status = 'pending'), 0)::numeric as pending,
      coalesce(sum(l.amount) filter (where l.status = 'approved'), 0)::numeric as approved,
      coalesce(sum(l.amount) filter (where l.status = 'paid'), 0)::numeric as paid
    from public.commission_ledger l
    join public.conversions c on c.id = l.conversion_id
    cross join bounds
    where c.purchase_at >= bounds.since
  )
  select
    greatest(1, least(coalesce(p_days, 30), 365)),
    p.value,
    d.value,
    cl.value,
    cv.value,
    money.total,
    money.pending,
    money.approved,
    money.paid,
    case when cl.value > 0 then round(money.total / cl.value, 6) else 0 end
  from p,d,cl,cv,money;
$$;

create or replace function public.money_group_performance(p_days integer default 30)
returns table (
  group_id uuid,
  group_name text,
  niche text,
  acquisition_visits bigint,
  successful_deliveries bigint,
  clicks bigint,
  conversions bigint,
  commission numeric,
  epc numeric,
  commission_per_visit numeric
)
language sql
security definer
set search_path = ''
as $$
  with bounds as (
    select now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365))) as since
  ),
  acquisition as (
    select av.group_id, count(*)::bigint as visits
    from public.acquisition_visits av, bounds
    where av.created_at >= bounds.since
      and av.group_id is not null
      and av.user_agent_family <> 'bot'
    group by av.group_id
  ),
  delivery as (
    select d.group_id, count(*)::bigint as deliveries
    from public.post_deliveries d, bounds
    where d.accepted_at >= bounds.since
      and d.status in ('accepted','confirmed')
    group by d.group_id
  ),
  clicks as (
    select d.group_id, count(ce.id)::bigint as clicks
    from public.click_events ce
    join public.post_deliveries d on d.short_link_id = ce.short_link_id
    cross join bounds
    where ce.occurred_at >= bounds.since
      and ce.is_bot = false
    group by d.group_id
  ),
  conversion_money as (
    select
      d.group_id,
      count(distinct ca.conversion_id)::bigint as conversions,
      coalesce(sum(l.amount) filter (where l.status <> 'rejected'), 0)::numeric as commission
    from public.conversion_attributions ca
    join public.post_deliveries d on d.id = ca.delivery_id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    cross join bounds
    where c.purchase_at >= bounds.since
    group by d.group_id
  )
  select
    g.id,
    g.name,
    g.niche,
    coalesce(a.visits, 0),
    coalesce(d.deliveries, 0),
    coalesce(cl.clicks, 0),
    coalesce(cm.conversions, 0),
    coalesce(cm.commission, 0),
    case
      when coalesce(cl.clicks, 0) > 0
      then round(coalesce(cm.commission, 0) / cl.clicks, 6)
      else 0
    end,
    case
      when coalesce(a.visits, 0) > 0
      then round(coalesce(cm.commission, 0) / a.visits, 6)
      else 0
    end
  from public.whatsapp_groups g
  left join acquisition a on a.group_id = g.id
  left join delivery d on d.group_id = g.id
  left join clicks cl on cl.group_id = g.id
  left join conversion_money cm on cm.group_id = g.id
  where
    coalesce(a.visits, 0) > 0
    or coalesce(d.deliveries, 0) > 0
    or coalesce(cl.clicks, 0) > 0
    or coalesce(cm.conversions, 0) > 0
  order by coalesce(cm.commission, 0) desc, coalesce(cl.clicks, 0) desc;
$$;

revoke all on function public.reconcile_conversion_attributions() from public, anon, authenticated;
revoke all on function public.money_summary(integer) from public, anon, authenticated;
revoke all on function public.money_group_performance(integer) from public, anon, authenticated;

grant execute on function public.reconcile_conversion_attributions() to service_role;
grant execute on function public.money_summary(integer) to service_role;
grant execute on function public.money_group_performance(integer) to service_role;
