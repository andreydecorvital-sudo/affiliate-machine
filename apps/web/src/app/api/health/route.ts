import { NextResponse } from "next/server";
import { getFeatureGates } from "@/lib/feature-gates";
import { getServerEnv, getSupabaseServerKey } from "@/lib/env";
import { isGeminiConfigured } from "@/lib/gemini";
import { isShopeeAffiliateConfigured } from "@/lib/shopee/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerEnv();
  const supabaseConfigured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseServerKey(env));

  let database: "not_configured" | "ok" | "error" = "not_configured";
  let databaseError: string | null = null;

  if (supabaseConfigured) {
    try {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase
        .from("app_settings")
        .select("key")
        .eq("key", "system.version")
        .maybeSingle();

      if (error) throw error;
      database = "ok";
    } catch (error) {
      database = "error";
      databaseError = error instanceof Error ? error.message : "Unknown database error";
    }
  }

  const healthy = database !== "error";

  return NextResponse.json(
    {
      status: healthy ? (supabaseConfigured ? "ok" : "needs_config") : "degraded",
      service: "affiliate-machine-web",
      timestamp: new Date().toISOString(),
      dependencies: {
        supabase: database,
        gemini: isGeminiConfigured() ? "configured" : "not_configured",
        shopeeAffiliate: isShopeeAffiliateConfigured() ? "configured" : "not_configured"
      },
      gates: getFeatureGates(),
      diagnostics: databaseError ? { databaseError } : undefined
    },
    { status: healthy ? 200 : 503 }
  );
}
