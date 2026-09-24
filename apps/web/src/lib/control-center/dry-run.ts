import { getCanaryReadiness, probeCanaryIntegration } from "@/lib/control-center/readiness";
import { getFeatureGates, type FeatureGateState } from "@/lib/feature-gates";
import { runHunter } from "@/lib/hunter/run";
import { scoreUnscoredOffers } from "@/lib/intelligence/score-sync";
import { recordOperationalEvent } from "@/lib/events";
import { getPipelineSnapshot } from "@/lib/control-center/pipeline-snapshot";

export type DryRunMode = "probe" | "pipeline";
export type DryRunStepName =
  | "readiness"
  | "supabase_probe"
  | "shopee_probe"
  | "hunter"
  | "score";

export type DryRunStep = {
  name: DryRunStepName;
  status: "success" | "skipped" | "error";
  startedAt: string;
  finishedAt: string;
  detail: string;
  data?: unknown;
};

export function isDryRunSafetyClosed(gates: FeatureGateState): boolean {
  return !gates.autopilot && !gates.whatsappRealSend && !gates.metaAdsWrite;
}

export function hasOutboundArtifactDelta(
  before: { counts: { posts: number; deliveries: number } },
  after: { counts: { posts: number; deliveries: number } }
): boolean {
  return (
    after.counts.posts !== before.counts.posts ||
    after.counts.deliveries !== before.counts.deliveries
  );
}

export function getDryRunExecutionPlan(mode: DryRunMode): DryRunStepName[] {
  if (mode === "probe") {
    return ["readiness", "supabase_probe", "shopee_probe"];
  }

  return [
    "readiness",
    "supabase_probe",
    "shopee_probe",
    "hunter",
    "score"
  ];
}

async function runStep<T>(
  name: DryRunStepName,
  fn: () => Promise<T>,
  summarize: (data: T) => string
): Promise<{ step: DryRunStep; data: T | null }> {
  const startedAt = new Date().toISOString();

  try {
    const data = await fn();
    return {
      step: {
        name,
        status: "success",
        startedAt,
        finishedAt: new Date().toISOString(),
        detail: summarize(data),
        data
      },
      data
    };
  } catch (error) {
    return {
      step: {
        name,
        status: "error",
        startedAt,
        finishedAt: new Date().toISOString(),
        detail: error instanceof Error ? error.message : String(error)
      },
      data: null
    };
  }
}

