# Regras de Engenharia

1. Leia `PROJECT_MASTER_PLAN.md` e `.project-brain/project-plan.json` antes de alterar código.
2. Uma branch por frente.
3. Não crie um segundo motor quando já houver owner canônico.
4. Toda integração externa deve ter adapter explícito.
5. Toda mutação externa precisa de idempotency key.
6. Jobs devem tolerar retry sem duplicar efeito.
7. Não inferir sucesso de entrega por HTTP 200 apenas; persistir estado real disponível.
8. Não usar `published=true` como substituto de deliveries.
9. Não armazenar PII desnecessária de membros.
10. Nunca registrar secrets/tokens em logs.
11. Autopilot real nasce desligado.
12. Toda ação automática deve ter kill switch.
13. Erros transitórios usam retry/backoff; permanentes vão para dead/review.
14. Score deve ser explicável e versionado.
15. Fonte externa instável deve ter revalidation imediatamente antes da publicação.
16. Mudança de schema exige migration.
17. Feature nova declara owner, source of truth, eventos e Definition of Done.
18. Atualizar `.project-brain/status.md` no mesmo PR quando uma capability muda de estado.
19. Não misturar código da Argoplace diretamente sem remover acoplamentos de empresa/tenant/fiscal/operação.
20. Preferir código simples e observável a abstrações prematuras.
