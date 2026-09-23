import { NextRequest, NextResponse } from "next/server";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    visits,
    routed,
    groups
  ] = await Promise.all([
    supabase
      .from("acquisition_visits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    supabase
      .from("acquisition_visits")
      .select("id", { count: "exact", head: true })
      .eq("routed", true)
      .gte("created_at", since),
    supabase
      .from("whatsapp_groups")
      .select("id,name,niche,member_count,capacity_limit,active,accepting_traffic,last_routed_at")
      .eq("active", true)
      .order("niche", { ascending: true })
  ]);

  const firstError = visits.error || routed.error || groups.error;
  if (firstError) {
    return NextResponse.json(
      { ok: false, error: firstError.message },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    periodDays: 7,
    visits: visits.count ?? 0,
    routed: routed.count ?? 0,
    routeRate:
      (visits.count ?? 0) > 0
        ? Number((((routed.count ?? 0) / (visits.count ?? 1)) * 100).toFixed(2))
        : 0,
    groups: groups.data ?? []
  });
}
