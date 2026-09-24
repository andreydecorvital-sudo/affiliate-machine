import type {
  MetaAdInsight,
  MetaCampaignInsight
} from "@affiliate/providers/meta";
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
  includeCreatives?: boolean;
};

async function persistCampaignInsight(
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

async function persistAdInsight(
  insight: MetaAdInsight,
  currency: string
) {
  const supabase = createSupabaseAdminClient();

  const { data: creative, error: creativeError } = await supabase
    .from("paid_creatives")
    .upsert(
      {
        provider: "meta",
        external_account_id: insight.externalAccountId,
        external_campaign_id: insight.externalCampaignId,
        external_adset_id: insight.externalAdsetId,
        external_ad_id: insight.externalAdId,
        campaign_name: insight.campaignName,
        adset_name: insight.adsetName,
        ad_name: insight.adName,
        metadata: {},
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        onConflict:
          "provider,external_account_id,external_ad_id"
      }
    )
    .select("id,campaign_id,creative_key")
    .single();

  if (creativeError) throw creativeError;

  const { error: spendError } = await supabase
    .from("paid_creative_spend")
    .upsert(
      {
        paid_creative_id: creative.id,
        provider: "meta",
        external_account_id: insight.externalAccountId,
        external_campaign_id: insight.externalCampaignId,
        external_adset_id: insight.externalAdsetId,
        external_ad_id: insight.externalAdId,
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
          "provider,external_account_id,external_ad_id,spent_on,currency"
      }
    );

  if (spendError) throw spendError;

  return {
    creativeId: String(creative.id),
    mapped: Boolean(creative.campaign_id && creative.creative_key)
  };
}

export async function syncMetaAdsInsights(
  input: MetaSyncInput
) {
  const client = createMetaAdsReadOnlyClient();
  const account = await client.getAdAccountInfo();

  const [campaignRows, adRows] = await Promise.all([
    client.getDailyCampaignInsights({
      since: input.since,
      until: input.until,
      maxPages: input.maxPages
    }),
    input.includeCreatives === false
      ? Promise.resolve([])
      : client.getDailyAdInsights({
          since: input.since,
          until: input.until,
          maxPages: input.maxPages
        })
  ]);

  let campaignPersisted = 0;
  let mappedCampaignRows = 0;
  let campaignSpend = 0;
  const campaignIds = new Set<string>();
  const unmappedCampaignIds = new Set<string>();

  for (const row of campaignRows) {
    const result = await persistCampaignInsight(row, account.currency);
    campaignPersisted += 1;
    campaignSpend += row.spend;
    campaignIds.add(row.externalCampaignId);

    if (result.campaignId) mappedCampaignRows += 1;
    else unmappedCampaignIds.add(row.externalCampaignId);
  }

  let creativePersisted = 0;
  let mappedCreativeRows = 0;
  let creativeSpend = 0;
  const creativeIds = new Set<string>();

  for (const row of adRows) {
    const result = await persistAdInsight(row, account.currency);
    creativePersisted += 1;
    creativeSpend += row.spend;
    creativeIds.add(row.externalAdId);
    if (result.mapped) mappedCreativeRows += 1;
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
    campaigns: {
      rowsFetched: campaignRows.length,
      rowsPersisted: campaignPersisted,
      mappedRows: mappedCampaignRows,
      unique: campaignIds.size,
      unmapped: unmappedCampaignIds.size,
      totalSpend: Number(campaignSpend.toFixed(6))
    },
    creatives: {
      rowsFetched: adRows.length,
      rowsPersisted: creativePersisted,
      mappedRows: mappedCreativeRows,
      unique: creativeIds.size,
      totalSpend: Number(creativeSpend.toFixed(6))
    }
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

  const [links, spend, creatives, creativeSpend] = await Promise.all([
    supabase
      .from("paid_traffic_campaign_links")
      .select("id,campaign_id", { count: "exact" })
      .eq("provider", "meta"),
    supabase
      .from("paid_traffic_spend")
      .select("id", { count: "exact", head: true })
      .eq("provider", "meta"),
    supabase
      .from("paid_creatives")
      .select("id,campaign_id,creative_key", { count: "exact" })
      .eq("provider", "meta"),
    supabase
      .from("paid_creative_spend")
      .select("id", { count: "exact", head: true })
      .eq("provider", "meta")
  ]);

  const error =
    links.error ||
    spend.error ||
    creatives.error ||
    creativeSpend.error;
  if (error) throw error;

  const linkRows = links.data ?? [];
  const creativeRows = creatives.data ?? [];

  return {
    ...config,
    campaigns: {
      discovered: links.count ?? linkRows.length,
      mapped: linkRows.filter((row) => row.campaign_id).length,
      unmapped: linkRows.filter((row) => !row.campaign_id).length
    },
    creatives: {
      discovered: creatives.count ?? creativeRows.length,
      mapped: creativeRows.filter(
        (row) => row.campaign_id && row.creative_key
      ).length,
      unmapped: creativeRows.filter(
        (row) => !row.campaign_id || !row.creative_key
      ).length
    },
    spendRows: spend.count ?? 0,
    creativeSpendRows: creativeSpend.count ?? 0,
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
