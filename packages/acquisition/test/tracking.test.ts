import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCampaignKey,
  normalizeNiche,
  normalizeUtm
} from "../src/index.ts";

test("normalizes niche into stable route key", () => {
  assert.equal(normalizeNiche(" Casa & Cozinha "), "casa-cozinha");
  assert.equal(normalizeNiche(""), "general");
});

test("normalizes UTM values without inventing data", () => {
  assert.equal(normalizeUtm(" meta_ads "), "meta_ads");
  assert.equal(normalizeUtm(""), null);
});

test("builds deterministic campaign key", () => {
  assert.equal(
    buildCampaignKey({
      source: "instagram",
      medium: "paid_social",
      campaign: "casa-01"
    }),
    "instagram|paid_social|casa-01"
  );
});
