# Arquitetura

## Decisão vigente

A infraestrutura operacional da Affiliate Machine fica concentrada em **Vercel + Supabase**.

- Vercel: Next.js, APIs, shortlinks, landing, processamento Node, Sharp, integrações e frontend.
- Supabase: Postgres, Auth, Storage, Queues, Cron, Realtime e estado operacional.
- Gemini API: provider principal de IA. A indisponibilidade do Gemini nunca pode parar o core determinístico.

## Fluxo principal

```text
Affiliate Providers
        ↓
   Vercel API
        ↓
Supabase Postgres
        ↓
Offer Snapshot
        ↓
Deterministic Score
        ↓
Supabase Queue
        ↓
Vercel processor
        ↓
Distribution / Tracking
```

## Background jobs

Supabase Queues usa `pgmq`. Não usamos pg-boss, Redis, Kafka ou RabbitMQ no MVP.

Filas:
- offer_hunting
- offer_revalidation
- creative_generation
- post_distribution
- conversion_sync
- analytics_rollup

Supabase Cron agenda produtores/consumidores. Jobs continuam idempotentes porque visibility timeout não substitui idempotência de efeitos externos.

## Gemini

Gemini é a exceção aprovada entre APIs de IA gratuitas.

Usar para copy, classificação semântica, visão, enriquecimento e variantes.

Não usar para cálculo financeiro, dedupe, idempotência, autorização ou decisão irreversível sem gate.

Se Gemini falhar, templates e regras determinísticas mantêm o sistema operacional.

## Segurança

- RLS em toda tabela pública criada pelo projeto.
- Nenhum secret em `NEXT_PUBLIC_*`.
- service role/secret key somente server-side.
- SECURITY DEFINER com search_path vazio, grants explícitos e revogação de PUBLIC.
- gates reais permanecem OFF por padrão.
