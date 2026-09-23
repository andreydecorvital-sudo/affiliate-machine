# Meta Ads — Read-only ingestion

## Objetivo

Importar gasto e métricas de campanha da Meta para a camada `paid_traffic_spend` sem criar, editar, pausar ou alterar orçamento de Ads.

## Segurança

O provider implementado possui somente operações HTTP GET.

Não existe método de escrita no adapter Meta.

`META_ADS_WRITE_ENABLED` continua OFF e não é consultado pelo reader porque não há caminho de write neste módulo.

O access token fica somente no ambiente da aplicação e nunca é persistido no banco ou devolvido pelos endpoints internos.

## Configuração

Variáveis necessárias:

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `META_GRAPH_API_VERSION`

Opcional:

- `META_GRAPH_BASE_URL` — padrão `https://graph.facebook.com`.

A versão da Graph API é obrigatória. O código não usa `latest`, não escolhe uma versão por conta própria e não contém fallback silencioso.

## Dados importados

Granularidade:

`campaign x day`

Campos normalizados:

- external account id;
- external campaign id;
- campaign name;
- spend;
- impressions;
- clicks;
- date_start;
- currency da conta.

O sync usa paginação com limite máximo configurável e remove `access_token` de URLs de paginação antes de seguir a próxima página, usando novamente o header Authorization.

## Mapeamento

Descobrir uma campanha Meta não significa automaticamente saber qual UTM/campanha de aquisição ela representa.

Tabela:

`paid_traffic_campaign_links`

Estados:

- `unmapped`: spend foi importado, mas não entra em rateio de CAC por grupo;
- `mapped`: external campaign está vinculada explicitamente a um `traffic_campaign.campaign_key`.

O sistema não tenta mapear pelo nome da campanha.

O vínculo pode ser feito antes da primeira visita. Se o `campaignKey` ainda não existir, uma `traffic_campaign` mínima é criada; o router UTM completa os metadados depois.

## Endpoints internos

### Status

`GET /api/internal/meta/ads/status`

Não devolve token.

### Sync

`POST /api/internal/meta/ads/sync`

Body:

```json
{
  "since": "2026-09-01",
  "until": "2026-09-23",
  "maxPages": 20
}
```

### Campanhas descobertas

`GET /api/internal/meta/ads/campaigns`

### Mapear

`POST /api/internal/meta/ads/campaigns/{linkId}/link`

Body:

```json
{
  "campaignKey": "instagram|paid_social|casa-01"
}
```

### Desmapear

`DELETE /api/internal/meta/ads/campaigns/{linkId}/link`

## Observação sobre documentação oficial

A versão atual da Graph API deve ser definida na infraestrutura após validação da documentação oficial/conta Meta. O código não fixa uma versão porque isso transformaria uma decisão operacional mutável em constante de código.
