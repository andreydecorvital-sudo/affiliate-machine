# Chat 12 — RELEASE GATE / MVP CERTIFICATION

Branch: não criar feature branch de produto.

Sua função é CERTIFICAR o MVP integrado em um SHA congelado.

Não desenvolver novas features.
Não refatorar por preferência.
Não corrigir P2 incidentalmente.

Certificar ponta a ponta:
1. DB/migrations;
2. jobs/idempotência;
3. Shopee offers;
4. score;
5. link afiliado/tracking;
6. post;
7. delivery canário em ambiente controlado;
8. shortlink/click;
9. conversion sync;
10. commission ledger;
11. group router;
12. frontend real;
13. Platform Admin;
14. health/gates;
15. nenhum autopilot/gasto habilitado por acidente.

Saída:
- SHA certificado;
- PASS/FAIL por capability;
- blockers P0/P1;
- evidências;
- regressões;
- recomendação objetiva de liberar ou não o MVP interno.
