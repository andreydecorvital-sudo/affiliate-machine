import {
  SCORE_ALGORITHM_VERSION,
  scoreOpportunity,
  type OpportunityDecision
} from "@affiliate/intelligence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/events";

type Candidate = {
  offer_snapshot_id: number;
  product_id: string;
  external_item_id: string;
  price: number | string | null;
  price_min: number | string | null;
  discount_rate: number | string | null;
  sales: number | string | null;
  rating: number | string | null;
  commission_rate: number | string | null;
  first_seen_at: string;
  captured_at: string;
  recent_publication_count: number | string | null;
  historical_cvr: number | string | null;
  revenue_per_click: number | string | null;
  learning_confidence: number | string | null;
};

function toNumber(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysBetween(start: string, end: string): number | null {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, (b - a) / 86_400_000);
}

export async function scoreUnscoredOffers(limit = 100) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_unscored_offer_candidates", {
    p_algorithm_version: SCORE_ALGORITHM_VERSION,
    p_limit: Math.min(Math.max(limit, 1), 500)
  });

  if (error) throw error;

  const candidates = (data ?? []) as Candidate[];
  const counts: Record<OpportunityDecision, number> = {
    REJECT: 0,
    REVIEW: 0,
    PUBLISH: 0
  };

  const scored: Array<{
    offerSnapshotId: number;
    externalItemId: string;
    score: number;
    confidence: number;
    decision: OpportunityDecision;
    learningConfidence: number;
  }> = [];

  for (const candidate of candidates) {
    const learningConfidence =
      toNumber(candidate.learning_confidence) ?? 0;

    const result = scoreOpportunity({
      commissionRate: toNumber(candidate.commission_rate),
      discountRate: toNumber(candidate.discount_rate),
      sales: toNumber(candidate.sales),
      rating: toNumber(candidate.rating),
      price: toNumber(candidate.price),
      priceMin: toNumber(candidate.price_min),
      historicalCvr: toNumber(candidate.historical_cvr),
      revenuePerClick: toNumber(candidate.revenue_per_click),
      historicalSampleConfidence: learningConfidence,
      daysSinceFirstSeen: daysBetween(
        candidate.first_seen_at,
        candidate.captured_at
      ),
      recentPublicationCount:
        toNumber(candidate.recent_publication_count) ?? 0
    });

    const { data: scoreId, error: persistError } = await supabase.rpc(
      "persist_offer_score",
      {
        p_offer_snapshot_id: candidate.offer_snapshot_id,
        p_algorithm_version: result.algorithmVersion,
        p_score: result.score,
        p_confidence: result.confidence,
        p_decision: result.decision,
        p_factors: result.factors,
        p_thresholds: result.thresholds
      }
    );

    if (persistError) throw persistError;

    counts[result.decision] += 1;
    scored.push({
      offerSnapshotId: candidate.offer_snapshot_id,
      externalItemId: candidate.external_item_id,
      score: result.score,
      confidence: result.confidence,
      decision: result.decision,
      learningConfidence
    });

    await recordOperationalEvent({
      eventType:
        result.decision === "PUBLISH"
          ? "offer.opportunity_ready"
          : "offer.scored",
      source: "money-score",
      entityType: "offer_score",
      entityId: String(scoreId),
      idempotencyKey: `score:${candidate.offer_snapshot_id}:${result.algorithmVersion}`,
      payload: {
        externalItemId: candidate.external_item_id,
        score: result.score,
        confidence: result.confidence,
        decision: result.decision,
        algorithmVersion: result.algorithmVersion,
        learning: {
          cvr: toNumber(candidate.historical_cvr),
          rpc: toNumber(candidate.revenue_per_click),
          sampleConfidence: learningConfidence
        }
      }
    });
  }

  return {
    algorithmVersion: SCORE_ALGORITHM_VERSION,
    processed: scored.length,
    counts,
    scored
  };
}
