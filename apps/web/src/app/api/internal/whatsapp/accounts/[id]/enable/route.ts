import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { setWhatsAppAccountEnabled } from "@/lib/whatsapp/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ enabled: z.boolean() });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  try {
    return NextResponse.json({
      ok: true,
      account: await setWhatsAppAccountEnabled(id, parsed.data.enabled)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 409 }
    );
  }
}
