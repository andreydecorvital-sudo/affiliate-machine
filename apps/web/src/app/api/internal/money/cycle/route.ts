import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { runMoneyCycle } from "@/lib/money/cycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  keyword: z.string().trim().min(1).max(120).optional(),
  offerLimit: z.number().int().min(1).max(100).default(50),
  scoreLimit: z.number().int().min(1).max(500).default(100),
  materializeLimit: z.number().int().min(1).max(100).default(10),
  deliveryLimit: z.number().int().min(0).max(100).default(25),
  conversionDays: z.number().int().min(1).max(90).default(7),
  syncConversions: z.boolean().default(true),
  niche: z.string().trim().min(1).max(80).default("general")
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

  const result = await runMoneyCycle(parsed.data);
  const failed = Object.values(result.steps).some(
    (step) => step.status === "error"
  );

  return NextResponse.json(
    { ok: !failed, ...result },
    { status: failed ? 207 : 200 }
  );
}
