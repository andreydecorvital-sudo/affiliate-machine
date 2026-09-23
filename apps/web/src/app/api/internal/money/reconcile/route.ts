import { NextRequest, NextResponse } from "next/server";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { reconcileMoneyAttribution } from "@/lib/money/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      ok: true,
      result: await reconcileMoneyAttribution()
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
