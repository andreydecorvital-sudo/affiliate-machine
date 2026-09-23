import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { materializePublishablePosts } from "@/lib/distribution/materialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
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

  try {
    return NextResponse.json({
      ok: true,
      ...(await materializePublishablePosts(parsed.data))
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 502 }
    );
  }
}
