import {
  EmptyState,
  MiniBar,
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getHunterPageData } from "@/lib/ui/operator-data";
import { compact, decimal, money, percent } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

function relationName(value: unknown, fallback: string) {
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string; niche?: string } | undefined;
    return first?.name ?? first?.niche ?? fallback;
  }
  if (value && typeof value === "object") {
    const object = value as { name?: string; niche?: string; product_name?: string };
    return object.name ?? object.product_name ?? object.niche ?? fallback;
  }
  return fallback;
}

export default async function HunterPage() {
  const data = await getHunterPageData();
  const maxRank = Math.max(
    1,
    ...data.ranking.map((row: any) => Number(row.performance_index ?? 0))
  );

  return (
    <main className="page">
      <PageHeader
        eyebrow="DISCOVERY ENGINE"
        title="Hunter"
        description="Estratégias que vasculham ofertas, memória de execução e o que o sistema já aprendeu que tende a devolver mais dinheiro."
        actions={
          <StatusPill state={data.connected ? "good" : "warn"}>
            {data.connected ? "Learning conectado" : "Setup pendente"}
          </StatusPill>
        }
      />

      <section className="content-grid content-grid-wide">
        <Panel title="Prioridade aprendida" eyebrow="STRATEGIES">
          {data.ranking.length === 0 ? (
            <EmptyState
              title="Sem ranking ainda"
              description="O ranking aparece depois que as estratégias forem migradas e começarem a gerar amostra."
            />
          ) : (
            <div className="strategy-list">
              {data.ranking.slice(0, 12).map((row: any, index: number) => (
                <div className="strategy-row" key={row.strategy_id ?? index}>
                  <span className="rank-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="table-main">
                    <strong>{row.name ?? "Estratégia"}</strong>
                    <span>
                      {row.niche ?? "general"} · prioridade {row.priority ?? "—"}
                    </span>
                  </div>
                  <MiniBar
                    value={Number(row.performance_index ?? 0)}
                    max={maxRank}
                  />
                  <div className="strategy-score">
                    <strong>{decimal(row.performance_index ?? 0, 2)}x</strong>
                    <span>{percent(row.sample_confidence ?? 0)} confiança</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Últimas execuções" eyebrow="RUN MEMORY">
          {data.runs.length === 0 ? (
            <EmptyState
              title="Nenhum Hunter executado"
              description="Quando o primeiro ciclo rodar, cada estratégia deixa evidência de páginas, ofertas e erro."
            />
          ) : (
            <div className="compact-stack">
              {data.runs.map((run: any) => (
                <div className="compact-card" key={run.id}>
                  <div>
                    <strong>
                      {relationName(run.hunter_strategies, "Hunter")}
                    </strong>
                    <span>{compact(run.offers_fetched)} ofertas · {compact(run.unique_items)} únicas</span>
                  </div>
                  <StatusPill
                    state={
                      run.status === "success"
                        ? "good"
                        : run.status === "partial"
                          ? "warn"
                          : "danger"
                    }
                  >
                    {run.status}
                  </StatusPill>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel title="Produtos que já provaram valor" eyebrow="LEARNING">
        {data.products.length === 0 ? (
          <EmptyState
            title="Ainda sem histórico econômico"
            description="RPC, CVR e confiança aparecem quando clique e conversão começarem a voltar pelo tracking."
          />
        ) : (
          <div className="data-table">
            <div className="data-table-head">
              <span>Produto</span>
              <span>Cliques</span>
              <span>CVR</span>
              <span>RPC</span>
              <span>Comissão</span>
              <span>Confiança</span>
            </div>
            {data.products.map((row: any) => (
              <div className="data-table-row" key={row.product_id}>
                <strong>
                  {relationName(row.affiliate_products, row.product_id)}
                </strong>
                <span>{compact(row.clicks)}</span>
                <span>{percent(row.smoothed_cvr ?? 0)}</span>
                <span>{money(row.smoothed_rpc ?? 0)}</span>
                <span>{money(row.commission ?? 0)}</span>
                <span>{percent(row.sample_confidence ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </main>
  );
}
