import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import {
  linkPaidCreative,
  unlinkPaidCreative
} from "@/lib/acquisition/paid-creatives";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  campaignKey: z.string().trim().min(1).max(520),
  creativeKey: z.string().trim().min(1).max(240)
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  try {
    return NextResponse.json({
      ok: true,
      result: await linkPaidCreative({
        paidCreativeId: id,
        campaignKey: parsed.data.campaignKey,
        creativeKey: parsed.data.creativeKey
      })
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown_error"
      },
      { status: 409 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    return NextResponse.json({
      ok: true,
      result: await unlinkPaidCreative(id)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown_error"
      },
      { status: 409 }
    );
  }
}
