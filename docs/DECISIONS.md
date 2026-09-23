# Decisões atuais

## D-001 — Projeto independente
Não é módulo da Argoplace. Pode reaproveitar padrões e trechos desacoplados.

## D-002 — PostgreSQL como infraestrutura central
Evitar Redis/Kafka/RabbitMQ no MVP.

## D-003 — pg-boss para jobs
Evita manter fila caseira e permanece no PostgreSQL.

## D-004 — Baileys atrás de adapter
Permite operar grupos agora sem acoplar o domínio a uma implementação específica.

## D-005 — Shopee primeiro
É o caminho mais curto para fechar oferta → link → conversão → comissão.

## D-006 — Frontend e Platform Admin desde o desenho inicial
Não esperar o backend crescer para depois inventar observabilidade/admin.

## D-007 — Project Brain é parte do produto interno
Mapa de capacidades/dependências/status deve acompanhar o código.

## D-008 — Medição financeira é core
CAC/LTV/commission attribution entram antes de expansão para múltiplos providers.
