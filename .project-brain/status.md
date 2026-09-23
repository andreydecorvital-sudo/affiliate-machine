# Project Brain — Status

## Current phase

`MONEY ENGINE — CORE CODE BUILDING`

## Strategic priority

`MONEY ENGINE FIRST`

Visual relevante continua adiado até o ciclo:
`offer → affiliate link → shortlink → click → conversion → commission → CAC/LTV`
estar validado com dados reais.

## Capability status

### Foundation
- Platform foundation: CODE_READY / LIVE_DB_PENDING
- Next.js/Vercel minimal surface: CODE_READY / DEPLOY_PENDING
- PostgreSQL schema: CODE_READY / MIGRATION_PENDING
- Supabase Queues: CODE_READY / LIVE_VALIDATION_PENDING
- Supabase Cron: CODE_READY / LIVE_VALIDATION_PENDING
- Universal events: CODE_READY / LIVE_VALIDATION_PENDING
- Audit/idempotency: CODE_READY / LIVE_VALIDATION_PENDING
- Gemini adapter: CODE_READY / API_KEY_PENDING

### Money Engine
- Shopee Affiliate provider: CODE_READY / CREDENTIALS_PENDING
- Offer snapshots: CODE_READY / LIVE_DB_PENDING
- Affiliate link + Shopee subIds: CODE_READY / LIVE_API_PENDING
- Conversion sync: CODE_READY / LIVE_API_PENDING
- Commission ledger: CODE_READY / LIVE_DB_PENDING
- Score engine: CODE_READY / LIVE_DATA_PENDING
- Opportunity decisions: CODE_READY / LIVE_DATA_PENDING
- Shortlinks: CODE_READY / LIVE_DB_PENDING
- Click tracking: CODE_READY / LIVE_DB_PENDING

### Next
- WhatsApp provider/session adapter: NEXT
- Groups/capacity: NEXT
- Posts/deliveries: NEXT
- Distribution queue consumer: NEXT
- Landing/group router: PLANNED
- Cohorts/CAC: PLANNED
- Meta Ads read analytics: PLANNED
- Learning/experiments: PLANNED

### Deferred
- Operational frontend polish: DEFERRED_UNTIL_MONEY_LOOP
- Platform Admin visual: DEFERRED_UNTIL_MONEY_LOOP

## Active stacked PRs

- PR #1 — Foundation
- PR #2 — Shopee Affiliate Core
- PR #3 — Offer Intelligence
- PR #4 — Attribution / Shortlinks

## Evidence

- Shopee Affiliate CI: typecheck ✅ tests ✅ build ✅
- Offer Intelligence CI: typecheck ✅ tests ✅ build ✅
- Attribution CI: typecheck ✅ tests ✅ build ✅

## Architecture decision

Runtime/infrastructure target: Vercel + Supabase. Gemini is the approved primary AI provider, with deterministic degradation when unavailable.

## Rule

`CODE_READY` não significa `LIVE_READY`.
Capability só vira LIVE_READY após migration/API real/canário correspondente.
