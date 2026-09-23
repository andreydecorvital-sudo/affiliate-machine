export const SCORE_ALGORITHM_VERSION = "money-score-v1.1.0";

export type OpportunitySignals = {
  commissionRate?: number | null;
  discountRate?: number | null;
  sales?: number | null;
  rating?: number | null;
  price?: number | null;
  priceMin?: number | null;
  historicalCtr?: number | null;
  historicalCvr?: number | null;
  revenuePerClick?: number | null;
  historicalSampleConfidence?: number | null;
  daysSinceFirstSeen?: number | null;
  recentPublicationCount?: number | null;
};

export type ScoreFactorName =
  | "commission_yield"
  | "discount_strength"
  | "demand"
  | "social_proof"
  | "impulse_price"
  | "freshness"
  | "historical_ctr"
  | "historical_cvr"
  | "revenue_per_click"
  | "saturation_penalty";

export type ScoreFactor = {
  name: ScoreFactorName;
  available: boolean;
  raw: number | null;
  normalized: number | null;
  weight: number;
  evidenceConfidence: number;
  contribution: number;
  explanation: string;
};

export type OpportunityDecision = "REJECT" | "REVIEW" | "PUBLISH";

export type OpportunityScore = {
  algorithmVersion: typeof SCORE_ALGORITHM_VERSION;
  score: number;
  confidence: number;
  decision: OpportunityDecision;
  factors: ScoreFactor[];
  thresholds: {
    review: number;
    publish: number;
    minimumConfidence: number;
  };
};

export type ScoreOptions = {
  reviewThreshold?: number;
  publishThreshold?: number;
  minimumConfidence?: number;
};

const WEIGHTS: Record<Exclude<ScoreFactorName, "saturation_penalty">, number> = {
  commission_yield: 0.22,
  discount_strength: 0.17,
  demand: 0.14,
  social_proof: 0.09,
  impulse_price: 0.09,
  freshness: 0.06,
  historical_ctr: 0,
  historical_cvr: 0.11,
  revenue_per_click: 0.12
};

