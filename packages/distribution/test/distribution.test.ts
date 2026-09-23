import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeterministicOfferMessage,
  createDeliveryIdempotencyKey,
  createTrackingTag,
  replaceOfferTrackingUrl,
  retryDelaySeconds
} from "../src/index.ts";

test("builds deterministic offer copy without AI", () => {
  const text = buildDeterministicOfferMessage({
    productName: "Air Fryer 5L",
    priceMin: 199.9,
    discountRate: 35,
    rating: 4.8,
    sales: 12000,
    shortUrl: "https://x.test/go/Ab12Cd34"
  });

  assert.match(text, /Air Fryer 5L/);
  assert.match(text, /35% de desconto/);
  assert.match(text, /Ab12Cd34/);
});

test("delivery idempotency key is stable", () => {
  assert.equal(
    createDeliveryIdempotencyKey("post-1", "group-1"),
    createDeliveryIdempotencyKey("post-1", "group-1")
  );
  assert.notEqual(
    createDeliveryIdempotencyKey("post-1", "group-1"),
    createDeliveryIdempotencyKey("post-1", "group-2")
  );
});

test("replaces only the offer tracking URL", () => {
  const original = "Produto\\n\\n👉 https://x.test/go/OLD123";
  assert.equal(
    replaceOfferTrackingUrl(original, "https://x.test/go/NEW456"),
    "Produto\\n\\n👉 https://x.test/go/NEW456"
  );
});

test("tracking tags are stable and compact", () => {
  assert.equal(
    createTrackingTag("g", "group-123"),
    createTrackingTag("g", "group-123")
  );
  assert.match(createTrackingTag("p", "post-123"), /^p_[a-f0-9]{10}$/);
});

test("retry delay backs off and caps", () => {
  assert.equal(retryDelaySeconds(1), 30);
  assert.equal(retryDelaySeconds(2), 60);
  assert.equal(retryDelaySeconds(20), 3600);
});
