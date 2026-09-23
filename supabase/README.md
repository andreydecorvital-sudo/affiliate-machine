# Supabase

A Affiliate Machine usa Supabase como infraestrutura persistente central.

## Responsabilidades

- PostgreSQL: fonte canônica.
- Queues/pgmq: jobs duráveis.
- Cron/pg_cron: agendamentos.
- Auth: autenticação do painel.
- Storage: criativos e mídia.
- Realtime: atualizações operacionais quando necessário.

As filas não são expostas ao browser. O acesso inicial é server-to-server por funções RPC restritas a `service_role`.

## Filas iniciais

- offer_hunting
- offer_revalidation
- creative_generation
- post_distribution
- conversion_sync
- analytics_rollup

## Segurança

Todas as tabelas do schema `public` criadas pelo projeto têm RLS habilitado. Nesta fase não existem policies de browser.

Nunca colocar `service_role` ou secret key em variável `NEXT_PUBLIC_*`.
