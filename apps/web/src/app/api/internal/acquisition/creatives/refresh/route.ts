import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { refreshPaidCreativeLearning } from "@/lib/acquisition/paid-creatives";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  days: z.number().int().min(7).max(365).default(30)
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
    return NextResponse.json({
      ok: true,
      result: await refreshPaidCreativeLearning(parsed.data.days)
    });
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
