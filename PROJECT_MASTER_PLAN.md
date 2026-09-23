# Affiliate Machine — Project Master Plan

## 1. Visão

Construir uma operação pessoal de afiliados orientada a dados, em que tráfego alimenta grupos segmentados de WhatsApp e um motor central encontra, avalia, prepara, agenda e distribui ofertas automaticamente.

O sistema deve provar a unidade econômica antes de escalar:

```text
CAC por membro
→ CTR das ofertas
→ conversão
→ comissão por membro
→ receita 7d/30d/90d
→ LTV/CAC
```

## 2. Escopo inicial

### MVP

- Shopee Affiliate Open API.
- Hunter de ofertas.
- Histórico de preço/oferta.
- Score 0–100 explicável.
- Geração de link afiliado com tracking/sub IDs quando disponível.
- Criativo textual e imagem simples.
- 3 nichos iniciais: Geral/Achadinhos, Casa, Tecnologia.
- Multi-grupo WhatsApp.
- Até ~35 produtos/dia no total por vertical, como teto configurável.
- Shortlink próprio + eventos de clique.
- Importação de conversion report/comissão.
- Dashboard financeiro e operacional.
- Landing/group router para tráfego.
- UTM/campanha/coorte.

### Depois do MVP

- TikTok Shop Affiliate.
- Amazon Associates.
- Mais nichos e contas/sessões WhatsApp.
- Meta Ads read integration e otimização assistida.
- A/B de criativos.
- Vídeo automático.
- Recomendador conversacional.
- Autopilot adaptativo.

## 3. O que NÃO entra no MVP

- ERP.
- Fiscal/NF-e.
- Estoque físico/WMS.
- Multi-tenant complexo.
- Billing SaaS real.
- Redis/Kafka/RabbitMQ.
- Scraping como fonte primária se existir API oficial.
- Publicação irrestrita sem gates de segurança.

## 4. Bounded contexts

### Platform
Auth, configuração, secrets, jobs, health, audit, feature flags.

### Affiliate Commerce
Providers, produtos, ofertas, comissão, conversões e links.

### Intelligence
Snapshots, score, regras, histórico, experimentos, aprendizado.

### Creative
Templates, copy, imagem, variantes e performance de criativo.

### Distribution
Contas WhatsApp, grupos, posts, deliveries, scheduler e health.

### Acquisition
Landing, group router, UTM, campanhas, spend e cohorts.

### Analytics
Cliques, conversões, comissão, CAC, LTV, ROI e dashboards.

### Admin
Saúde global, providers, sessões, filas, falhas e configuração.

### SaaS Surface
Experiência operacional principal: Hunter, Conteúdo, Grupos, Publicações, Analytics, Configurações.

## 5. Fonte canônica por domínio

- Produto/oferta: provider snapshot persistido.
- Score: `offer_scores` versionado.
- Publicação: `posts`.
- Entrega física: `post_deliveries`.
- Clique: `click_events`.
- Conversão: `conversions`.
- Comissão: `commission_ledger`.
- Grupo: `whatsapp_groups`.
- Sessão WhatsApp: `whatsapp_accounts` + runtime worker.
- Tráfego: `traffic_campaigns` + `traffic_cohorts`.
- Estado de job: pg-boss + audit trail.

## 6. Regras operacionais iniciais

- Teto inicial: aproximadamente 35 produtos/dia por estratégia global; configuração por nicho.
- Até 3 oportunidades/hora quando houver qualidade suficiente.
- Score mínimo inicial sugerido: 85/100.
- Não repetir produto em cooldown padrão de 7 dias, exceto evento material: nova queda de preço, novo cupom, aumento de comissão ou nova campanha.
- Antes de enviar: revalidar preço, estoque/disponibilidade, comissão, cupom e URL.
- Fail closed: erro no provider impede publicação daquele item.
- Kill switch global e por provider/nicho/conta/grupo.
- Entregas possuem chave idempotente própria.

## 7. Score v1

Fatores iniciais, normalizados 0–100:

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

O score deve mostrar breakdown e versão do algoritmo.

## 8. Distribuição

Modelo:

```text
Post lógico
  ↓
Distribution Batch
  ↓
N deliveries independentes
```

Cada delivery deve registrar:

- conta/sessão
- grupo
- tentativa
- message_id
- accepted_at
- delivered/read quando disponível
- erro
- retry
- idempotency_key

## 9. Aquisição e grupos de overflow

O anúncio aponta para URL própria, nunca diretamente para um grupo específico.

```text
/g/casa
  ↓
resolve grupo ativo com capacidade
  ↓
registra UTM/coorte
  ↓
redirect para convite WhatsApp
```

O router troca automaticamente para o próximo grupo conforme limite de capacidade configurado.

## 10. Métrica principal

O projeto existe para responder com precisão:

> Para cada R$1 investido em aquisição, quanto de comissão retorna ao longo do tempo?

KPIs:

- CAC/membro
- comissão/membro 7d, 30d, 90d
- LTV/CAC
- CTR por post/grupo/nicho
- CVR por produto/post/grupo
- EPC / receita por clique
- retenção do grupo
- comissão confirmada vs pendente
- ROI por coorte e campanha

## 11. Fases

### Fase 0 — Foundation
Monorepo, banco, auth, config, audit, events, pg-boss, health, design system.

### Fase 1 — Shopee Affiliate Core
Offer API, productOfferV2, normalization, snapshots, affiliate links, conversion report.

### Fase 2 — Intelligence
Score v1, regras, cooldown, revalidation, history, opportunity queue.

### Fase 3 — WhatsApp Distribution
Baileys multi-session, groups, media, delivery state, retries, kill switches.

### Fase 4 — Attribution
Shortlinks, click events, sub IDs, conversion reconciliation, commission ledger.

### Fase 5 — Acquisition
Landing, UTM, group router, cohorts, capacity/overflow.

### Fase 6 — Frontend Zero
Seller/operator surface: dashboard, hunter, creatives, groups, publications, analytics, settings.

### Fase 7 — Platform Admin
Health, sessions, jobs, providers, logs, feature flags, incidents, project brain.

### Fase 8 — Meta Ads
Read spend/campaign data, CAC/LTV comparison, recommendations.

### Fase 9 — Learning
Experiments, adaptive score weights, best time/product/category/creative.

### Fase 10 — Expansion
TikTok, Amazon, video, more niches/accounts.

## 12. Release philosophy

- Main deve estar sempre deployável.
- Uma frente por branch.
- PR pequeno e verificável.
- Sem merge automático de feature incompleta.
- Dry-run e shadow mode antes de autonomia.
- Release Gate antes de ligar autopilot real.

## 13. Critério para escalar

Não escalar quantidade de grupos/contas porque “parece funcionar”. Escalar somente quando houver coortes com dados suficientes demonstrando que LTV/CAC é saudável e que a distribuição mantém qualidade/entrega.