const SATURATION_MAX_PENALTY = 15;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function percent(value: number): number {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function ratio(value: number): number {
  return Math.abs(value) > 1 ? value / 100 : value;
}

function factor(
  name: Exclude<ScoreFactorName, "saturation_penalty">,
  raw: number | null,
  normalized: number | null,
  explanation: string,
  evidenceConfidence = 1
): ScoreFactor {
  return {
    name,
    available: raw !== null && normalized !== null,
    raw,
    normalized,
    weight: WEIGHTS[name],
    evidenceConfidence: clamp(evidenceConfidence),
    contribution: 0,
    explanation
  };
}

function impulsePriceScore(price: number): number {
  if (price <= 50) return 1;
  if (price <= 100) return 0.92;
  if (price <= 200) return 0.78;
  if (price <= 400) return 0.58;
  if (price <= 800) return 0.36;
  return 0.18;
}

export function scoreOpportunity(
  signals: OpportunitySignals,
  options: ScoreOptions = {}
): OpportunityScore {
  const commission = finite(signals.commissionRate);
  const discount = finite(signals.discountRate);
  const sales = finite(signals.sales);
  const rating = finite(signals.rating);
  const price = finite(signals.priceMin) ?? finite(signals.price);
  const ctr = finite(signals.historicalCtr);
  const cvr = finite(signals.historicalCvr);
  const rpc = finite(signals.revenuePerClick);
  const days = finite(signals.daysSinceFirstSeen);
  const historicalConfidence = clamp(
    finite(signals.historicalSampleConfidence) ?? 0
  );

  const factors: ScoreFactor[] = [
    factor(
      "commission_yield",
      commission,
      commission === null ? null : clamp(percent(commission) / 20),
      commission === null
        ? "Comissão indisponível."
        : `Comissão efetiva aproximada de ${percent(commission).toFixed(2)}%.`
    ),
    factor(
      "discount_strength",
      discount,
      discount === null ? null : clamp(percent(discount) / 50),
      discount === null
        ? "Desconto indisponível."
        : `Desconto informado de ${percent(discount).toFixed(1)}%.`
    ),
    factor(
      "demand",
      sales,
      sales === null ? null : clamp(Math.log10(Math.max(0, sales) + 1) / 5),
      sales === null ? "Vendas indisponíveis." : `${Math.trunc(sales)} vendas observadas.`
    ),
    factor(
      "social_proof",
      rating,
      rating === null ? null : clamp((rating - 3.5) / 1.5),
      rating === null ? "Avaliação indisponível." : `Avaliação ${rating.toFixed(2)}/5.`
    ),
    factor(
      "impulse_price",
      price,
      price === null ? null : impulsePriceScore(price),
      price === null ? "Preço indisponível." : `Ticket observado de R$ ${price.toFixed(2)}.`
    ),
    factor(
      "freshness",
      days,
      days === null ? null : clamp(1 - days / 45),
      days === null ? "Recência histórica ainda indisponível." : `Oferta observada há ${days.toFixed(1)} dias.`
    ),
    factor(
      "historical_ctr",
      ctr,
      ctr === null ? null : clamp(ratio(ctr) / 0.10),
      ctr === null
        ? "CTR real indisponível sem dado de impressão/leitura."
        : `CTR histórico de ${(ratio(ctr) * 100).toFixed(2)}%.`,
      historicalConfidence
    ),
    factor(
      "historical_cvr",
      cvr,
      cvr === null ? null : clamp(ratio(cvr) / 0.05),
      cvr === null
        ? "CVR histórico ainda indisponível."
        : `CVR histórico suavizado de ${(ratio(cvr) * 100).toFixed(2)}% com ${(
            historicalConfidence * 100
          ).toFixed(0)}% de confiança de amostra.`,
      historicalConfidence
    ),
    factor(
      "revenue_per_click",
      rpc,
      rpc === null ? null : clamp(rpc / 1),
      rpc === null
        ? "Receita por clique ainda indisponível."
        : `RPC histórico suavizado de R$ ${rpc.toFixed(3)} com ${(
            historicalConfidence * 100
          ).toFixed(0)}% de confiança de amostra.`,
      historicalConfidence
    )
  ];

  const available = factors.filter(
    (item) =>
      item.available &&
      item.normalized !== null &&
      item.weight > 0 &&
      item.evidenceConfidence > 0
  );
  const availableWeight = available.reduce(
    (sum, item) => sum + item.weight * item.evidenceConfidence,
    0
  );
  const totalWeight = Object.values(WEIGHTS).reduce(
    (sum, value) => sum + value,
    0
  );

  let positiveScore = 0;
  if (availableWeight > 0) {
    for (const item of available) {
      const effectiveWeight = item.weight * item.evidenceConfidence;
      item.contribution =
        ((item.normalized ?? 0) * effectiveWeight / availableWeight) * 100;
      positiveScore += item.contribution;
    }
  }

  const recentPublications = Math.max(
    0,
    Math.trunc(finite(signals.recentPublicationCount) ?? 0)
  );
  const saturationNormalized = clamp(recentPublications / 5);
  const saturationContribution =
    -(saturationNormalized * SATURATION_MAX_PENALTY);

  factors.push({
    name: "saturation_penalty",
    available: true,
    raw: recentPublications,
    normalized: saturationNormalized,
    weight: SATURATION_MAX_PENALTY / 100,
    evidenceConfidence: 1,
    contribution: saturationContribution,
    explanation:
      recentPublications === 0
        ? "Sem repetição recente conhecida."
        : `${recentPublications} publicação(ões) recentes reduziram a prioridade.`
  });

  const score =
    clamp((positiveScore + saturationContribution) / 100) * 100;
  const confidence =
    totalWeight === 0 ? 0 : clamp(availableWeight / totalWeight);

  const thresholds = {
    review: options.reviewThreshold ?? 70,
    publish: options.publishThreshold ?? 85,
    minimumConfidence: options.minimumConfidence ?? 0.50
  };

  let decision: OpportunityDecision = "REJECT";
  if (confidence >= thresholds.minimumConfidence) {
    if (score >= thresholds.publish) decision = "PUBLISH";
    else if (score >= thresholds.review) decision = "REVIEW";
  }

  return {
    algorithmVersion: SCORE_ALGORITHM_VERSION,
    score: Number(score.toFixed(2)),
    confidence: Number(confidence.toFixed(4)),
    decision,
    factors,
    thresholds
  };
}
