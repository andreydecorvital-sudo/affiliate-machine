# Project Brain — Status

## Current phase

`PHASE 0 — FOUNDATION BUILDING`

## Strategic priority

`MONEY ENGINE FIRST`

Nenhum trabalho visual relevante deve preceder a validação do ciclo:
`offer → affiliate link → distribution → click → conversion → commission → CAC/LTV`.

## Capability status

- Platform foundation: BUILDING
- Next.js/Vercel minimal surface: BUILDING
- PostgreSQL schema: BUILDING
- Supabase Queues: BUILDING
- Supabase Cron: BUILDING
- Universal events: BUILDING
- Audit/idempotency: BUILDING
- Gemini adapter: BUILDING
- Shopee Affiliate provider: NEXT
- Offer snapshots: NEXT
- Score engine: NEXT
- WhatsApp multi-session: PLANNED
- Groups/capacity: PLANNED
- Posts/deliveries: PLANNED
- Shortlinks/clicks: PLANNED
- Conversion sync: PLANNED
- Commission ledger: PLANNED
- Landing/group router: PLANNED
- Cohorts: PLANNED
- Operational frontend: DEFERRED_UNTIL_MONEY_LOOP
- Platform Admin visual: DEFERRED_UNTIL_MONEY_LOOP
- Meta Ads: PLANNED
- Learning/experiments: PLANNED

## Architecture decision

Runtime and infrastructure target: Vercel + Supabase. Gemini is the approved primary AI provider, with deterministic degradation when unavailable.

## Rule

A capability becomes READY only with test/build evidence and, when applicable, validation against a real Supabase project.
