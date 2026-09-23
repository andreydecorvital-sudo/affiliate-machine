import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PaidTrafficSpendInput = {
  provider: string;
  externalAccountId?: string | null;
  externalCampaignId: string;
  campaignKey: string;
  spentOn: string;
  currency?: string;
  spend: number;
  impressions?: number;
  platformClicks?: number;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  raw?: Record<string, unknown>;
};

export async function ingestPaidTrafficSpend(
  rows: PaidTrafficSpendInput[]
) {
  const supabase = createSupabaseAdminClient();
  let totalSpend = 0;
  let persisted = 0;

  for (const row of rows) {
    const { data: campaign, error: campaignError } = await supabase
      .from("traffic_campaigns")
      .upsert(
        {
          campaign_key: row.campaignKey,
          utm_source: row.utmSource ?? null,
          utm_medium: row.utmMedium ?? null,
          utm_campaign: row.utmCampaign ?? null
        },
        { onConflict: "campaign_key" }
      )
      .select("id,campaign_key")
      .single();

    if (campaignError) throw campaignError;

    const currency = (row.currency ?? "BRL").trim().toUpperCase();

    const { error } = await supabase
      .from("paid_traffic_spend")
      .upsert(
        {
          provider: row.provider.trim().toLowerCase(),
          external_account_id: row.externalAccountId?.trim() || null,
          external_campaign_id: row.externalCampaignId.trim(),
          campaign_id: campaign.id,
          spent_on: row.spentOn,
          currency,
          spend: row.spend,
          impressions: row.impressions ?? 0,
          platform_clicks: row.platformClicks ?? 0,
          raw: row.raw ?? {},
          updated_at: new Date().toISOString()
        },
        {
          onConflict:
            "provider,external_campaign_id,spent_on,currency"
        }
      );

    if (error) throw error;

    totalSpend += row.spend;
    persisted += 1;
  }

  return {
    persisted,
    totalSpend: Number(totalSpend.toFixed(6))
  };
}

export async function getPaidTrafficEconomics(days = 30) {
  const safeDays = Math.min(Math.max(Math.trunc(days), 1), 365);
  const supabase = createSupabaseAdminClient();

  const [campaigns, groups] = await Promise.all([
    supabase.rpc("paid_campaign_performance", { p_days: safeDays }),
    supabase.rpc("paid_group_economics", { p_days: safeDays })
  ]);

  const error = campaigns.error || groups.error;
  if (error) throw error;

  return {
    periodDays: safeDays,
    campaigns: campaigns.data ?? [],
    groups: groups.data ?? [],
    notes: {
      exact: [
        "campaign spend",
        "platform impressions/clicks",
        "routed visits",
        "group-attributed commission"
      ],
      modeled: [
        "group spend allocation",
        "group commission ROAS",
        "group net commission after modeled spend"
      ]
    }
  };
}
