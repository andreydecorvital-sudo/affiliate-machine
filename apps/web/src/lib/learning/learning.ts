import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/events";

export async function refreshLearningMetrics(days = 90) {
  const safeDays = Math.min(Math.max(Math.trunc(days), 7), 365);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("refresh_learning_metrics", {
    p_days: safeDays
  });

  if (error) throw error;

  const summary = Array.isArray(data)
    ? data[0] ?? {
        product_rows: 0,
        strategy_rows: 0,
        global_clicks: 0,
        global_conversions: 0,
        global_commission: 0
      }
    : data;

  await recordOperationalEvent({
    eventType: "learning.metrics_refreshed",
    source: "learning",
    payload: {
      periodDays: safeDays,
      ...summary
    }
  }).catch(() => undefined);

  return {
    periodDays: safeDays,
    ...summary
  };
}

export async function getLearningStatus() {
  const supabase = createSupabaseAdminClient();

  const [products, strategies, ranking] = await Promise.all([
    supabase
      .from("learning_product_metrics")
      .select(
        "product_id,period_days,successful_deliveries,clicks,conversions,commission,smoothed_cvr,smoothed_rpc,sample_confidence,updated_at"
      )
      .order("smoothed_rpc", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("learning_strategy_metrics")
      .select(
        "strategy_id,period_days,published_products,successful_deliveries,clicks,conversions,commission,smoothed_cvr,smoothed_rpc,sample_confidence,performance_index,updated_at"
      )
      .order("performance_index", { ascending: false, nullsFirst: false }),
    supabase.rpc("learning_strategy_rank")
  ]);

  const error = products.error || strategies.error || ranking.error;
  if (error) throw error;

  return {
    products: products.data ?? [],
    strategies: strategies.data ?? [],
    ranking: ranking.data ?? []
  };
}
