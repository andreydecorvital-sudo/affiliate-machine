# Chat 10 — META ADS READ ANALYTICS

Branch: `feat/meta-ads-analytics`
Dependências: Acquisition + Analytics.

Escopo inicial SOMENTE READ:
- Meta Marketing API;
- campanhas/adsets/ads;
- spend;
- impressions;
- clicks;
- CPC/CPM/CTR;
- daily snapshots;
- ligação por UTM/campaign IDs;
- CAC por coorte;
- comparação CAC x LTV.

`META_ADS_WRITE_ENABLED=0` permanece desligado.
Não criar/editar campanha nesta fase.

DoD:
- sync idempotente;
- daily spend reconciliado;
- dashboard mostra CAC e LTV/CAC por campanha/nicho;
- Project Brain atualizado.
