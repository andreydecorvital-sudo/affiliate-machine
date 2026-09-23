import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { createTrackedShopeeLink } from "@/lib/shopee/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  externalItemId: z.string().trim().min(1).max(80),
  originUrl: z.string().url(),
  subIds: z.array(z.string().trim().min(1).max(120)).max(5).optional(),
  trackingKey: z.string().trim().min(1).max(160).optional()
});

export async function POST(request: NextRequest) {
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

  try {
    const result = await createTrackedShopeeLink(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown_error"
      },
      { status: 502 }
    );
  }
}
