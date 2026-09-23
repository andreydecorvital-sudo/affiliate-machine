import assert from "node:assert/strict";
import test from "node:test";
import { applyMessageVariant } from "../src/index.ts";

test("changes headline and CTA without changing tracking URL", () => {
  const base = [
    "🔥 OFERTA BOA AGORA",
    "",
    "Air Fryer",
    "",
    "👉 https://x.test/go/Ab12"
  ].join("\n");

  const result = applyMessageVariant(base, {
    headline: "⚡ ACHADO DO DIA",
    ctaLabel: "Ver oferta"
  });

  assert.match(result, /^⚡ ACHADO DO DIA/);
  assert.match(result, /Ver oferta: https:\/\/x\.test\/go\/Ab12/);
});

test("sanitizes multiline variant text", () => {
  const result = applyMessageVariant(
    "Título\n\n👉 https://x.test/go/A",
    { headline: "Linha 1\nLinha 2" }
  );

  assert.match(result, /^Linha 1 Linha 2/);
});
