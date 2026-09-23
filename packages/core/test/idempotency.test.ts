import assert from "node:assert/strict";
import test from "node:test";
import { createIdempotencyKey, isQueueName } from "../src/index.ts";

test("idempotency key is stable for the same input", () => {
  const a = createIdempotencyKey("delivery", ["post-1", "group-2", 1]);
  const b = createIdempotencyKey("delivery", ["post-1", "group-2", 1]);
  assert.equal(a, b);
});

test("idempotency key changes when the target changes", () => {
  const a = createIdempotencyKey("delivery", ["post-1", "group-2", 1]);
  const b = createIdempotencyKey("delivery", ["post-1", "group-3", 1]);
  assert.notEqual(a, b);
});

test("queue names are allow-listed", () => {
  assert.equal(isQueueName("post_distribution"), true);
  assert.equal(isQueueName("arbitrary_queue"), false);
});
