# Paid Creative Attribution + Learning

## Objetivo

Medir criativos de tráfego pago sem transformar correlação em causalidade.

O sistema separa quatro camadas:

1. **Spend exato por anúncio/criativo** — importado da plataforma.
2. **Visita roteada exata por creative key** — exige correspondência de `campaignKey + utm_content`.
3. **Comissão modelada por criativo** — rateia a comissão atribuída aos grupos pela participação das visitas roteadas de cada criativo.
4. **Learning conservador** — só gera sinal suavizado quando existe amostra mínima.

## Tracking

Cada criativo precisa de:

- `campaignKey`: identifica a campanha de aquisição;
- `creativeKey`: valor que deve chegar em `utm_content`.

Nenhum vínculo é inferido pelo nome do anúncio.

## Dados exatos

Tabela `paid_creative_spend`:

- spend;
- impressions;
- platform clicks;
- data;
- external ad id;
- external adset id.

Tabela `acquisition_visits`:

- campaign;
- `utm_content`;
- grupo roteado;
- bot/non-bot;
- horário.

A visita é ligada ao criativo somente quando:

`acquisition_visits.campaign_id = paid_creatives.campaign_id`

e

`acquisition_visits.utm_content = paid_creatives.creative_key`

## Dados modelados

Não existe identidade individual confiável ligando:

`clicou no anúncio → entrou no grupo → recebeu delivery depois → comprou`.

Portanto, comissão por criativo é modelada.

Dentro de cada grupo, o sistema calcula a participação das visitas roteadas de cada criativo e usa essa proporção para alocar a comissão atribuída ao grupo.

Métricas modeladas:

- modeled commission;
- modeled net commission;
- modeled commission ROAS;
- net per routed visit;
- smoothed net per routed visit.

## Learning

`paid_creative_metrics` usa:

- janela configurável;
- mínimo de 5 routed visits para sinal suavizado;
- prior de 20 visitas;
- confiança = `min(1, routed_visits / 50)`.

O sistema não aumenta orçamento, não pausa campanha e não promove winner automaticamente.

## Meta Ads

O provider Meta continua read-only.

O sync passa a buscar:

- campaign-level insights;
- ad-level insights.

O ad-level alimenta `paid_creatives` e `paid_creative_spend`.

## APIs internas

- `GET /api/internal/acquisition/creatives?days=30`
- `POST /api/internal/acquisition/creatives/refresh`
- `POST /api/internal/acquisition/creatives/{id}/link`
- `DELETE /api/internal/acquisition/creatives/{id}/link`

O endpoint Meta sync aceita:

```json
{
  "since": "2026-09-01",
  "until": "2026-09-24",
  "maxPages": 20,
  "includeCreatives": true
}
```

## Safety

- Meta write inexistente;
- `META_ADS_WRITE_ENABLED=0`;
- sem inferência automática por nome;
- sem criação/edição de campanha;
- sem budget automation;
- sem winner automático;
- Argo permanece totalmente fora desta infraestrutura.
