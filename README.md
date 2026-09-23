# Affiliate Machine

Sistema pessoal, independente da Argoplace, para construir e operar uma máquina de aquisição + distribuição + monetização de ofertas afiliadas em grupos de WhatsApp.

## Objetivo

Transformar tráfego pago e orgânico em audiência própria de grupos segmentados e monetizar essa audiência com ofertas afiliadas selecionadas automaticamente.

```text
Affiliate Providers
      ↓
Offer Hunter
      ↓
Snapshots + Score
      ↓
Affiliate Link + Attribution IDs
      ↓
Creative Engine
      ↓
Supabase Queues + Cron
      ↓
Vercel Processing
      ↓
WhatsApp Distribution
      ↓
Clicks → Orders → Commission
      ↓
Cohort / CAC / LTV / Learning
      ↺
```

## Infraestrutura canônica

**Vercel + Supabase + Gemini API.**

- Vercel: Next.js, APIs, landing, shortlinks, processamento Node e frontend.
- Supabase: PostgreSQL, Auth, Storage, Queues, Cron, Realtime e estado operacional.
- Gemini: IA principal para conteúdo/classificação/visão, com degradação determinística se indisponível.

Não usamos Redis, Kafka, RabbitMQ, pg-boss, VPS ou worker server dedicado no MVP.

## Princípios

1. Um único cérebro de ofertas e um único estado canônico de publicação.
2. `post` lógico é diferente de `delivery` por grupo.
3. Toda mutação externa deve ser idempotente, auditável e recuperável.
4. Revalidar preço, estoque, comissão e link antes da publicação.
5. Cota é teto, nunca obrigação.
6. Medir `CAC → clique → venda → comissão → LTV` desde o MVP.
7. Gemini ajuda, mas não decide autorização, dinheiro ou idempotência.
8. O frontend operacional e o Platform Admin seguem a disciplina do Frontend Zero.
9. Segurança e kill switches nascem antes do autopilot.

## Monorepo

```text
apps/
  web/                 Next.js: dashboard, admin, APIs e páginas públicas
packages/
  core/                contratos, filas, idempotência e regras compartilhadas
  db/                  futuro: tipos/repositories compartilhados
  providers/           futuro: Shopee/Meta/WhatsApp adapters
  ui/                  futuro: design system
supabase/
  migrations/          schema, pgmq e pg_cron
docs/
prompts/
.project-brain/
```

## Estado

Fase 0 em construção na branch `feat/foundation-platform`. Nenhuma automação real está habilitada.
