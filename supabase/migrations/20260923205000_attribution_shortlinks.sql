create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  provider text not null,
  affiliate_link_id uuid null references public.affiliate_links(id) on delete set null,
  destination_url text not null,
  tracking_key text null,
  context jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create index if not exists short_links_tracking_idx
  on public.short_links(provider, tracking_key)
  where tracking_key is not null;

create table if not exists public.click_events (
  id bigint generated always as identity primary key,
  short_link_id uuid not null references public.short_links(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  referrer_host text null,
  user_agent_family text not null default 'unknown'
    check (user_agent_family in ('bot','mobile','desktop','unknown')),
  is_bot boolean not null default false
);

create index if not exists click_events_link_time_idx
  on public.click_events(short_link_id, occurred_at desc);

alter table public.short_links enable row level security;
alter table public.click_events enable row level security;

revoke all on table public.short_links from anon, authenticated;
revoke all on table public.click_events from anon, authenticated;

grant select, insert, update, delete on table public.short_links to service_role;
grant select, insert, update, delete on table public.click_events to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.create_short_link(
  p_code text,
  p_provider text,
  p_affiliate_link_id uuid,
  p_destination_url text,
  p_tracking_key text default null,
  p_context jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_uuid uuid;
begin
  insert into public.short_links(
    code,
    provider,
    affiliate_link_id,
    destination_url,
    tracking_key,
    context,
    expires_at
  )
  values(
    p_code,
    p_provider,
    p_affiliate_link_id,
    p_destination_url,
    nullif(p_tracking_key, ''),
    coalesce(p_context, '{}'::jsonb),
    p_expires_at
  )
  returning id into link_uuid;

  return link_uuid;
end;
$$;

create or replace function public.resolve_short_link(p_code text)
returns table (
  short_link_id uuid,
  destination_url text,
  tracking_key text,
  context jsonb
)
language sql
security definer
set search_path = ''
as $$
  select id, destination_url, tracking_key, context
  from public.short_links
  where code = p_code
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

create or replace function public.record_short_link_click(
  p_short_link_id uuid,
  p_referrer_host text default null,
  p_user_agent_family text default 'unknown',
  p_is_bot boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  click_id bigint;
begin
  insert into public.click_events(
    short_link_id,
    referrer_host,
    user_agent_family,
    is_bot
  )
  values(
    p_short_link_id,
    nullif(p_referrer_host, ''),
    case
      when p_user_agent_family in ('bot','mobile','desktop','unknown')
      then p_user_agent_family
      else 'unknown'
    end,
    coalesce(p_is_bot, false)
  )
  returning id into click_id;

  return click_id;
end;
$$;

revoke all on function public.create_short_link(text, text, uuid, text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.resolve_short_link(text) from public, anon, authenticated;
revoke all on function public.record_short_link_click(uuid, text, text, boolean) from public, anon, authenticated;

grant execute on function public.create_short_link(text, text, uuid, text, text, jsonb, timestamptz) to service_role;
grant execute on function public.resolve_short_link(text) to service_role;
grant execute on function public.record_short_link_click(uuid, text, text, boolean) to service_role;
