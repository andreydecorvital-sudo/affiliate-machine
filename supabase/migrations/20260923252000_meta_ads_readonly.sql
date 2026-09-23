alter table public.paid_traffic_spend
  add column if not exists external_campaign_name text null;

create table if not exists public.paid_traffic_campaign_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_account_id text not null,
  external_campaign_id text not null,
  external_campaign_name text null,
  campaign_id uuid null references public.traffic_campaigns(id) on delete set null,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, external_account_id, external_campaign_id)
);

create index if not exists paid_traffic_campaign_links_mapped_idx
  on public.paid_traffic_campaign_links(provider, campaign_id, last_seen_at desc);

alter table public.paid_traffic_campaign_links enable row level security;

revoke all on table public.paid_traffic_campaign_links from anon, authenticated;
grant select, insert, update, delete on table public.paid_traffic_campaign_links to service_role;

create or replace function public.link_paid_traffic_campaign(
  p_link_id uuid,
  p_campaign_key text
)
returns table (
  link_id uuid,
  campaign_id uuid,
  campaign_key text,
  updated_spend_rows integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_campaign uuid;
  link_row record;
  affected integer := 0;
  clean_key text;
begin
  clean_key := nullif(trim(p_campaign_key), '');

  if clean_key is null then
    raise exception 'campaign_key is required';
  end if;

  insert into public.traffic_campaigns(campaign_key)
  values(clean_key)
  on conflict (campaign_key) do nothing;

  select tc.id
  into target_campaign
  from public.traffic_campaigns tc
  where tc.campaign_key = clean_key
  limit 1;

  select *
  into link_row
  from public.paid_traffic_campaign_links
  where id = p_link_id
  for update;

  if link_row.id is null then
    raise exception 'paid traffic campaign link not found: %', p_link_id;
  end if;

  update public.paid_traffic_campaign_links
  set campaign_id = target_campaign,
      updated_at = now()
  where id = p_link_id;

  update public.paid_traffic_spend
  set campaign_id = target_campaign,
      updated_at = now()
  where provider = link_row.provider
    and coalesce(external_account_id, '') = link_row.external_account_id
    and external_campaign_id = link_row.external_campaign_id;

  get diagnostics affected = row_count;

  return query
  select p_link_id, target_campaign, clean_key, affected;
end;
$$;

create or replace function public.unlink_paid_traffic_campaign(
  p_link_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_row record;
  affected integer := 0;
begin
  select *
  into link_row
  from public.paid_traffic_campaign_links
  where id = p_link_id
  for update;

  if link_row.id is null then
    raise exception 'paid traffic campaign link not found: %', p_link_id;
  end if;

  update public.paid_traffic_campaign_links
  set campaign_id = null,
      updated_at = now()
  where id = p_link_id;

  update public.paid_traffic_spend
  set campaign_id = null,
      updated_at = now()
  where provider = link_row.provider
    and coalesce(external_account_id, '') = link_row.external_account_id
    and external_campaign_id = link_row.external_campaign_id;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.link_paid_traffic_campaign(uuid, text)
  from public, anon, authenticated;
revoke all on function public.unlink_paid_traffic_campaign(uuid)
  from public, anon, authenticated;

grant execute on function public.link_paid_traffic_campaign(uuid, text) to service_role;
grant execute on function public.unlink_paid_traffic_campaign(uuid) to service_role;
