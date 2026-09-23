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

  const [
    quota,
    pendingDeliveries,
    failedDeliveries,
    readyPosts
  ] = await Promise.all([
    supabase.rpc("distribution_quota_status"),
    supabase
      .from("post_deliveries")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "sending"]),
    supabase
      .from("post_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .in("status", ["ready", "queued", "partially_sent"])
  ]);

  const firstError =
    quota.error ||
    pendingDeliveries.error ||
    failedDeliveries.error ||
    readyPosts.error;

  if (firstError) {
    return NextResponse.json(
      { ok: false, error: firstError.message },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    quota: Array.isArray(quota.data) ? quota.data[0] ?? null : quota.data,
    queue: {
      pendingDeliveries: pendingDeliveries.count ?? 0,
      failedDeliveries: failedDeliveries.count ?? 0,
      activePosts: readyPosts.count ?? 0
    }
  });
}
