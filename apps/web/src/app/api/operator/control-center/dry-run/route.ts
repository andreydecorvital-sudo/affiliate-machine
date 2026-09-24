import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasOperatorSession } from "@/lib/single-user-auth";
import { runControlCenterDryRun } from "@/lib/control-center/dry-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  mode: z.enum(["probe", "pipeline"]).default("probe")
});

export async function POST(request: NextRequest) {
  if (!(await hasOperatorSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await runControlCenterDryRun({
    mode: parsed.data.mode,
    strategyLimit: parsed.data.mode === "pipeline" ? 2 : 1,
    scoreLimit: 50
  });

  return NextResponse.json(result, {
    status:
      result.status === "blocked"
        ? 409
        : result.status === "failed"
          ? 502
          : 200
  });
}
