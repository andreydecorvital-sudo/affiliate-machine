import assert from "node:assert/strict";
import test from "node:test";
import { parseGate } from "@affiliate/core";

test("feature gates default to false", () => {
  assert.equal(parseGate(undefined), false);
  assert.equal(parseGate("0"), false);
});

test("feature gates only enable on explicit 1", () => {
  assert.equal(parseGate("1"), true);
  assert.equal(parseGate("true"), false);
});
