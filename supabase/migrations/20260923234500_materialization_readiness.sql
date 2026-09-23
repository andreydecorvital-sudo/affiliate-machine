create or replace function public.distribution_target_count(p_niche text)
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.whatsapp_groups g
  join public.whatsapp_accounts a on a.id = g.account_id
  where g.active = true
    and a.enabled = true
    and g.niche in (
      coalesce(nullif(trim(p_niche), ''), 'general'),
      'general'
    );
$$;

revoke all on function public.distribution_target_count(text)
  from public, anon, authenticated;
grant execute on function public.distribution_target_count(text)
  to service_role;
