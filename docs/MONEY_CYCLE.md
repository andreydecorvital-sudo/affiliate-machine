# Money Cycle

## Objetivo

Executar o backend econômico em uma única chamada, sem depender do frontend.

```text
Shopee offers
→ snapshots
→ score
→ materialize posts
→ process deliveries
→ conversionReport
→ attribution
→ money analytics
```

Endpoint Vercel:

`POST /api/internal/money/cycle`

Autenticação:

`Authorization: Bearer <INTERNAL_JOB_SECRET>`

## Segurança

O ciclo não ignora gates.

Se `WHATSAPP_REAL_SEND_ENABLED=0`, a etapa distribution retorna `gate_disabled` e não envia mensagens.

Os limites 35 posts/dia e 3 novos posts/hora continuam sendo aplicados no banco.

## Isolamento

Cada etapa retorna `ok` ou `error` separadamente.

Uma falha de busca de ofertas, por exemplo, não impede o sistema de tentar sincronizar conversões já existentes e calcular analytics.

HTTP 207 indica execução parcial.

## Supabase Cron

A Edge Function `money-cycle-kick` existe para ser chamada pelo Supabase Cron quando a infraestrutura real for criada.

Secrets esperados na função:

- `MONEY_CYCLE_URL`: URL absoluta do endpoint Vercel `/api/internal/money/cycle`.
- `INTERNAL_JOB_SECRET`: mesmo segredo configurado na Vercel.

Não existe cron real habilitado no repositório nesta fase. O schedule só deve ser ligado depois do canário e com os gates revisados.
