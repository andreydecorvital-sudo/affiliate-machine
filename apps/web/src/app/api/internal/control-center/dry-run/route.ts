import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { runControlCenterDryRun } from "@/lib/control-center/dry-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  mode: z.enum(["probe", "pipeline"]).default("probe"),
  strategyLimit: z.number().int().min(1).max(5).default(2),
  scoreLimit: z.number().int().min(1).max(100).default(50)
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
    const result = await runControlCenterDryRun(parsed.data);

    return NextResponse.json(
      result,
      {
        status:
          result.status === "blocked"
            ? 409
            : result.status === "failed"
              ? 502
              : 200
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        error: error instanceof Error ? error.message : "unknown_error"
      },
      { status: 502 }
    );
  }
}
