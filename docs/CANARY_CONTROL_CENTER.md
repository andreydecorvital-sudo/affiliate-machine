# Canary Readiness + Control Center

## Objetivo

Evitar que o Affiliate Machine entre em operação real com integração crítica quebrada.

O Control Center funciona como gate operacional.

## Estados

- ready: requisito atendido;
- blocked: impede dry-run ou canário real;
- warning: merece atenção, mas não bloqueia sozinho;
- optional: não é necessário para o primeiro canário.

## Dry-run

Dry-run não envia mensagem real.

Requisitos críticos:
- Supabase + RPCs;
- INTERNAL_JOB_SECRET;
- Shopee Affiliate;
- Gemini;
- Autopilot OFF;
- Meta Ads write OFF.

## Canário real

Além do dry-run:
- NEXT_PUBLIC_APP_URL;
- pelo menos uma conta WhatsApp conectada;
- pelo menos um grupo ativo com accepting_traffic=true.

WhatsApp real-send permanece um gate separado.

O readiness não liga esse gate automaticamente.

## Probes read-only

Endpoint:
`POST /api/internal/control-center/probe`

Targets:
- supabase;
- shopee;
- meta;
- whatsapp.

Todos os probes são read-only.

## Readiness API

`GET /api/internal/control-center/readiness`

Retorna:
- checks;
- blockers;
- safety gates;
- estado de grupos;
- estado de contas;
- dryRunReady;
- realCanaryPrerequisitesReady.

## Regra de segurança

Nenhum probe:
- ativa WhatsApp;
- ativa Autopilot;
- edita Ads;
- altera orçamento;
- cria campanha.

O primeiro envio real deve continuar limitado a:
- uma conta;
- um grupo;
- uma oferta;
- uma janela controlada.

## Separação

Este Control Center é exclusivo do Affiliate Machine e não altera Argoplace, seus planos, bancos ou integrações.
