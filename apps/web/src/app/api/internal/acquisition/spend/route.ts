import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { ingestPaidTrafficSpend } from "@/lib/acquisition/paid-traffic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rowSchema = z.object({
  provider: z.string().trim().min(1).max(40),
  externalAccountId: z.string().trim().min(1).max(160).nullable().optional(),
  externalCampaignId: z.string().trim().min(1).max(160),
  campaignKey: z.string().trim().min(1).max(520),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().trim().length(3).default("BRL"),
  spend: z.number().min(0).max(1_000_000_000),
  impressions: z.number().int().min(0).max(9_000_000_000).default(0),
  platformClicks: z.number().int().min(0).max(9_000_000_000).default(0),
  utmSource: z.string().trim().max(160).nullable().optional(),
  utmMedium: z.string().trim().max(160).nullable().optional(),
  utmCampaign: z.string().trim().max(160).nullable().optional(),
  raw: z.record(z.string(), z.unknown()).default({})
});

const schema = z.object({
  rows: z.array(rowSchema).min(1).max(500)
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
      result: await ingestPaidTrafficSpend(parsed.data.rows)
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
