import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import {
  createMessageExperiment,
  listExperiments
} from "@/lib/experiments/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const variantSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  config: z.object({
    headline: z.string().trim().min(1).max(90).optional(),
    ctaLabel: z.string().trim().min(1).max(60).optional(),
    footer: z.string().trim().min(1).max(160).optional()
  })
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  niche: z.string().trim().min(1).max(80).nullable().optional(),
  objective: z.enum(["rpc", "cvr", "commission_per_delivery"]).default("rpc"),
  minClicksPerVariant: z.number().int().min(5).max(100000).default(30),
  variants: z.array(variantSchema).min(2).max(8)
}).superRefine((value, ctx) => {
  const keys = value.variants.map((variant) => variant.key);
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({
      code: "custom",
      path: ["variants"],
      message: "variant keys must be unique"
    });
  }
});

export async function GET(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      ok: true,
      experiments: await listExperiments()
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

  try {
    return NextResponse.json(
      {
        ok: true,
        ...(await createMessageExperiment(parsed.data))
      },
      { status: 201 }
    );
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
