# Chat 9 — PLATFORM ADMIN / SYSTEM MAP

Branch: `feat/platform-admin`
Dependências: Foundation e contratos dos runtimes.

Escopo:
- overview de saúde;
- Project Brain visual;
- mapa de módulos e relações;
- providers;
- WhatsApp sessions;
- jobs/dead jobs;
- incidents;
- migrations/readiness;
- feature gates;
- capacidade/custos básicos;
- audit trail.

Deve responder rapidamente:
- o que está funcionando?
- o que está bloqueado?
- que provider caiu?
- qual job está preso?
- qual sessão WhatsApp desconectou?
- qual capability está PLANNED/BUILDING/READY/BLOCKED?

Não criar regras de negócio duplicadas no Admin. Admin observa/controla; não vira owner do domínio.

DoD:
- status derive de fontes reais;
- links para entidades/erros relevantes;
- Project Brain renderizado;
- gates alteráveis somente com controle de acesso apropriado;
- Project Brain atualizado.
