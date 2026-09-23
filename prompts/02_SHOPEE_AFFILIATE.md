# Chat 2 — SHOPEE AFFILIATE CORE

Branch: `feat/shopee-affiliate-core`
Dependência: Foundation integrada.

Escopo EXCLUSIVO:
- provider Shopee Affiliate;
- autenticação/assinatura GraphQL;
- productOfferV2;
- normalização de produto/oferta;
- paginação;
- affiliate/short link oficial quando disponível;
- conversionReport;
- tracking/sub IDs quando suportado;
- fixtures e contract tests.

Referências estudadas:
- thallyson03/Shoppe
- bestpromo/shopee-afiliates-sdk

Não copiar arquitetura inteira desses repositórios. Extrair apenas contratos úteis.

Regras:
- API oficial como fonte primária;
- timeout/retry somente onde seguro;
- secrets nunca em logs;
- nenhuma publicação WhatsApp;
- não inventar campos que a API não forneceu.

DoD:
- buscar oferta real/fixture validada;
- persistir produto + snapshot;
- gerar link afiliado;
- importar conversões de forma idempotente;
- testes para assinatura, paginação e normalização;
- Project Brain atualizado.
