# CAC + Experiment Engine

## Objetivo

Medir tráfego pago e experimentar mensagens sem transformar estimativas em fatos e sem permitir que o sistema altere orçamento sozinho.

## Economia de tráfego pago

Dados exatos:
- gasto diário importado por campanha;
- impressões/cliques reportados pela plataforma;
- visitas roteadas por `/g/[niche]`;
- comissão atribuída a deliveries/grupos.

Dados modelados:
- gasto por grupo, rateado pela participação daquele grupo nas visitas roteadas da campanha no mesmo dia;
- ROAS de comissão por grupo;
- comissão líquida após gasto modelado.

O sistema NÃO chama visita roteada de membro adquirido. O WhatsApp não fornece uma confirmação individual ligando o redirect ao usuário que efetivamente entrou no grupo.

## Ingestão de gasto

Endpoint:

`POST /api/internal/acquisition/spend`

Cada linha precisa trazer:
- provider;
- externalCampaignId;
- campaignKey;
- spentOn;
- spend;
- currency;
- métricas opcionais de impressions/platformClicks.

O `campaignKey` deve ser o mesmo usado no tráfego UTM para que o gasto seja ligado à campanha de aquisição correta.

A ingestão é idempotente por:
`provider + externalCampaignId + spentOn + currency`.

## Experimentos

Primeira modalidade:
`message_copy`

Assignment:
- ocorre por delivery;
- é determinístico;
- retries mantêm a mesma variante;
- tracking/shortlink permanece o mesmo mecanismo de atribuição.

Variantes podem alterar somente:
- headline;
- CTA label;
- footer.

Não existe urgência falsa automática nem mudança de preço/oferta.

## Regra de decisão

Nenhum winner é promovido automaticamente.

O endpoint de performance informa `sample_ready` por variante.
Só compare o experimento quando todas as variantes ativas atingirem `min_clicks_per_variant`.

Objetivos suportados:
- RPC;
- CVR;
- comissão por delivery.

## Segurança

- não existe endpoint de criar/editar campanha de mídia;
- não existe endpoint de alterar orçamento;
- spend ingestion é leitura/importação econômica;
- Meta Ads write continua fora de escopo;
- WhatsApp continua obedecendo `WHATSAPP_REAL_SEND_ENABLED`.
