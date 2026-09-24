import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/events";

export async function refreshPaidCreativeLearning(days = 30) {
  const safeDays = Math.min(Math.max(Math.trunc(days), 7), 365);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "refresh_paid_creative_learning",
    { p_days: safeDays }
  );
  if (error) throw error;

  const summary = Array.isArray(data) ? data[0] ?? null : data;
  await recordOperationalEvent({
    eventType: "acquisition.creative_learning_refreshed",
    source: "paid-creative-learning",
    payload: { periodDays: safeDays, summary }
  }).catch(() => undefined);

  return { periodDays: safeDays, summary };
}

export async function getPaidCreativePerformance(days = 30) {
  const safeDays = Math.min(Math.max(Math.trunc(days), 1), 365);
  const supabase = createSupabaseAdminClient();
  const [performance, metrics, creatives] = await Promise.all([
    supabase.rpc("paid_creative_performance", { p_days: safeDays }),
    supabase
      .from("paid_creative_metrics")
      .select("*")
      .order("smoothed_net_per_routed_visit", {
        ascending: false,
        nullsFirst: false
      }),
    supabase
      .from("paid_creatives")
      .select(
        "id,provider,external_account_id,external_campaign_id,external_adset_id,external_ad_id,campaign_id,creative_key,campaign_name,adset_name,ad_name,last_seen_at"
      )
      .order("last_seen_at", { ascending: false })
  ]);

  const error = performance.error || metrics.error || creatives.error;
  if (error) throw error;

  return {
    periodDays: safeDays,
    performance: performance.data ?? [],
    metrics: metrics.data ?? [],
    creatives: creatives.data ?? [],
    notes: {
      exact: [
        "creative spend",
        "creative platform impressions/clicks",
        "routed visits matched by campaign + utm_content"
      ],
      modeled: [
        "commission allocated by creative share of routed visits inside each group",
        "creative net commission",
        "creative commission ROAS",
        "learning rank"
      ]
    }
  };
}

export async function linkPaidCreative(input: {
  paidCreativeId: string;
  campaignKey: string;
  creativeKey: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("link_paid_creative", {
    p_paid_creative_id: input.paidCreativeId,
    p_campaign_key: input.campaignKey,
    p_creative_key: input.creativeKey
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data;
}

export async function unlinkPaidCreative(paidCreativeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("unlink_paid_creative", {
    p_paid_creative_id: paidCreativeId
  });
  if (error) throw error;
  return { unlinked: Boolean(data) };
}
