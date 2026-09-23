import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaidTrafficEconomics } from "@/lib/acquisition/paid-traffic";

export async function getMoneyAnalytics(days = 30) {
  const safeDays = Math.min(Math.max(Math.trunc(days), 1), 365);
  const supabase = createSupabaseAdminClient();

  const [
    summaryResult,
    groupResult,
    conversionCount,
    attributedCount,
    paidTraffic
  ] = await Promise.all([
    supabase.rpc("money_summary", { p_days: safeDays }),
    supabase.rpc("money_group_performance", { p_days: safeDays }),
    supabase
      .from("conversions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("conversion_attributions")
      .select("id", { count: "exact", head: true }),
    getPaidTrafficEconomics(safeDays)
  ]);

  const error =
    summaryResult.error ||
    groupResult.error ||
    conversionCount.error ||
    attributedCount.error;

  if (error) throw error;

  const summary = Array.isArray(summaryResult.data)
    ? summaryResult.data[0] ?? null
    : summaryResult.data;

  const totalConversions = conversionCount.count ?? 0;
  const attributedConversions = attributedCount.count ?? 0;

  return {
    periodDays: safeDays,
    summary,
    groups: groupResult.data ?? [],
    paidTraffic,
    attribution: {
      totalConversions,
      attributedConversions,
      unattributedConversions: Math.max(
        0,
        totalConversions - attributedConversions
      ),
      attributionRate:
        totalConversions > 0
          ? Number(
              ((attributedConversions / totalConversions) * 100).toFixed(2)
            )
          : 0
    }
  };
}

export async function reconcileMoneyAttribution() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "reconcile_conversion_attributions"
  );

  if (error) throw error;

  return Array.isArray(data)
    ? data[0] ?? { attributed: 0, unattributed: 0 }
    : data ?? { attributed: 0, unattributed: 0 };
}
