# Affiliate Machine

Sistema pessoal, independente da Argoplace, para construir e operar uma máquina de aquisição + distribuição + monetização de ofertas afiliadas em grupos de WhatsApp.

## Objetivo

Transformar tráfego pago e orgânico em audiência própria de grupos segmentados e monetizar essa audiência com ofertas afiliadas selecionadas automaticamente.

Fluxo principal:

```text
Affiliate Providers
      ↓
Offer Hunter
      ↓
Snapshots + Score
      ↓
Affiliate Link + Attribution IDs
      ↓
Creative Engine
      ↓
Scheduler / Durable Jobs
      ↓
WhatsApp Distribution
      ↓
Clicks → Orders → Commission
      ↓
Cohort / CAC / LTV / Learning
      ↺
```

## Princípios

1. Um único cérebro de ofertas e um único estado canônico de publicação.
2. `post` lógico é diferente de `delivery` por grupo.
3. Toda operação externa mutável deve ser idempotente, auditável e recuperável.
4. Revalidar preço, estoque, comissão e link antes da publicação.
5. Nunca publicar só para preencher cota; cota é teto, não obrigação.
6. Medir `CAC → clique → venda → comissão → LTV` desde o MVP.
7. Não depender de Redis/Kafka/RabbitMQ inicialmente; PostgreSQL é suficiente.
8. WhatsApp fica atrás de um provider adapter para permitir trocar Baileys no futuro.
9. O dashboard operacional e o Platform Admin seguem a linguagem do Frontend Zero, sem copiar acoplamentos da Argoplace.
10. O projeto é pequeno por escolha: reaproveitar padrões, não carregar a complexidade inteira da Argo.

## Stack alvo

- TypeScript / Node.js
- Next.js para dashboard, admin e páginas públicas
- PostgreSQL
- `pg-boss` para jobs
- Baileys em worker persistente para WhatsApp
- Sharp para criativos estáticos
- Gemini/LLM barato somente onde acrescentar valor
- Cloudflare Worker ou redirect service próprio para shortlinks
- Meta Marketing API para aquisição
- Shopee Affiliate Open API como primeiro provider
- Docker para ambiente local/produção

## Monorepo

```text
apps/
  web/                 Dashboard + Admin + SaaS/Public
  worker/              Hunter, score, scheduler, attribution sync
  whatsapp-worker/     Sessões Baileys + grupos + entregas
packages/
  core/                Contratos e regras de domínio
  db/                  Schema, migrations e repositories
  providers/           Shopee/TikTok/Amazon/Meta/WhatsApp adapters
  ui/                  Design system compartilhado
docs/                   Arquitetura, banco, roadmap e decisões
prompts/                Prompts prontos para cada frente de desenvolvimento
.project-brain/         Mapa vivo do sistema e estado das capacidades
infra/                  Docker/deploy
```

## Comece por aqui

1. Leia `PROJECT_MASTER_PLAN.md`.
2. Leia `.project-brain/project-plan.json`.
3. Escolha apenas uma frente em `prompts/`.
4. Crie a branch indicada no prompt.
5. Não altere módulos fora do escopo da frente.
6. Ao terminar, atualize `.project-brain/status.md` e abra PR com evidências.

## Estado atual

Somente planejamento e esqueleto inicial. Nenhuma automação real está habilitada.
