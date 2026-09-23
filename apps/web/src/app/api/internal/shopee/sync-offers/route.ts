import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { syncShopeeOffers } from "@/lib/shopee/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  keyword: z.string().trim().min(1).max(120).optional(),
  productCatId: z.number().int().positive().optional(),
  listType: z.number().int().optional(),
  sortType: z.number().int().optional(),
  page: z.number().int().positive().max(1000).default(1),
  limit: z.number().int().positive().max(100).default(50)
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
    const result = await syncShopeeOffers(parsed.data);
    return NextResponse.json({
      ok: true,
      fetched: result.items.length,
      persisted: result.persisted,
      page: result.page,
      limit: result.limit,
      hasNextPage: result.hasNextPage
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
