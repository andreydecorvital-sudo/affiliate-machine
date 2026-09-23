import { NextRequest, NextResponse } from "next/server";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { getPaidTrafficEconomics } from "@/lib/acquisition/paid-traffic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawDays = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const days = Number.isFinite(rawDays) ? rawDays : 30;

  try {
    return NextResponse.json({
      ok: true,
      ...(await getPaidTrafficEconomics(days))
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
