# Chat 8 — OPERATIONAL FRONTEND ZERO

Branch: `feat/frontend-zero-core`
Dependências: APIs das fases anteriores disponíveis.

Escopo EXCLUSIVO da experiência operacional:
- shell/navigation;
- dashboard;
- hunter;
- conteúdo;
- grupos;
- publicações;
- analytics;
- configurações.

Diretriz visual:
Reaproveitar a linguagem e disciplina do Frontend Zero da Argoplace, NÃO copiar código acoplado a marketplace seller/fiscal.

Dados reais por padrão. Modo visual/demo, se existir, deve ser explicitamente separado.

Requisitos UX:
- status claros;
- erros acionáveis;
- mostrar score breakdown;
- mostrar post lógico separado de deliveries;
- filtros por nicho/provider/grupo/período;
- kill switch acessível mas protegido;
- responsivo desktop-first.

Não implementar Platform Admin nesta branch.

DoD:
- navegação completa das superfícies;
- estados loading/empty/error/real;
- APIs reais conectadas;
- sem mocks em modo real;
- Project Brain atualizado.
