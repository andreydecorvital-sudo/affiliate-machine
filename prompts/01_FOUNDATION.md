# Chat 1 — FOUNDATION / SUPABASE / VERCEL

Branch: `feat/foundation-platform`.

Escopo:
- monorepo real;
- Next.js;
- Supabase Postgres;
- Supabase Queues/pgmq;
- Supabase Cron;
- config/secrets;
- universal events;
- audit;
- idempotência;
- health/readiness;
- feature gates;
- adapter Gemini seguro.

Não usar pg-boss, Redis ou worker server dedicado.

Regras:
- RLS em tabelas públicas;
- secrets apenas server-side;
- service role nunca no browser;
- SECURITY DEFINER somente com grants restritos;
- gates reais OFF;
- Gemini não é requisito de saúde do core.

Definition of Done:
- app Next compila;
- migration aplica em Supabase limpo;
- filas existem;
- enqueue/read/archive funcionam com service_role;
- health reporta DB/Gemini/gates;
- testes passam;
- Project Brain atualizado.

Não faça merge sem revisão.