export async function runControlCenterDryRun(input: {
  mode?: DryRunMode;
  strategyLimit?: number;
  scoreLimit?: number;
} = {}) {
  const mode = input.mode ?? "probe";
  const strategyLimit = Math.min(Math.max(input.strategyLimit ?? 2, 1), 5);
  const scoreLimit = Math.min(Math.max(input.scoreLimit ?? 50, 1), 100);
  const gates = getFeatureGates();
  const executionPlan = getDryRunExecutionPlan(mode);
  const startedAt = new Date().toISOString();
  const steps: DryRunStep[] = [];

  if (!isDryRunSafetyClosed(gates)) {
    return {
      ok: false,
      status: "blocked" as const,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: "unsafe_feature_gate",
      blockers: [
        ...(gates.autopilot ? ["AUTOPILOT_ENABLED"] : []),
        ...(gates.whatsappRealSend ? ["WHATSAPP_REAL_SEND_ENABLED"] : []),
        ...(gates.metaAdsWrite ? ["META_ADS_WRITE_ENABLED"] : [])
      ],
      executionPlan,
      steps,
      safety: {
        materializationAllowed: false,
        deliveryAllowed: false,
        metaWriteAllowed: false,
        whatsappSendAllowed: false
      }
    };
  }

  const readinessResult = await runStep(
    "readiness",
    () => getCanaryReadiness(),
    (data) =>
      data.readiness.dryRunReady
        ? "Readiness carregado; base pronta para dry-run."
        : `Readiness carregado com blockers: ${data.readiness.dryRunBlockers.join(", ") || "nenhum"}.`
  );
  steps.push(readinessResult.step);

  if (!readinessResult.data || readinessResult.step.status === "error") {
    return {
      ok: false,
      status: "failed" as const,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: "readiness_failed",
      executionPlan,
      steps,
      safety: {
        materializationAllowed: false,
        deliveryAllowed: false,
        metaWriteAllowed: false,
        whatsappSendAllowed: false
      }
    };
  }

  const readiness = readinessResult.data;
  const supabaseCheck = readiness.checks.find((item) => item.key === "supabase");
  const shopeeCheck = readiness.checks.find((item) => item.key === "shopee");

  if (supabaseCheck?.state !== "ready") {
    return {
      ok: false,
      status: "blocked" as const,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: "supabase_not_ready",
      blockers: ["supabase"],
      executionPlan,
      steps,
      safety: {
        materializationAllowed: false,
        deliveryAllowed: false,
        metaWriteAllowed: false,
        whatsappSendAllowed: false
      }
    };
  }

  const supabaseProbe = await runStep(
    "supabase_probe",
    () => probeCanaryIntegration("supabase"),
    (data) => `Supabase respondeu em ${data.latencyMs}ms.`
  );
  steps.push(supabaseProbe.step);

  if (supabaseProbe.step.status !== "success") {
    return {
      ok: false,
      status: "failed" as const,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: "supabase_probe_failed",
      executionPlan,
      steps,
      safety: {
        materializationAllowed: false,
        deliveryAllowed: false,
        metaWriteAllowed: false,
        whatsappSendAllowed: false
      }
    };
  }

  if (shopeeCheck?.state !== "ready") {
    steps.push({
      name: "shopee_probe",
      status: "skipped",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      detail: "Shopee Affiliate ainda não configurada."
    });

    return {
      ok: mode === "probe",
      status: mode === "probe" ? "completed_with_blockers" as const : "blocked" as const,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: "shopee_not_ready",
      blockers: ["shopee"],
      executionPlan,
      steps,
      safety: {
        materializationAllowed: false,
        deliveryAllowed: false,
        metaWriteAllowed: false,
        whatsappSendAllowed: false
      }
    };
  }

  const shopeeProbe = await runStep(
    "shopee_probe",
    () => probeCanaryIntegration("shopee"),
    (data) => `Shopee Affiliate respondeu em ${data.latencyMs}ms.`
  );
  steps.push(shopeeProbe.step);

  if (shopeeProbe.step.status !== "success" || mode === "probe") {
    const ok = shopeeProbe.step.status === "success";
    return {
      ok,
      status: ok ? "completed" as const : "failed" as const,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: ok ? null : "shopee_probe_failed",
      executionPlan,
      steps,
      safety: {
        materializationAllowed: false,
        deliveryAllowed: false,
        metaWriteAllowed: false,
        whatsappSendAllowed: false
      }
    };
  }

  const beforeSnapshot = await getPipelineSnapshot();

  const hunter = await runStep(
    "hunter",
    () => runHunter({ strategyLimit }),
    (data) =>
      `Hunter executou ${data.summary.strategies} estratégia(s), persistiu ${data.summary.offersPersisted} oferta(s) e encontrou ${data.summary.uniqueItems} item(ns) único(s).`
  );
  steps.push(hunter.step);

  if (hunter.step.status !== "success") {
    return {
      ok: false,
      status: "failed" as const,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: "hunter_failed",
      executionPlan,
      steps,
      safety: {
        materializationAllowed: false,
        deliveryAllowed: false,
        metaWriteAllowed: false,
        whatsappSendAllowed: false
      }
    };
  }

  const score = await runStep(
    "score",
    () => scoreUnscoredOffers(scoreLimit),
    (data) =>
      `Score processou ${data.processed} oferta(s): ${data.counts.PUBLISH} publish, ${data.counts.REVIEW} review e ${data.counts.REJECT} reject.`
  );
  steps.push(score.step);

  const afterSnapshot = await getPipelineSnapshot();
  const outboundArtifactDelta = hasOutboundArtifactDelta(
    beforeSnapshot,
    afterSnapshot
  );
  const ok = score.step.status === "success" && !outboundArtifactDelta;

  await recordOperationalEvent({
    eventType: "control_center.dry_run.completed",
    source: "control-center",
    payload: {
      mode,
      ok,
      strategyLimit,
      scoreLimit,
      steps: steps.map((step) => ({
        name: step.name,
        status: step.status,
        detail: step.detail
      })),
      safety: {
        materialization: false,
        delivery: false,
        metaWrite: false,
        whatsappSend: false,
        outboundArtifactDelta
      },
      pipelineDelta: {
        hunterRuns:
          afterSnapshot.counts.hunterRuns - beforeSnapshot.counts.hunterRuns,
        products:
          afterSnapshot.counts.products - beforeSnapshot.counts.products,
        offers:
          afterSnapshot.counts.offers - beforeSnapshot.counts.offers,
        scores:
          afterSnapshot.counts.scores - beforeSnapshot.counts.scores,
        posts:
          afterSnapshot.counts.posts - beforeSnapshot.counts.posts,
        deliveries:
          afterSnapshot.counts.deliveries - beforeSnapshot.counts.deliveries
      }
    }
  }).catch(() => undefined);

  return {
    ok,
    status: ok ? "completed" as const : "failed" as const,
    mode,
    startedAt,
    finishedAt: new Date().toISOString(),
    reason:
      outboundArtifactDelta
        ? "outbound_artifact_delta_detected"
        : ok
          ? null
          : "score_failed",
    executionPlan,
    steps,
    beforeSnapshot,
    afterSnapshot,
    pipelineDelta: {
      hunterRuns:
        afterSnapshot.counts.hunterRuns - beforeSnapshot.counts.hunterRuns,
      products:
        afterSnapshot.counts.products - beforeSnapshot.counts.products,
      offers:
        afterSnapshot.counts.offers - beforeSnapshot.counts.offers,
      scores:
        afterSnapshot.counts.scores - beforeSnapshot.counts.scores,
      posts:
        afterSnapshot.counts.posts - beforeSnapshot.counts.posts,
      deliveries:
        afterSnapshot.counts.deliveries - beforeSnapshot.counts.deliveries
    },
    safety: {
      materializationAllowed: false,
      deliveryAllowed: false,
      metaWriteAllowed: false,
      whatsappSendAllowed: false,
      outboundArtifactDelta
    },
    boundary:
      "Dry-run ends after scoring. It never materializes posts/deliveries and never calls a real-send or ads-write path."
  };
}
