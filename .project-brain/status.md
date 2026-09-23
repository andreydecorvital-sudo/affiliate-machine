# Project Brain — Status

## Current phase

`MONEY ENGINE — BACKEND LOOP READY / LIVE VALIDATION PENDING`

## Strategic priority

`MONEY ENGINE FIRST`

O backend econômico já cobre descoberta, score, distribuição, aquisição, atribuição, analytics, aprendizado, tráfego pago e experimentação segura.
Visual relevante continua adiado até validação real de:
`hunter → conversion sync → learning → score → tracked delivery → click → commission → EPC/CAC/experiments`.

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
- Hunter strategies: CODE_READY / LIVE_API_PENDING
- Hunter run memory: CODE_READY / LIVE_DB_PENDING
- Discovery niche/origin memory: CODE_READY / LIVE_DB_PENDING
- Offer snapshots: CODE_READY / LIVE_DB_PENDING
- Affiliate link + Shopee subIds: CODE_READY / LIVE_API_PENDING
- Score engine v1.1: CODE_READY / LIVE_DATA_PENDING
- Product learning metrics: CODE_READY / LIVE_DATA_PENDING
- Strategy learning metrics: CODE_READY / LIVE_DATA_PENDING
- Bayesian CVR/RPC smoothing: CODE_READY / LIVE_DATA_PENDING
- Sample-confidence weighting: CODE_READY / LIVE_DATA_PENDING
- Learned Hunter effective rank: CODE_READY / LIVE_DATA_PENDING
- Recent publication penalty: CODE_READY / LIVE_DATA_PENDING
- 7-day product cooldown: CODE_READY / LIVE_DATA_PENDING
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
- Money Cycle orchestrator: CODE_READY / LIVE_RUN_PENDING
- Paid traffic spend ingestion: CODE_READY / LIVE_DATA_PENDING
- Campaign cost-per-routed-visit: CODE_READY / LIVE_DATA_PENDING
- Modeled spend allocation by group: CODE_READY / LIVE_DATA_PENDING
- Modeled commission ROAS/net by group: CODE_READY / LIVE_DATA_PENDING
- Message-copy Experiment Engine: CODE_READY / LIVE_SAMPLE_PENDING
- Deterministic delivery assignment: CODE_READY / LIVE_SAMPLE_PENDING
- Experiment CVR/RPC/commission metrics: CODE_READY / LIVE_SAMPLE_PENDING
- Meta Ads read-only provider: CODE_READY / CREDENTIALS_PENDING
- Meta Ads daily campaign insights sync: CODE_READY / LIVE_API_PENDING
- Meta campaign mapping to UTM campaignKey: CODE_READY / LIVE_MAPPING_PENDING
- Meta campaign spend → paid economics: CODE_READY / LIVE_DATA_PENDING
- Distribution timing learning: CODE_READY / LIVE_SAMPLE_PENDING
- Group performance learning: CODE_READY / LIVE_SAMPLE_PENDING
- Timing baseline/treatment experiments: CODE_READY / LIVE_SAMPLE_PENDING
- Group-allocation baseline/treatment experiments: CODE_READY / LIVE_SAMPLE_PENDING
- Learned delivery eligibility windows: CODE_READY / LIVE_SAMPLE_PENDING
- Deterministic exploitation/exploration allocation: CODE_READY / LIVE_SAMPLE_PENDING

### Next blocker
- Dedicated Supabase project + migrations: PENDING_USER_INFRA_PHASE
- Vercel project/envs: PENDING_USER_INFRA_PHASE
- Shopee affiliate credentials: PENDING
- Gemini API key: PENDING
- WhatsApp pairing + explicit group activation: PENDING
- one controlled end-to-end canary: PENDING

### Next code opportunity
- acquisition creative attribution: NEXT
- paid creative performance learning: NEXT
- canary readiness report: NEXT

### Later
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
- PR #8 — Money Cycle Orchestrator
- PR #9 — Hunter Strategies / Origin Memory / Cooldown
- PR #10 — Learning Engine / Money Feedback Loop
- PR #11 — Paid Economics / Experiment Engine
- PR #12 — Meta Ads Read-only Ingestion
- PR #13 — Timing + Group Allocation Experiments

## Evidence

- Shopee Affiliate CI: typecheck ✅ tests ✅ build ✅
- Offer Intelligence CI: typecheck ✅ tests ✅ build ✅
- Attribution CI: typecheck ✅ tests ✅ build ✅
- Distribution CI: typecheck ✅ tests ✅ build ✅
- Acquisition CI: typecheck ✅ tests ✅ build ✅
- Money Analytics CI: typecheck ✅ tests ✅ build ✅
- Money Cycle CI: typecheck ✅ tests ✅ build ✅
- Hunter Strategies CI: typecheck ✅ tests ✅ build ✅
- Learning Engine CI: typecheck ✅ tests ✅ build ✅
- Paid Economics / Experiment Engine CI: typecheck ✅ tests ✅ build ✅
- Meta Ads Read-only CI: typecheck ✅ tests ✅ build ✅
- Timing + Group Allocation CI: typecheck ✅ tests ✅ build ✅

## Architecture decision

Runtime/infrastructure target: Vercel + Supabase.
Gemini remains the approved primary AI provider, with deterministic degradation when unavailable.

Paid traffic economics keeps exact and modeled metrics separate.
No Ads write path exists.

## Rule

`CODE_READY` não significa `LIVE_READY`.
Capability só vira LIVE_READY após migration/API real/canário correspondente.
