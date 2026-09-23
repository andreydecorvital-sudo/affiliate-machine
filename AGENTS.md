# AGENTS.md

Este arquivo é a instrução global para qualquer agente/chat trabalhando no repositório.

## Antes de codar

Leia, nesta ordem:
1. `PROJECT_MASTER_PLAN.md`
2. `docs/ENGINEERING_RULES.md`
3. `.project-brain/project-plan.json`
4. `.project-brain/status.md`
5. o prompt específico da sua frente em `prompts/`

## Regras

- Trabalhe EXCLUSIVAMENTE no escopo da sua frente.
- Não faça merge sem solicitação explícita.
- Não habilite autopilot real.
- Não envie mensagens para grupos reais durante desenvolvimento, salvo canário explicitamente autorizado.
- Não faça gasto em Ads.
- Não crie providers paralelos ou tabelas duplicadas.
- Reutilize packages compartilhados.
- Toda integração externa precisa de timeout, retry policy e observabilidade.
- Toda mutação externa precisa de idempotency key.
- Atualize Project Brain quando concluir capability.
- Entregue no final: branch, SHA, arquivos, testes, evidências, gaps e riscos.
