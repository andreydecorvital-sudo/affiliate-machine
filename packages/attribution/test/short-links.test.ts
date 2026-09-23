import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyUserAgent,
  generateShortCode,
  safeReferrerHost
} from "../src/short-links.ts";

test("generates URL-safe short codes", () => {
  const code = generateShortCode(8);
  assert.equal(code.length, 8);
  assert.match(code, /^[A-Za-z0-9]+$/);
});

test("classifies bots and mobile user agents", () => {
  assert.equal(classifyUserAgent("facebookexternalhit/1.1"), "bot");
  assert.equal(classifyUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS)"), "mobile");
  assert.equal(classifyUserAgent("Mozilla/5.0 Chrome/120 Safari/537"), "desktop");
});

test("extracts only the referrer host", () => {
  assert.equal(
    safeReferrerHost("https://www.facebook.com/some/path?secret=1"),
    "www.facebook.com"
  );
  assert.equal(safeReferrerHost("not-a-url"), null);
});
