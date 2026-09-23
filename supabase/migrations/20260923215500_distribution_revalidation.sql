alter table public.posts
  add column if not exists last_revalidated_at timestamptz null,
  add column if not exists revalidation_state text not null default 'pending'
    check (revalidation_state in ('pending','valid','invalid')),
  add column if not exists revalidation_reason text null;

create or replace function public.get_post_revalidation_context(p_post_id uuid)
returns table (
  post_id uuid,
  first_sent_at timestamptz,
  last_revalidated_at timestamptz,
  external_item_id text,
  short_code text,
  niche text
)
language sql
security definer
set search_path = ''
as $$
  select
    p.id,
    p.first_sent_at,
    p.last_revalidated_at,
    ap.external_item_id,
    sl.code,
    p.niche
  from public.posts p
  join public.offer_snapshots os on os.id = p.offer_snapshot_id
  join public.affiliate_products ap on ap.id = os.product_id
  join public.short_links sl on sl.id = p.short_link_id
  where p.id = p_post_id
  limit 1;
$$;

create or replace function public.mark_post_revalidated(
  p_post_id uuid,
  p_state text,
  p_reason text default null,
  p_content text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_state not in ('valid','invalid') then
    raise exception 'Invalid revalidation state: %', p_state;
  end if;

  update public.posts
  set revalidation_state = p_state,
      revalidation_reason = p_reason,
      last_revalidated_at = now(),
      content = coalesce(p_content, content),
      updated_at = now()
  where id = p_post_id;

  if not found then
    raise exception 'Post not found: %', p_post_id;
  end if;
end;
$$;

create or replace function public.cancel_post(
  p_post_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set status = 'cancelled',
      revalidation_state = 'invalid',
      revalidation_reason = p_reason,
      last_revalidated_at = now(),
      updated_at = now()
  where id = p_post_id;

  if not found then
    raise exception 'Post not found: %', p_post_id;
  end if;

  update public.post_deliveries
  set status = 'skipped',
      last_error = p_reason,
      next_attempt_at = null,
      updated_at = now()
  where post_id = p_post_id
    and status in ('queued','sending','failed');
end;
$$;

revoke all on function public.get_post_revalidation_context(uuid) from public, anon, authenticated;
revoke all on function public.mark_post_revalidated(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.cancel_post(uuid, text) from public, anon, authenticated;

grant execute on function public.get_post_revalidation_context(uuid) to service_role;
grant execute on function public.mark_post_revalidated(uuid, text, text, text) to service_role;
grant execute on function public.cancel_post(uuid, text) to service_role;
