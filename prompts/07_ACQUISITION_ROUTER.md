# Chat 7 — LANDING / GROUP ROUTER / COHORTS

Branch: `feat/acquisition-group-router`
Dependências: Foundation + Groups.

Escopo:
- páginas públicas por nicho;
- UTM capture;
- group router;
- capacity threshold;
- overflow route;
- group_join_events;
- traffic cohorts;
- redirect seguro para convite.

Fluxo:
`/g/{niche}` → registra origem/coorte → escolhe grupo aceitando tráfego → redirect para convite.

Não criar automação de Meta Ads ainda.

DoD:
- rota não depende de URL de grupo hardcoded;
- troca de grupo sem alterar campanha externa;
- concorrência não manda todos para grupo já fechado;
- histórico de roteamento auditável;
- Project Brain atualizado.
