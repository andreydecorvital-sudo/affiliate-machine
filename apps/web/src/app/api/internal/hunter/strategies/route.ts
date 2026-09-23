import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  niche: z.string().trim().min(1).max(80).default("general"),
  keyword: z.string().trim().min(1).max(120).nullable().optional(),
  productCatId: z.number().int().positive().nullable().optional(),
  listType: z.number().int().default(0),
  sortType: z.number().int().default(0),
  pagesPerRun: z.number().int().min(1).max(10).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  priority: z.number().int().min(0).max(10000).default(100),
  enabled: z.boolean().default(true)
});

export async function GET(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("hunter_strategies")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, strategies: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const value = parsed.data;
  const { data, error } = await supabase
    .from("hunter_strategies")
    .insert({
      provider: "shopee",
      name: value.name,
      niche: value.niche,
      keyword: value.keyword ?? null,
      product_cat_id: value.productCatId ?? null,
      list_type: value.listType,
      sort_type: value.sortType,
      pages_per_run: value.pagesPerRun,
      page_size: value.pageSize,
      priority: value.priority,
      enabled: value.enabled
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, strategy: data }, { status: 201 });
}
