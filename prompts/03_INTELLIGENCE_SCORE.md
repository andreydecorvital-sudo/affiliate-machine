# Chat 3 — OFFER INTELLIGENCE / SCORE

Branch: `feat/offer-intelligence`
Dependência: Foundation + provider de ofertas.

Escopo:
- offer snapshots históricos;
- score v1 0–100;
- breakdown por fator;
- versionamento do algoritmo;
- cooldown/republication rules;
- revalidation contract;
- opportunity queue;
- explainability.

Fatores mínimos:
commission_yield, discount_strength, demand, social_proof, impulse_price, stock_health, freshness, historical_ctr, historical_cvr, revenue_per_click, saturation_penalty.

No início, fatores históricos sem dados devem ser neutros/baixa confiança; não invente performance.

Regra crítica:
Cota é teto. Score abaixo do mínimo não é publicado só para completar volume.

DoD:
- função determinística e testável;
- breakdown visível;
- regra de cooldown 7d com exceção por evento material;
- revalidation antes de estado READY_TO_PUBLISH;
- Project Brain atualizado.
