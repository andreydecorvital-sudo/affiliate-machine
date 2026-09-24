import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFeatureGates } from "@/lib/feature-gates";

async function exactCount(
  query: PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getPipelineSnapshot() {
  const supabase = createSupabaseAdminClient();

  const [
    enabledStrategies,
    hunterRuns,
    products,
    offers,
    scores,
    posts,
    deliveries,
    conversions,
    whatsappAccounts,
    whatsappGroups
  ] = await Promise.all([
    exactCount(
      supabase
        .from("hunter_strategies")
        .select("id", { count: "exact", head: true })
        .eq("enabled", true)
    ),
    exactCount(
      supabase
        .from("hunter_runs")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("affiliate_products")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("offer_snapshots")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("offer_scores")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("post_deliveries")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("conversions")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("whatsapp_accounts")
        .select("id", { count: "exact", head: true })
    ),
    exactCount(
      supabase
        .from("whatsapp_groups")
        .select("id", { count: "exact", head: true })
    )
  ]);

  const gates = getFeatureGates();

  return {
    capturedAt: new Date().toISOString(),
    counts: {
      enabledStrategies,
      hunterRuns,
      products,
      offers,
      scores,
      posts,
      deliveries,
      conversions,
      whatsappAccounts,
      whatsappGroups
    },
    safety: {
      autopilot: gates.autopilot,
      whatsappRealSend: gates.whatsappRealSend,
      metaAdsWrite: gates.metaAdsWrite,
      allDangerousGatesOff:
        !gates.autopilot && !gates.whatsappRealSend && !gates.metaAdsWrite,
      outboundArtifactsCreated: posts > 0 || deliveries > 0
    }
  };
}
