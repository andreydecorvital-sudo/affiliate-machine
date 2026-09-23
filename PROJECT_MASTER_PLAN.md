# Affiliate Machine — Project Master Plan

## 1. Visão

Construir uma operação pessoal de afiliados orientada a dados, em que tráfego alimenta grupos segmentados de WhatsApp e um motor central encontra, avalia, prepara, agenda e distribui ofertas automaticamente.

A unidade econômica é o norte:

```text
CAC por membro
→ CTR
→ conversão
→ comissão por membro
→ receita 7d/30d/90d
→ LTV/CAC
```

## 2. Infraestrutura decidida

A infraestrutura canônica é:

- **Vercel**: Next.js, APIs, shortlinks, landing, processamento Node, frontend.
- **Supabase**: PostgreSQL, Auth, Storage, Queues/pgmq, Cron/pg_cron, Realtime.
- **Gemini API**: IA principal e única exceção aprovada entre free tiers de IA. O core deve degradar para regras/templates quando Gemini estiver indisponível.

Não usar no MVP:
- Redis;
- Kafka;
- RabbitMQ;
- pg-boss;
- VPS/worker server dedicado;
- banco paralelo;
- provider de IA alternativo apenas por ter tokens grátis.

## 3. Escopo do MVP

- Shopee Affiliate Open API.
- Hunter de ofertas.
- Histórico de preço/oferta.
- Score 0–100 explicável.
- Link afiliado com tracking/sub IDs quando disponível.
- Criativo textual e imagem simples.
- Nichos iniciais: Achadinhos/Geral, Casa, Tecnologia.
- Multi-grupo WhatsApp.
- Teto configurável de aproximadamente 35 produtos/dia.
- Shortlink próprio e click events.
- Conversion report/comissão.
- Dashboard financeiro/operacional.
- Landing/group router.
- UTM/campanha/coorte.

## 4. Bounded contexts

### Platform
Auth, config, secrets, Supabase Queues/Cron, health, audit e feature flags.

### Affiliate Commerce
Providers, produtos, ofertas, links, conversões e comissão.

### Intelligence
Snapshots, score, regras, histórico, Gemini enrichment, experimentos.

### Creative
Templates, copy, imagem, variantes e performance.

### Distribution
Contas WhatsApp, grupos, posts, deliveries e scheduler.

### Acquisition
Landing, group router, UTM, campanhas, spend e cohorts.

### Analytics
Cliques, conversões, comissão, CAC, LTV e ROI.

### Surfaces
Frontend Zero operacional, Platform Admin e páginas públicas.

## 5. Fontes canônicas

- Produto/oferta: provider snapshot.
- Score: `offer_scores`.
- Publicação: `posts`.
- Entrega: `post_deliveries`.
- Clique: `click_events`.
- Conversão: `conversions`.
- Comissão: `commission_ledger`.
- Grupo: `whatsapp_groups`.
- Sessão: `whatsapp_accounts`.
- Tráfego: `traffic_campaigns` / `traffic_cohorts`.
- Estado de job: Supabase Queues + audit/event timeline.

## 6. Regras operacionais

- Até ~35 produtos/dia como teto inicial.
- Até 3 oportunidades/hora apenas quando houver qualidade.
- Score mínimo inicial sugerido: 85/100.
- Cooldown padrão 7 dias, com exceção por evento material.
- Revalidar dados comerciais imediatamente antes do envio.
- Fail closed em erro de provider.
- Kill switch global e por domínio.
- Delivery possui chave idempotente própria.
- Gemini nunca é requisito para envio de template determinístico já validado.

## 7. Score v1

Fatores:
- commission_yield
- discount_strength
- demand
- social_proof
- impulse_price
- stock_health
- freshness
- historical_ctr
- historical_cvr
- revenue_per_click
- saturation_penalty

O score é matemático, explicável e versionado. Gemini pode enriquecer classificação/copy, não substituir a verdade financeira.

## 8. Distribuição

```text
Post lógico
  ↓
Distribution Batch
  ↓
N deliveries independentes
```

Cada delivery registra destino, tentativa, message_id, estados observáveis, erro, retry e idempotency_key.

## 9. Aquisição

O anúncio aponta para URL própria:

```text
/g/casa
  ↓
captura UTM/coorte
  ↓
resolve grupo com capacidade
  ↓
redirect para convite WhatsApp
```

## 10. Métrica principal

> Para cada R$1 investido em aquisição, quanto de comissão retorna ao longo do tempo?

KPIs:
- CAC/membro
- comissão/membro 7d/30d/90d
- LTV/CAC
- CTR
- CVR
- EPC
- retenção de grupo
- comissão pendente/confirmada
- ROI por campanha/coorte

## 11. Fases

### Fase 0 — Foundation
Next.js, Supabase, Auth/config, Queues, Cron, audit, events, idempotência, health, gates, Gemini adapter.

### Fase 1 — Shopee Affiliate Core
Offers, normalization, snapshots, links e conversion report.

### Fase 2 — Intelligence
Score, cooldown, revalidation, history e opportunity queue.

### Fase 3 — WhatsApp Distribution
Adapter, sessões, grupos, mídia, delivery state, retries e gates.

### Fase 4 — Attribution
Shortlinks, clicks, sub IDs, conversions e commission ledger.

### Fase 5 — Acquisition
Landing, UTM, group router, cohorts e overflow.

### Fase 6 — Frontend Zero
Dashboard, hunter, creatives, grupos, publicações, analytics e settings.

### Fase 7 — Platform Admin
Health, sessions, queues, providers, logs, gates e Project Brain.

### Fase 8 — Meta Ads
Read analytics e CAC/LTV.

### Fase 9 — Learning
Experiments e ajustes adaptativos com evidência.

### Fase 10 — Expansion
TikTok, Amazon, vídeo e mais nichos.

## 12. Release

Main sempre deployável. Uma frente por branch. Dry-run antes de canário. Release Gate antes de autopilot.
