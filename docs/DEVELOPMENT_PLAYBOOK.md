# Development Playbook

## Infra canônica

Vercel + Supabase + Gemini.

Não criar worker server, Redis ou banco paralelo sem uma decisão arquitetural registrada.

## Ordem

1. Orchestrator.
2. Foundation.
3. Após Foundation integrada: Shopee Affiliate e WhatsApp.
4. Intelligence + Attribution.
5. Distribution + Acquisition Router.
6. Frontend Zero.
7. Platform Admin.
8. Meta Ads read analytics.
9. Learning.
10. Release Gate.

## Foundation

Deve entregar:
- Next.js real;
- Supabase server-side;
- schema inicial;
- Queues via pgmq;
- Cron habilitado;
- universal events;
- audit;
- idempotência;
- feature gates;
- health endpoint;
- Gemini adapter opcional e seguro.

## External effects

1. fixture;
2. shadow/dry-run;
3. canário;
4. lote controlado;
5. autopilot somente após Release Gate.
