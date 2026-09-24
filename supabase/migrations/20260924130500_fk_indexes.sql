-- Performance hardening identified by Supabase advisor.
-- These indexes cover foreign-key columns used by joins/deletes.

create index if not exists acquisition_visits_group_id_idx
  on public.acquisition_visits(group_id);

create index if not exists affiliate_links_product_id_idx
  on public.affiliate_links(product_id);

create index if not exists commission_ledger_conversion_id_idx
  on public.commission_ledger(conversion_id);

create index if not exists experiment_assignments_variant_id_idx
  on public.experiment_assignments(variant_id);

create index if not exists offer_scores_product_id_idx
  on public.offer_scores(product_id);

create index if not exists offer_snapshots_discovery_strategy_id_idx
  on public.offer_snapshots(discovery_strategy_id);

create index if not exists paid_traffic_campaign_links_campaign_id_idx
  on public.paid_traffic_campaign_links(campaign_id);

create index if not exists post_deliveries_account_id_idx
  on public.post_deliveries(account_id);

create index if not exists post_deliveries_affiliate_link_id_idx
  on public.post_deliveries(affiliate_link_id);

create index if not exists post_deliveries_allocation_experiment_id_idx
  on public.post_deliveries(allocation_experiment_id);

create index if not exists post_deliveries_group_id_idx
  on public.post_deliveries(group_id);

create index if not exists post_deliveries_short_link_id_idx
  on public.post_deliveries(short_link_id);

create index if not exists post_deliveries_timing_experiment_id_idx
  on public.post_deliveries(timing_experiment_id);

create index if not exists posts_affiliate_link_id_idx
  on public.posts(affiliate_link_id);

create index if not exists posts_offer_snapshot_id_idx
  on public.posts(offer_snapshot_id);

create index if not exists posts_short_link_id_idx
  on public.posts(short_link_id);

create index if not exists short_links_affiliate_link_id_idx
  on public.short_links(affiliate_link_id);

create index if not exists whatsapp_send_dedupe_account_id_idx
  on public.whatsapp_send_dedupe(account_id);
