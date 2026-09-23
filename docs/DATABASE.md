# Banco de dados — modelo lógico inicial

## Core

### affiliate_provider_accounts
Credenciais e identidade de cada provider. Segredos nunca em plaintext na tabela pública.

### affiliate_products
Identidade canônica de produto externo por provider.

### offer_snapshots
Série temporal append-only de preço, desconto, vendas, avaliação, comissão, disponibilidade e metadata.

### offer_scores
Score versionado + breakdown por fator.

### affiliate_links
URL final do provider + tracking/sub IDs + validade.

## Creative

### creative_templates
Templates textuais/visuais.

### creative_variants
Copy/imagem/variante ligada a produto e experimento.

## Distribution

### whatsapp_accounts
Sessões lógicas, status, provider e health.

### whatsapp_groups
JID, nome, nicho, capacidade observada, accepting_traffic, saúde.

### group_routes
Ordem/estratégia de overflow por nicho.

### posts
Publicação lógica: produto + oferta + copy + link + schedule.

### post_deliveries
Uma linha por post × grupo, com estado idempotente.

## Attribution

### short_links
Código, destino, post, group, creative, campaign metadata.

### click_events
Append-only. Timestamp, shortlink, group, post, coarse device/referrer quando permitido.

### conversions
Conversão importada do provider.

### conversion_items
Itens por conversão/pedido.

### commission_ledger
Pendente, aprovada, rejeitada, paga; valor e provider source.

## Acquisition

### traffic_campaigns
Campanha/adset/ad e origem.

### traffic_spend_daily
Spend/impressions/clicks por data.

### traffic_cohorts
Coorte de aquisição por campanha/nicho/janela.

### group_join_events
Clique/redirect para convite e capacidade no momento.

## Intelligence

### experiments
Hipótese, variantes, métricas e janela.

### experiment_outcomes
Resultado observado.

### universal_events
Timeline auditável de fatos relevantes.

## Ops

### app_settings
Configuração versionada.

### audit_log
Ações humanas/sistema.

### health_snapshots
Saúde dos runtimes/providers.

## Regras

- Snapshot não é sobrescrito quando representa histórico.
- Conversão e comissão usam IDs externos + unique constraint.
- `post_deliveries` usa idempotency key única por publicação/destino/versão.
- Nunca usar booleano `published` como única verdade operacional.
