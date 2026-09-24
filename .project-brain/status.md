# Project Brain — Status

## Current phase

`MONEY ENGINE — SUPABASE LIVE / VERCEL PREVIEW PENDING`

## Strategic priority

`MONEY ENGINE FIRST`

O backend econômico já cobre descoberta, score, distribuição, aquisição, atribuição, analytics, aprendizado, tráfego pago e experimentação segura.
Visual relevante continua adiado até validação real de:
`hunter → conversion sync → learning → score → tracked delivery → click → commission → EPC/CAC/experiments`.

## Capability status

### Foundation
- Platform foundation: LIVE_DB_READY
- Frontend Zero operator interface: CODE_READY / VERCEL_PREVIEW_PENDING
- Canary Readiness + Control Center: CODE_READY / LIVE_ENV_PENDING
- Next.js/Vercel minimal surface: CODE_READY / DEPLOY_PENDING
- PostgreSQL schema: LIVE_READY (20 migrations applied)
- Supabase Queues: CODE_READY / LIVE_VALIDATION_PENDING
- Supabase Cron: CODE_READY / LIVE_VALIDATION_PENDING
- Universal events: LIVE_DB_READY / APP_TRAFFIC_PENDING
- Audit/idempotency: LIVE_DB_READY / APP_TRAFFIC_PENDING
- Gemini adapter: CODE_READY / API_KEY_PENDING

### Money Engine
- Shopee Affiliate provider: CODE_READY / CREDENTIALS_PENDING
- Hunter strategies: CODE_READY / LIVE_API_PENDING
- Hunter run memory: LIVE_DB_READY / LIVE_API_PENDING
- Discovery niche/origin memory: LIVE_DB_READY / LIVE_API_PENDING
- Offer snapshots: LIVE_DB_READY / LIVE_API_PENDING
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
- Shortlinks/click tracking: LIVE_DB_READY / LIVE_TRAFFIC_PENDING
- WhatsApp multi-account bridge: CODE_READY / PAIRING_PENDING
- Groups/capacity: CODE_READY / LIVE_SYNC_PENDING
- Posts/deliveries: LIVE_DB_READY / LIVE_SEND_PENDING
- Distribution quota 35/day + 3/hour: CODE_READY / LIVE_VALIDATION_PENDING
- Pre-send offer revalidation: CODE_READY / LIVE_API_PENDING
- Per-delivery/group attribution links: CODE_READY / LIVE_API_PENDING
- Acquisition group router: CODE_READY / LIVE_ROUTE_PENDING
- UTM/campaign cohorts: CODE_READY / LIVE_TRAFFIC_PENDING
- Conversion sync: CODE_READY / LIVE_API_PENDING
- Commission ledger: LIVE_DB_READY / LIVE_CONVERSION_PENDING
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
- Meta ad-level creative ingestion: CODE_READY / LIVE_API_PENDING
- Paid creative spend store: LIVE_DB_READY / LIVE_API_PENDING
- Creative campaignKey + creativeKey mapping: LIVE_DB_READY / LIVE_MAPPING_PENDING
- Creative routed-visit attribution via utm_content: LIVE_DB_READY / LIVE_TRAFFIC_PENDING
- Paid creative performance learning: LIVE_DB_READY / LIVE_SAMPLE_PENDING
- Creative modeled commission/net/ROAS: LIVE_DB_READY / LIVE_SAMPLE_PENDING
- Distribution timing learning: CODE_READY / LIVE_SAMPLE_PENDING
- Group performance learning: CODE_READY / LIVE_SAMPLE_PENDING
- Timing baseline/treatment experiments: CODE_READY / LIVE_SAMPLE_PENDING
- Group-allocation baseline/treatment experiments: CODE_READY / LIVE_SAMPLE_PENDING
- Learned delivery eligibility windows: CODE_READY / LIVE_SAMPLE_PENDING
- Deterministic exploitation/exploration allocation: CODE_READY / LIVE_SAMPLE_PENDING

### Next blocker
- Dedicated Supabase project + migrations: LIVE_READY (`vftnoaafqyqjydeflknl`, sa-east-1)
- Vercel project/envs: PENDING_CONNECTOR_DEPLOY_ACCESS
- Shopee affiliate credentials: PENDING
- Gemini API key: PENDING
- WhatsApp pairing + explicit group activation: PENDING
- one controlled end-to-end canary: PENDING
- live DB readiness: 0 WhatsApp accounts / 0 groups / all safety gates OFF

### Next code opportunity
- operator authentication before public Vercel production: NEXT
- creative mapping controls in UI: NEXT
- WhatsApp pairing workflow: NEXT

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
- PR #14 — Frontend Zero Operator Interface
- PR #15 — Creative Attribution + Paid Creative Learning
- PR #16 — Canary Readiness + Control Center

## Live infrastructure

- Supabase project: `affiliate-machine`
- Project ref: `vftnoaafqyqjydeflknl`
- Region: `sa-east-1`
- Project URL: `https://vftnoaafqyqjydeflknl.supabase.co`
- 21 migrations applied successfully
- 10 Hunter strategies seeded
- Supabase smoke test: quota ✅ money summary ✅ Hunter rank ✅ learning refresh ✅ distribution learning ✅ creative performance ✅ creative learning ✅ creative link/unlink ✅
- Safety flags: autopilot OFF ✅ Meta Ads write OFF ✅ WhatsApp real-send OFF ✅
- Security advisor: no WARN/ERROR; RLS deny-by-default INFO only
- Performance advisor: FK index issues resolved; only expected unused-index INFO on empty DB
- Generated TypeScript database types committed

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
- Frontend Zero Operator Interface CI: typecheck ✅ tests ✅ build ✅
- Creative Attribution + Paid Learning CI: typecheck ✅ tests ✅ build ✅
- Canary Readiness + Control Center CI: typecheck ✅ tests ✅ build ✅

## Architecture decision

Runtime/infrastructure target: Vercel + Supabase.
Strict isolation from Argoplace: no shared database, no shared runtime/envs, and no inclusion in Argoplace plans/add-ons.
Gemini remains the approved primary AI provider, with deterministic degradation when unavailable.

Paid traffic economics keeps exact and modeled metrics separate.
No Ads write path exists.

## Rule

`CODE_READY` não significa `LIVE_READY`.
Capability só vira LIVE_READY após migration/API real/canário correspondente.
