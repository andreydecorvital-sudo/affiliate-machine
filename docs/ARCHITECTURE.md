# Arquitetura

## Visão

```text
                      ┌──────────────────────┐
                      │ Affiliate Providers  │
                      │ Shopee/TikTok/Amazon │
                      └──────────┬───────────┘
                                 ↓
                           Offer Hunter
                                 ↓
                     Product + Offer Snapshots
                                 ↓
                           Score Engine
                                 ↓
                        Opportunity Queue
                                 ↓
                 Affiliate Link / Attribution IDs
                                 ↓
                         Creative Engine
                                 ↓
                             posts
                                 ↓
                         pg-boss scheduler
                                 ↓
                      WhatsApp Distributor
                                 ↓
            ┌────────────────────┼────────────────────┐
            ↓                    ↓                    ↓
          Group A              Group B              Group C

Click → Shortlink → click_events → Marketplace → Conversion → Commission Ledger

Meta Ads → Landing → Group Router → Cohort → Group
```

## Runtime

### Web
- Next.js.
- Dashboard operacional.
- Platform Admin.
- Landing/group router.
- APIs internas.

### Worker
- Hunter.
- Revalidation.
- Score.
- Conversion sync.
- Analytics aggregation.
- Scheduled jobs.

### WhatsApp Worker
- Processo persistente.
- Baileys.
- N sessões.
- Cache/runtime de conexão.
- Busca de grupos.
- Envio mídia/texto.
- ACK/health/reconnect.

### PostgreSQL
Única fonte persistente inicial.

## Integrações por adapters

```ts
interface AffiliateProvider {
  searchOffers(input): Promise<OfferPage>
  getOffer(id): Promise<OfferSnapshot>
  createAffiliateLink(input): Promise<AffiliateLink>
  getConversions(input): Promise<ConversionPage>
}

interface WhatsAppProvider {
  connect(accountId): Promise<void>
  listGroups(accountId): Promise<Group[]>
  send(delivery): Promise<SendResult>
  health(accountId): Promise<Health>
}
```

## Padrões herdados da Argo

- idempotência explícita;
- audit trail;
- source of truth claro;
- dry-run/shadow mode;
- durable jobs;
- eventos universais;
- circuit breaker;
- feature gates;
- health/readiness;
- Frontend Zero e Platform Admin separados.
