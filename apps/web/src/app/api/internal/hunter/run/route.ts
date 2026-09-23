import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { runHunter } from "@/lib/hunter/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  strategyLimit: z.number().int().min(1).max(50).default(10)
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
      ...(await runHunter(parsed.data))
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 502 }
    );
  }
}
