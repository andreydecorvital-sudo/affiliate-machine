import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/events";

export async function refreshDistributionPerformance(days = 90) {
  const safeDays = Math.min(Math.max(Math.trunc(days), 7), 365);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc(
    "refresh_distribution_performance",
    { p_days: safeDays }
  );

  if (error) throw error;

  const summary = Array.isArray(data)
    ? data[0] ?? {
        timing_rows: 0,
        group_rows: 0,
        global_deliveries: 0,
        global_commission: 0
      }
    : data;

  await recordOperationalEvent({
    eventType: "distribution.learning_refreshed",
    source: "distribution-learning",
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

export async function getDistributionLearningStatus() {
  const supabase = createSupabaseAdminClient();

  const [timing, groups] = await Promise.all([
    supabase
      .from("distribution_timing_metrics")
      .select(
        "niche,local_hour,period_days,successful_deliveries,clicks,conversions,commission,raw_commission_per_delivery,smoothed_commission_per_delivery,rpc,sample_confidence,updated_at"
      )
      .order("niche", { ascending: true })
      .order("smoothed_commission_per_delivery", {
        ascending: false,
        nullsFirst: false
      }),
    supabase
      .from("distribution_group_metrics")
      .select(
        "group_id,period_days,successful_deliveries,clicks,conversions,commission,raw_commission_per_delivery,smoothed_commission_per_delivery,rpc,sample_confidence,updated_at,whatsapp_groups(name,niche,member_count,active)"
      )
      .order("smoothed_commission_per_delivery", {
        ascending: false,
        nullsFirst: false
      })
  ]);

  const error = timing.error || groups.error;
  if (error) throw error;

  return {
    timing: timing.data ?? [],
    groups: groups.data ?? [],
    notes: {
      timingTimezone: "America/Sao_Paulo",
      ctrAvailable: false,
      rankingSignal:
        "smoothed_commission_per_delivery with sample confidence"
    }
  };
}
