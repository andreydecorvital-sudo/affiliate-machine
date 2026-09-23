import type { MetaCampaignInsight } from "@affiliate/providers/meta";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createMetaAdsReadOnlyClient,
  getMetaAdsReadOnlyConfig
} from "@/lib/meta/client";
import { recordOperationalEvent } from "@/lib/events";

type MetaSyncInput = {
  since: string;
  until: string;
  maxPages?: number;
};

async function persistMetaInsight(
  insight: MetaCampaignInsight,
  currency: string
) {
  const supabase = createSupabaseAdminClient();

  const { data: link, error: linkError } = await supabase
    .from("paid_traffic_campaign_links")
    .upsert(
      {
        provider: "meta",
        external_account_id: insight.externalAccountId,
        external_campaign_id: insight.externalCampaignId,
        external_campaign_name: insight.campaignName,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        onConflict:
          "provider,external_account_id,external_campaign_id"
      }
    )
    .select(
      "id,campaign_id,external_campaign_id,external_campaign_name"
    )
    .single();

  if (linkError) throw linkError;

  const { error: spendError } = await supabase
    .from("paid_traffic_spend")
    .upsert(
      {
        provider: "meta",
        external_account_id: insight.externalAccountId,
        external_campaign_id: insight.externalCampaignId,
        external_campaign_name: insight.campaignName,
        campaign_id: link.campaign_id ?? null,
        spent_on: insight.spentOn,
        currency,
        spend: insight.spend,
        impressions: insight.impressions,
        platform_clicks: insight.clicks,
        raw: insight.raw,
        updated_at: new Date().toISOString()
      },
      {
        onConflict:
          "provider,external_campaign_id,spent_on,currency"
      }
    );

  if (spendError) throw spendError;

  return {
    linkId: String(link.id),
    campaignId: link.campaign_id
      ? String(link.campaign_id)
      : null
  };
}

export async function syncMetaAdsInsights(
  input: MetaSyncInput
) {
  const client = createMetaAdsReadOnlyClient();
  const account = await client.getAdAccountInfo();
  const rows = await client.getDailyCampaignInsights({
    since: input.since,
    until: input.until,
    maxPages: input.maxPages
  });

  let persisted = 0;
  let mappedRows = 0;
  let totalSpend = 0;
  const campaignIds = new Set<string>();
  const unmappedCampaignIds = new Set<string>();

  for (const row of rows) {
    const result = await persistMetaInsight(
      row,
      account.currency
    );

    persisted += 1;
    totalSpend += row.spend;
    campaignIds.add(row.externalCampaignId);

    if (result.campaignId) {
      mappedRows += 1;
    } else {
      unmappedCampaignIds.add(row.externalCampaignId);
    }
  }

  const summary = {
    provider: "meta" as const,
    account: {
      id: account.accountId,
      name: account.accountName,
      currency: account.currency
    },
    since: input.since,
    until: input.until,
    rowsFetched: rows.length,
    rowsPersisted: persisted,
    mappedRows,
    uniqueCampaigns: campaignIds.size,
    unmappedCampaigns: unmappedCampaignIds.size,
    totalSpend: Number(totalSpend.toFixed(6))
  };

  await recordOperationalEvent({
    eventType: "paid.meta.insights_synced",
    source: "meta-ads-readonly",
    payload: summary
  }).catch(() => undefined);

  return summary;
}

export async function getMetaAdsReadOnlyStatus() {
  const config = getMetaAdsReadOnlyConfig();
  const supabase = createSupabaseAdminClient();

  const [links, spend] = await Promise.all([
    supabase
      .from("paid_traffic_campaign_links")
      .select("id,campaign_id", { count: "exact" })
      .eq("provider", "meta"),
    supabase
      .from("paid_traffic_spend")
      .select("id", { count: "exact", head: true })
      .eq("provider", "meta")
  ]);

  const error = links.error || spend.error;
  if (error) throw error;

  const linkRows = links.data ?? [];

  return {
    ...config,
    campaigns: {
      discovered: links.count ?? linkRows.length,
      mapped: linkRows.filter((row) => row.campaign_id).length,
      unmapped: linkRows.filter((row) => !row.campaign_id).length
    },
    spendRows: spend.count ?? 0,
    writeEnabled: false
  };
}

export async function listMetaCampaignLinks() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("paid_traffic_campaign_links")
    .select(
      "id,external_account_id,external_campaign_id,external_campaign_name,campaign_id,discovered_at,last_seen_at,updated_at,traffic_campaigns(campaign_key,utm_source,utm_medium,utm_campaign)"
    )
    .eq("provider", "meta")
    .order("last_seen_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function linkMetaCampaign(
  linkId: string,
  campaignKey: string
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "link_paid_traffic_campaign",
    {
      p_link_id: linkId,
      p_campaign_key: campaignKey
    }
  );

  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data;
}

export async function unlinkMetaCampaign(linkId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "unlink_paid_traffic_campaign",
    { p_link_id: linkId }
  );

  if (error) throw error;
  return { updatedSpendRows: Number(data ?? 0) };
}
