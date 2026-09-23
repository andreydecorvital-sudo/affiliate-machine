import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  niche: z.string().trim().min(1).max(80).optional(),
  keyword: z.string().trim().min(1).max(120).nullable().optional(),
  productCatId: z.number().int().positive().nullable().optional(),
  listType: z.number().int().optional(),
  sortType: z.number().int().optional(),
  pagesPerRun: z.number().int().min(1).max(10).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  priority: z.number().int().min(0).max(10000).optional(),
  enabled: z.boolean().optional()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const value = parsed.data;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (value.niche !== undefined) patch.niche = value.niche;
  if (value.keyword !== undefined) patch.keyword = value.keyword;
  if (value.productCatId !== undefined) patch.product_cat_id = value.productCatId;
  if (value.listType !== undefined) patch.list_type = value.listType;
  if (value.sortType !== undefined) patch.sort_type = value.sortType;
  if (value.pagesPerRun !== undefined) patch.pages_per_run = value.pagesPerRun;
  if (value.pageSize !== undefined) patch.page_size = value.pageSize;
  if (value.priority !== undefined) patch.priority = value.priority;
  if (value.enabled !== undefined) patch.enabled = value.enabled;

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("hunter_strategies")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
  }

  return NextResponse.json({ ok: true, strategy: data });
}
