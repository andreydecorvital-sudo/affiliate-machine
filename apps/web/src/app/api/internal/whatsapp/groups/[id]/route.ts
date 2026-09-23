import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { configureWhatsAppGroup } from "@/lib/whatsapp/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  niche: z.string().trim().min(1).max(80).default("general"),
  active: z.boolean(),
  acceptingTraffic: z.boolean().default(false)
});

export async function PATCH(
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
      group: await configureWhatsAppGroup({
        groupId: id,
        ...parsed.data
      })
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 502 }
    );
  }
}
