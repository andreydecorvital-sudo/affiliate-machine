import { NextRequest, NextResponse } from "next/server";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncWhatsAppGroups } from "@/lib/whatsapp/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select("id,group_jid,name,member_count,niche,active,accepting_traffic,invite_url,capacity_limit,last_routed_at,last_synced_at")
    .eq("account_id", id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, groups: data ?? [] });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    return NextResponse.json({
      ok: true,
      result: await syncWhatsAppGroups(id)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 502 }
    );
  }
}
