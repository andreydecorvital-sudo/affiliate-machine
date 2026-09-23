# Project Brain — Status

## Current phase

`MONEY ENGINE — CODE LOOP READY / LIVE VALIDATION PENDING`

## Strategic priority

`MONEY ENGINE FIRST`

O backend do ciclo econômico está construído. Visual relevante continua adiado até validação real de:
`offer → score → tracked delivery → click → conversion → commission → EPC/CAC`.

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
- Score engine: CODE_READY / LIVE_DATA_PENDING
- Opportunity decisions: CODE_READY / LIVE_DATA_PENDING
- Shortlinks/click tracking: CODE_READY / LIVE_DB_PENDING
- WhatsApp multi-account bridge: CODE_READY / PAIRING_PENDING
- Groups/capacity: CODE_READY / LIVE_SYNC_PENDING
- Posts/deliveries: CODE_READY / LIVE_DB_PENDING
- Distribution quota 35/day + 3/hour: CODE_READY / LIVE_VALIDATION_PENDING
- Pre-send offer revalidation: CODE_READY / LIVE_API_PENDING
- Per-delivery/group attribution links: CODE_READY / LIVE_API_PENDING
- Acquisition group router: CODE_READY / LIVE_ROUTE_PENDING
- UTM/campaign cohorts: CODE_READY / LIVE_TRAFFIC_PENDING
- Conversion sync: CODE_READY / LIVE_API_PENDING
- Commission ledger: CODE_READY / LIVE_DB_PENDING
- Conservative conversion attribution: CODE_READY / LIVE_CONVERSION_PENDING
- EPC/group money analytics: CODE_READY / LIVE_DATA_PENDING

### Next blocker
- Money Cycle orchestration: BUILDING
- Dedicated Supabase project + migrations: PENDING_USER_INFRA_PHASE
- Vercel project/envs: PENDING_USER_INFRA_PHASE
- Shopee credentials: PENDING
- Gemini API key: PENDING
- WhatsApp pairing + explicit group activation: PENDING
- one controlled canary end-to-end: PENDING

### Later
- Meta Ads read analytics / CAC: PLANNED
- Learning/experiments: PLANNED
- TikTok/Amazon affiliate providers: FUTURE

### Deferred
- Operational frontend polish: DEFERRED_UNTIL_MONEY_LOOP
- Platform Admin visual: DEFERRED_UNTIL_MONEY_LOOP

## Active stacked PRs

- PR #1 — Foundation
- PR #2 — Shopee Affiliate Core
- PR #3 — Offer Intelligence
- PR #4 — Attribution / Shortlinks
- PR #5 — Distribution + WhatsApp
- PR #6 — Acquisition Group Router
- PR #7 — Money Analytics

## Evidence

- Shopee Affiliate CI: typecheck ✅ tests ✅ build ✅
- Offer Intelligence CI: typecheck ✅ tests ✅ build ✅
- Attribution CI: typecheck ✅ tests ✅ build ✅
- Distribution CI: typecheck ✅ tests ✅ build ✅
- Acquisition CI: typecheck ✅ tests ✅ build ✅
- Money Analytics CI: typecheck ✅ tests ✅ build ✅

## Architecture decision

Runtime/infrastructure target: Vercel + Supabase. Gemini is the approved primary AI provider, with deterministic degradation when unavailable.

## Rule

`CODE_READY` não significa `LIVE_READY`.
Capability só vira LIVE_READY após migration/API real/canário correspondente.
