import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { syncShopeeConversions } from "@/lib/shopee/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  days: z.number().int().min(1).max(90).default(7),
  maxPages: z.number().int().min(1).max(100).default(20),
  orderStatus: z
    .enum(["ALL", "UNPAID", "PENDING", "COMPLETED", "CANCELLED"])
    .default("ALL")
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

  const purchaseTimeEnd = Math.floor(Date.now() / 1000);
  const purchaseTimeStart = purchaseTimeEnd - parsed.data.days * 86400;

  try {
    const result = await syncShopeeConversions(
      {
        purchaseTimeStart,
        purchaseTimeEnd,
        orderStatus: parsed.data.orderStatus,
        limit: 50
      },
      parsed.data.maxPages
    );

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
