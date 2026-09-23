# Project Brain — Status

## Current phase

`PHASE 0 — FOUNDATION BUILDING`

## Capability status

- Platform foundation: BUILDING
- Next.js/Vercel surface: BUILDING
- PostgreSQL schema: BUILDING
- Supabase Queues: BUILDING
- Supabase Cron: BUILDING
- Universal events: BUILDING
- Audit/idempotency: BUILDING
- Gemini adapter: BUILDING
- Shopee Affiliate provider: PLANNED
- Offer snapshots: PLANNED
- Score engine: PLANNED
- Creative engine: PLANNED
- WhatsApp multi-session: PLANNED
- Groups/capacity: PLANNED
- Posts/deliveries: PLANNED
- Shortlinks/clicks: PLANNED
- Conversion sync: PLANNED
- Commission ledger: PLANNED
- Landing/group router: PLANNED
- Cohorts: PLANNED
- Operational frontend: PLANNED
- Platform Admin: PLANNED
- Meta Ads: PLANNED
- Learning/experiments: PLANNED

## Architecture decision

Runtime and infrastructure target: Vercel + Supabase. Gemini is the approved primary AI provider, with deterministic degradation when unavailable.

## Rule

A capability becomes READY only with test/build evidence and, when applicable, validation against a real Supabase project.
