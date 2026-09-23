import assert from "node:assert/strict";
import test from "node:test";
import { scoreOpportunity } from "../src/score.ts";

test("publishes an exceptional high-margin high-demand offer", () => {
  const result = scoreOpportunity({
    commissionRate: 0.20,
    discountRate: 55,
    sales: 60000,
    rating: 4.9,
    priceMin: 49.9,
    daysSinceFirstSeen: 1
  });

  assert.equal(result.decision, "PUBLISH");
  assert.ok(result.score >= 85);
  assert.ok(result.confidence >= 0.5);
});

test("rejects weak offers even when data exists", () => {
  const result = scoreOpportunity({
    commissionRate: 0.03,
    discountRate: 5,
    sales: 30,
    rating: 4.0,
    priceMin: 850,
    daysSinceFirstSeen: 20
  });

  assert.equal(result.decision, "REJECT");
  assert.ok(result.score < 70);
});

test("penalizes repeated publications", () => {
  const base = {
    commissionRate: 0.18,
    discountRate: 45,
    sales: 25000,
    rating: 4.8,
    priceMin: 89,
    daysSinceFirstSeen: 2
  };

  const clean = scoreOpportunity({ ...base, recentPublicationCount: 0 });
  const saturated = scoreOpportunity({ ...base, recentPublicationCount: 5 });

  assert.ok(saturated.score < clean.score);
  assert.equal(
    saturated.factors.find((factor) => factor.name === "saturation_penalty")?.contribution,
    -15
  );
});

test("does not invent missing historical performance", () => {
  const result = scoreOpportunity({
    commissionRate: 0.15,
    discountRate: 40,
    sales: 10000,
    rating: 4.7,
    priceMin: 120
  });

  const ctr = result.factors.find((factor) => factor.name === "historical_ctr");
  assert.equal(ctr?.available, false);
  assert.equal(ctr?.contribution, 0);
});
