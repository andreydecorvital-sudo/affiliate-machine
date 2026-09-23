import { syncShopeeOffers, syncShopeeConversions } from "@/lib/shopee/sync";
import { runHunter } from "@/lib/hunter/run";
import { refreshLearningMetrics } from "@/lib/learning/learning";
import { refreshDistributionPerformance } from "@/lib/distribution/learning";
import { scoreUnscoredOffers } from "@/lib/intelligence/score-sync";
import { materializePublishablePosts } from "@/lib/distribution/materialize";
import { processNextDelivery } from "@/lib/distribution/process";
import { getMoneyAnalytics } from "@/lib/money/analytics";
import { recordOperationalEvent } from "@/lib/events";

type MoneyCycleInput = {
  keyword?: string;
  offerLimit?: number;
  hunterStrategyLimit?: number;
  scoreLimit?: number;
  materializeLimit?: number;
  deliveryLimit?: number;
  conversionDays?: number;
  learningDays?: number;
  distributionLearningDays?: number;
  syncConversions?: boolean;
  niche?: string;
};

type StepOk<T> = {
  status: "ok";
  durationMs: number;
  data: T;
};

type StepError = {
  status: "error";
  durationMs: number;
  error: string;
};

export type MoneyCycleStep<T> = StepOk<T> | StepError;

async function runStep<T>(fn: () => Promise<T>): Promise<MoneyCycleStep<T>> {
  const started = Date.now();

  try {
    const data = await fn();
    return {
      status: "ok",
      durationMs: Date.now() - started,
      data
    };
  } catch (error) {
    return {
      status: "error",
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function processDeliveries(limit: number) {
  const results: Awaited<ReturnType<typeof processNextDelivery>>[] = [];

  for (let index = 0; index < limit; index += 1) {
    const result = await processNextDelivery();
    results.push(result);

    if (
      result.status === "gate_disabled" ||
      result.status === "idle" ||
      result.status === "failed"
    ) {
      break;
    }
  }

  return {
    attempted: results.length,
    sent: results.filter((result) => result.sent).length,
    results
  };
}

export async function runMoneyCycle(input: MoneyCycleInput = {}) {
  const startedAt = new Date();
  const offerLimit = Math.min(Math.max(input.offerLimit ?? 50, 1), 100);
  const hunterStrategyLimit = Math.min(
    Math.max(input.hunterStrategyLimit ?? 10, 1),
    50
  );
  const scoreLimit = Math.min(Math.max(input.scoreLimit ?? 100, 1), 500);
  const materializeLimit = Math.min(
    Math.max(input.materializeLimit ?? 10, 1),
    100
  );
  const deliveryLimit = Math.min(
    Math.max(input.deliveryLimit ?? 25, 0),
    100
  );
  const conversionDays = Math.min(
    Math.max(input.conversionDays ?? 7, 1),
    90
  );
  const learningDays = Math.min(
    Math.max(input.learningDays ?? 90, 7),
    365
  );
  const distributionLearningDays = Math.min(
    Math.max(input.distributionLearningDays ?? 90, 7),
    365
  );
  const niche = input.niche?.trim() || "general";
  const keyword = input.keyword?.trim() || null;

  const offers = keyword
    ? await runStep(() =>
        syncShopeeOffers(
          {
            keyword,
            page: 1,
            limit: offerLimit
          },
          {
            niche,
            strategyName: "manual-keyword"
          }
        )
      )
    : await runStep(() => runHunter({ strategyLimit: hunterStrategyLimit }));

  const conversions =
    input.syncConversions === false
      ? ({
          status: "ok",
          durationMs: 0,
          data: { skipped: true }
        } as const)
      : await runStep(() => {
          const purchaseTimeEnd = Math.floor(Date.now() / 1000);
          const purchaseTimeStart =
            purchaseTimeEnd - conversionDays * 86_400;

          return syncShopeeConversions(
            {
              purchaseTimeStart,
              purchaseTimeEnd,
              orderStatus: "ALL",
              limit: 50
            },
            20
          );
        });

  const learning = await runStep(() =>
    refreshLearningMetrics(learningDays)
  );

  const distributionLearning = await runStep(() =>
    refreshDistributionPerformance(distributionLearningDays)
  );

  const scoring = await runStep(() => scoreUnscoredOffers(scoreLimit));

  const materialization = await runStep(() =>
    materializePublishablePosts({
      limit: materializeLimit,
      niche
    })
  );

  const distribution = await runStep(() =>
    processDeliveries(deliveryLimit)
  );

  const analytics = await runStep(() => getMoneyAnalytics(30));

  const finishedAt = new Date();
  const result = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    input: {
      keyword,
      offerLimit,
      hunterStrategyLimit,
      scoreLimit,
      materializeLimit,
      deliveryLimit,
      conversionDays,
      learningDays,
      distributionLearningDays,
      syncConversions: input.syncConversions !== false,
      niche
    },
    steps: {
      offers,
      conversions,
      learning,
      distributionLearning,
      scoring,
      materialization,
      distribution,
      analytics
    }
  };

  await recordOperationalEvent({
    eventType: "money.cycle.completed",
    source: "money-cycle",
    payload: {
      durationMs: result.durationMs,
      steps: Object.fromEntries(
        Object.entries(result.steps).map(([name, step]) => [
          name,
          {
            status: step.status,
            durationMs: step.durationMs,
            ...("error" in step ? { error: step.error } : {})
          }
        ])
      )
    }
  }).catch(() => undefined);

  return result;
}
