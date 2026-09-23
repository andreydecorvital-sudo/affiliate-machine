# Timing + Group Allocation Experiments

## Objetivo

Aprender quando publicar e em quais grupos distribuir cada oferta sem substituir o comportamento atual por uma heurística não validada.

O desenho é sempre:

`baseline vs treatment`

Baseline:
- timing: envio sem atraso adicional;
- group allocation: todos os grupos elegíveis.

Treatment:
- timing: usa janelas aprendidas por nicho;
- group allocation: usa subset com exploração controlada.

## Métricas aprendidas

### Timing

Por nicho + hora local `America/Sao_Paulo`:

- deliveries enviados;
- cliques não-bot;
- conversões atribuídas;
- comissão;
- comissão por delivery;
- comissão por delivery suavizada;
- RPC;
- confiança de amostra.

Não existe CTR porque não existe impressão/leitura confiável de grupo.

### Grupos

Por grupo:

- deliveries;
- cliques;
- conversões;
- comissão;
- comissão por delivery;
- comissão por delivery suavizada;
- RPC;
- confiança da amostra.

## Timing treatment

Config:

- `maxDelayHours` — máximo de 0 a 24h;
- `minConfidence` — confiança mínima da janela histórica.

O treatment procura, dentro do horizonte permitido, a hora com maior comissão por delivery suavizada e confiança suficiente.

Se não houver amostra confiável, o horário permanece imediato.

O delay é salvo em `post_deliveries.eligible_after`; retries não perdem a janela escolhida.

## Group allocation treatment

Config:

- `maxGroups`;
- `explorationGroups`;
- `minConfidence`.

Os melhores grupos ocupam os slots de exploitation quando há amostra suficiente.
Slots restantes são preenchidos por exploração determinística baseada em `post x group`, evitando starvation de grupos sem histórico.

Baseline continua entregando para todos os grupos elegíveis.

## Experimentos limpos

A coorte é determinística por post.

Um mesmo post mantém o mesmo braço do experimento.

Não é permitido iniciar experimentos sobrepostos no mesmo escopo:
- message-copy;
- timing;
- group-allocation.

Isso evita atribuir a melhora ao horário quando a causa real foi copy ou seleção de grupo.

## Métrica principal

A comparação principal é:

`commission_per_post`

Diagnósticos:
- commission_per_delivery;
- RPC;
- clicks;
- conversions.

Nenhum winner é promovido automaticamente.

Somente compare braços quando ambos retornarem `sample_ready=true`.

## APIs internas

### Refresh de aprendizado

`POST /api/internal/distribution/learning/refresh`

### Status

`GET /api/internal/distribution/learning/status`

### Experimentos

`GET /api/internal/distribution/experiments`

`POST /api/internal/distribution/experiments`

### Estado

`POST /api/internal/distribution/experiments/{id}/status`

### Performance

`GET /api/internal/distribution/experiments/{id}/performance`

## Segurança

Todos os experimentos nascem `draft`.

A migration sozinha não muda a distribuição.

Sem experimento `running`, o sistema preserva o comportamento baseline.

Os gates existentes continuam valendo:
- `WHATSAPP_REAL_SEND_ENABLED`;
- quota diária;
- quota horária;
- revalidação pré-envio;
- retries/idempotência.
