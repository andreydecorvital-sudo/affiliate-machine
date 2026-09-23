# Chat 1 — FOUNDATION / DB / JOBS / EVENTS

Branch: `feat/foundation-platform`

Escopo EXCLUSIVO:
- estrutura real do monorepo;
- PostgreSQL;
- migrations;
- configuração/secret handling;
- pg-boss;
- audit log;
- universal events;
- health/readiness;
- feature gates;
- testes de idempotência da fundação.

Não implementar Shopee, WhatsApp, Meta Ads ou frontend de negócio.

Requisitos:
- schema inicial alinhado a docs/DATABASE.md;
- migrations determinísticas;
- jobs com retry/backoff/dead-letter;
- helper de idempotency key;
- API/contract para registrar eventos;
- gates `AUTOPILOT_ENABLED`, `WHATSAPP_REAL_SEND_ENABLED`, `META_ADS_WRITE_ENABLED` desligados por padrão;
- health do DB/jobs;
- sem Redis.

Definition of Done:
- ambiente local sobe com Postgres;
- migration aplica do zero;
- job canário executa exatamente uma vez mesmo com retry;
- evento duplicado é deduplicado;
- testes passam;
- Project Brain atualizado.

Não faça merge nem deploy.
