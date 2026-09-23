# Chat 6 — SHORTLINK / CLICK / CONVERSION / COMMISSION

Branch: `feat/attribution-engine`
Dependências: Foundation + Shopee Affiliate.

Escopo:
- short_links;
- redirect 302;
- click_events append-only;
- ligação a post/group/creative/campaign;
- provider sub IDs;
- conversion reconciliation;
- commission ledger;
- estados pending/approved/rejected/paid.

Privacidade:
- não armazenar PII desnecessária;
- device/referrer somente no nível necessário para analytics;
- IP bruto não deve virar dependência do produto.

DoD:
- shortlink redireciona corretamente;
- clique fica associado a post/grupo;
- conversionReport reconcilia de forma idempotente;
- comissão não duplica em resync;
- dashboard API consegue calcular EPC/CVR/comissão;
- Project Brain atualizado.
