import { NextRequest, NextResponse } from "next/server";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { getDistributionLearningStatus } from "@/lib/distribution/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      ok: true,
      ...(await getDistributionLearningStatus())
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
