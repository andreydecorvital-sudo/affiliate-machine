# Development Playbook

## Regra de ouro

Nunca abrir 12 chats codando ao mesmo tempo só porque existem 12 prompts.
Os prompts representam frentes, não autorização para paralelismo irrestrito.

## Sequência recomendada

### Etapa A — Governança
Abra primeiro:
- Chat 0 — Project Orchestrator / Project Brain

Ele permanece como referência de arquitetura e revisão.

### Etapa B — Fundação
Abra somente:
- Chat 1 — Foundation / DB / Jobs / Events

Integre e estabilize antes das demais frentes.

### Etapa C — Providers e runtime em paralelo
Depois da Foundation integrada, podem rodar em paralelo:
- Chat 2 — Shopee Affiliate Core
- Chat 4 — WhatsApp Multi-Session
- Chat 9 — Platform Admin (somente base de health/project brain; não inventar dados ausentes)

### Etapa D — Inteligência e atribuição
Após contratos do provider Shopee:
- Chat 3 — Offer Intelligence / Score
- Chat 6 — Attribution Engine

Podem rodar em paralelo se respeitarem contratos compartilhados.

### Etapa E — Distribuição e aquisição
Após WhatsApp + Score básicos:
- Chat 5 — Distribution Engine
- Chat 7 — Acquisition / Group Router

### Etapa F — Frontend operacional
Quando APIs principais estiverem estáveis:
- Chat 8 — Frontend Zero

Não criar mocks permanentes para cobrir backend ausente.

### Etapa G — Meta Ads
Somente quando Group Router + cohorts existirem:
- Chat 10 — Meta Ads Read Analytics

### Etapa H — Aprendizado
Somente quando houver dados reais suficientes:
- Chat 11 — Experiments / Learning

### Etapa I — Certificação
Ao fechar o MVP:
- Chat 12 — Release Gate

## Integração

Cada frente deve:
1. partir do `main` mais recente;
2. usar branch definida no prompt;
3. não fazer merge sem solicitação;
4. entregar SHA + testes + evidências;
5. atualizar Project Brain;
6. abrir PR pequeno;
7. passar revisão arquitetural do Chat 0 antes de merge quando tocar domínio compartilhado.

## Quando duas frentes conflitam

A prioridade é:
1. source of truth do domínio;
2. contrato já integrado em main;
3. Project Master Plan;
4. decisão explícita registrada em `docs/DECISIONS.md`.

Nunca resolver conflito criando uma segunda tabela/segunda API/segundo motor.

## Branches

- `chore/project-brain`
- `feat/foundation-platform`
- `feat/shopee-affiliate-core`
- `feat/offer-intelligence`
- `feat/whatsapp-multisession`
- `feat/distribution-engine`
- `feat/attribution-engine`
- `feat/acquisition-group-router`
- `feat/frontend-zero-core`
- `feat/platform-admin`
- `feat/meta-ads-analytics`
- `feat/learning-engine`

## Política de canário

Qualquer integração com efeito externo deve ter 3 níveis:

1. Fixture/Test — sem rede real ou sem efeito externo.
2. Shadow/Dry-run — rede real permitida, nenhuma mutação externa.
3. Canary — uma única ação real explicitamente autorizada.

Nunca pular direto para lote/autopilot.
