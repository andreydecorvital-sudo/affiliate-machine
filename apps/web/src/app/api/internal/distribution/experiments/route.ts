import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";
import {
  createDistributionExperiment,
  listDistributionExperiments
} from "@/lib/distribution/experiment-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const timingConfig = z.object({
  maxDelayHours: z.number().int().min(0).max(24).default(6),
  minConfidence: z.number().min(0).max(1).default(0.25)
});

const allocationConfig = z.object({
  maxGroups: z.number().int().min(1).max(50).default(3),
  explorationGroups: z.number().int().min(1).max(50).default(1),
  minConfidence: z.number().min(0).max(1).default(0.25)
});

const schema = z.discriminatedUnion("kind", [
  z.object({
    name: z.string().trim().min(2).max(120),
    kind: z.literal("timing"),
    niche: z.string().trim().min(1).max(80).nullable().optional(),
    treatmentShare: z.number().min(0.05).max(0.95).default(0.5),
    minPostsPerArm: z.number().int().min(5).max(100000).default(30),
    config: timingConfig.default({
      maxDelayHours: 6,
      minConfidence: 0.25
    })
  }),
  z.object({
    name: z.string().trim().min(2).max(120),
    kind: z.literal("group_allocation"),
    niche: z.string().trim().min(1).max(80).nullable().optional(),
    treatmentShare: z.number().min(0.05).max(0.95).default(0.5),
    minPostsPerArm: z.number().int().min(5).max(100000).default(30),
    config: allocationConfig
      .default({
        maxGroups: 3,
        explorationGroups: 1,
        minConfidence: 0.25
      })
      .superRefine((value, ctx) => {
        if (value.explorationGroups > value.maxGroups) {
          ctx.addIssue({
            code: "custom",
            path: ["explorationGroups"],
            message: "explorationGroups cannot exceed maxGroups"
          });
        }
      })
  })
]);

export async function GET(request: NextRequest) {
  if (!isInternalRequestAuthorized(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      ok: true,
      experiments: await listDistributionExperiments()
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

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
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
        experiment: await createDistributionExperiment(parsed.data)
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
