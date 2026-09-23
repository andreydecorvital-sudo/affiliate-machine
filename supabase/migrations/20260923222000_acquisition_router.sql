alter table public.whatsapp_groups
  add column if not exists invite_url text null,
  add column if not exists capacity_limit integer null check (capacity_limit is null or capacity_limit > 0),
  add column if not exists last_routed_at timestamptz null;

create table if not exists public.traffic_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null unique,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  created_at timestamptz not null default now()
);

create table if not exists public.acquisition_visits (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  campaign_id uuid null references public.traffic_campaigns(id) on delete set null,
  group_id uuid null references public.whatsapp_groups(id) on delete set null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  utm_term text null,
  referrer_host text null,
  user_agent_family text not null default 'unknown'
    check (user_agent_family in ('bot','mobile','desktop','unknown')),
  routed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists acquisition_visits_niche_time_idx
  on public.acquisition_visits(niche, created_at desc);

create index if not exists acquisition_visits_campaign_time_idx
  on public.acquisition_visits(campaign_id, created_at desc);

alter table public.traffic_campaigns enable row level security;
alter table public.acquisition_visits enable row level security;

revoke all on table public.traffic_campaigns from anon, authenticated;
revoke all on table public.acquisition_visits from anon, authenticated;

grant select, insert, update, delete on table public.traffic_campaigns to service_role;
grant select, insert, update, delete on table public.acquisition_visits to service_role;

create or replace function public.route_acquisition_visit(
  p_niche text,
  p_campaign_key text,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_referrer_host text default null,
  p_user_agent_family text default 'unknown'
)
returns table (
  visit_id uuid,
  group_id uuid,
  group_name text,
  invite_url text,
  routed_niche text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_uuid uuid;
  selected_group record;
  visit_uuid uuid;
  normalized_niche text;
begin
  normalized_niche := coalesce(nullif(trim(p_niche), ''), 'general');

  insert into public.traffic_campaigns(
    campaign_key,
    utm_source,
    utm_medium,
    utm_campaign
  )
  values(
    p_campaign_key,
    nullif(p_utm_source, ''),
    nullif(p_utm_medium, ''),
    nullif(p_utm_campaign, '')
  )
  on conflict (campaign_key)
  do update set
    utm_source = coalesce(excluded.utm_source, public.traffic_campaigns.utm_source),
    utm_medium = coalesce(excluded.utm_medium, public.traffic_campaigns.utm_medium),
    utm_campaign = coalesce(excluded.utm_campaign, public.traffic_campaigns.utm_campaign)
  returning id into campaign_uuid;

  select
    g.id,
    g.name,
    g.invite_url,
    g.niche
  into selected_group
  from public.whatsapp_groups g
  where g.active = true
    and g.accepting_traffic = true
    and nullif(g.invite_url, '') is not null
    and (g.capacity_limit is null or g.member_count < g.capacity_limit)
    and g.niche in (normalized_niche, 'general')
  order by
    case when g.niche = normalized_niche then 0 else 1 end,
    case
      when g.capacity_limit is null then g.member_count::numeric
      else g.member_count::numeric / greatest(g.capacity_limit, 1)
    end asc,
    g.last_routed_at asc nulls first,
    g.created_at asc
  for update skip locked
  limit 1;

  if selected_group.id is not null then
    update public.whatsapp_groups
    set last_routed_at = now()
    where id = selected_group.id;
  end if;

  insert into public.acquisition_visits(
    niche,
    campaign_id,
    group_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    referrer_host,
    user_agent_family,
    routed
  )
  values(
    normalized_niche,
    campaign_uuid,
    selected_group.id,
    nullif(p_utm_source, ''),
    nullif(p_utm_medium, ''),
    nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''),
    nullif(p_utm_term, ''),
    nullif(p_referrer_host, ''),
    case
      when p_user_agent_family in ('bot','mobile','desktop','unknown')
      then p_user_agent_family
      else 'unknown'
    end,
    selected_group.id is not null
  )
  returning id into visit_uuid;

  return query
  select
    visit_uuid,
    selected_group.id,
    selected_group.name,
    selected_group.invite_url,
    selected_group.niche;
end;
$$;

revoke all on function public.route_acquisition_visit(text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.route_acquisition_visit(text, text, text, text, text, text, text, text, text)
  to service_role;
