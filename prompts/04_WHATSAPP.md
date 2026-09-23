# Chat 4 — WHATSAPP MULTI-SESSION / GROUPS

Branch: `feat/whatsapp-multisession`
Dependência: Foundation.

Escopo EXCLUSIVO:
- adapter WhatsApp;
- implementação Baileys;
- múltiplas contas/sessões;
- QR pairing;
- persistência segura do auth bundle;
- listagem e sync de grupos;
- texto + imagem/caption;
- health/reconnect;
- ACK quando disponível;
- runtime persistente em `apps/whatsapp-worker`.

Use como referência o bridge da Argoplace, mas remova acoplamentos de coleta/empresa/app_state.

Modelo:
- whatsapp_accounts
- whatsapp_groups
- session health

Segurança:
`WHATSAPP_REAL_SEND_ENABLED=0` por padrão.
Sem envio real em testes automáticos.

DoD:
- N sessões independentes;
- grupos sincronizados por conta;
- envio fake/fixture testado;
- reconnect sem duplicar sessão;
- auth nunca aparece em logs;
- Project Brain atualizado.
