# Chat 5 — POSTS / DELIVERIES / SCHEDULER

Branch: `feat/distribution-engine`
Dependências: Foundation + WhatsApp + Intelligence contracts.

Escopo:
- posts lógicos;
- post_deliveries;
- scheduling com pg-boss;
- fan-out por grupo/nicho;
- retry por delivery;
- idempotência;
- limites por janela/horário;
- kill switches;
- cooldown de grupo;
- revalidation hook imediatamente antes do send.

Regra mais importante:
POST != DELIVERY.
Nunca marque o post inteiro como concluído só porque um grupo recebeu.

Cadência inicial configurável:
- até ~35 produtos/dia globalmente;
- até 3 oportunidades/hora;
- janelas diurnas configuráveis;
- zero obrigação de preencher cota.

DoD:
- falha em 1 grupo não duplica os demais;
- retry recupera apenas delivery pendente;
- dedupe comprovado por teste concorrente;
- Project Brain atualizado.
