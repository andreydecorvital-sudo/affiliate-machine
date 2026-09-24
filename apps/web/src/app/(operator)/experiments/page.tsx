import {
  EmptyState,
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getExperimentsPageData } from "@/lib/ui/operator-data";
import { percent } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

function stateFor(status: string) {
  if (status === "running") return "good" as const;
  if (status === "draft") return "muted" as const;
  if (status === "paused") return "warn" as const;
  return "muted" as const;
}

export default async function ExperimentsPage() {
  const data = await getExperimentsPageData();

  return (
    <main className="page">
      <PageHeader
        eyebrow="CONTROLLED LEARNING"
        title="Experimentos"
        description="Copy, timing e alocação com baseline/treatment, sem winner automático e sem misturar causas."
        actions={
          <StatusPill state="muted">Auto winner OFF</StatusPill>
        }
      />

      <section className="content-grid">
        <Panel title="Copy de mensagem" eyebrow="MESSAGE COPY">
          {data.copy.length === 0 ? (
            <EmptyState
              title="Nenhum experimento de copy"
              description="Crie apenas quando houver volume para atingir amostra mínima por variante."
            />
          ) : (
            <div className="compact-stack">
              {data.copy.map((row: any) => (
                <div className="experiment-card" key={row.id}>
                  <div className="experiment-head">
                    <div>
                      <strong>{row.name}</strong>
                      <span>{row.niche ?? "global"} · {row.objective}</span>
                    </div>
                    <StatusPill state={stateFor(row.status)}>
                      {row.status}
                    </StatusPill>
                  </div>
                  <div className="experiment-meta">
                    <span>mín. {row.min_clicks_per_variant} cliques/variante</span>
                    <span>{row.kind}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Timing e grupos" eyebrow="DISTRIBUTION">
          {data.distribution.length === 0 ? (
            <EmptyState
              title="Nenhum experimento de distribuição"
              description="O baseline continua imediato/all-groups até um experimento ser criado e ativado."
            />
          ) : (
            <div className="compact-stack">
              {data.distribution.map((row: any) => (
                <div className="experiment-card" key={row.id}>
                  <div className="experiment-head">
                    <div>
                      <strong>{row.name}</strong>
                      <span>{row.niche ?? "global"} · {row.kind}</span>
                    </div>
                    <StatusPill state={stateFor(row.status)}>
                      {row.status}
                    </StatusPill>
                  </div>
                  <div className="experiment-meta">
                    <span>{percent(row.treatment_share ?? 0)} treatment</span>
                    <span>mín. {row.min_posts_per_arm} posts/braço</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel title="Regra de leitura" eyebrow="GUARDRAIL">
        <div className="principle-grid">
          <div>
            <span>01</span>
            <strong>Uma causa por vez</strong>
            <p>Copy, timing e group allocation não rodam sobrepostos no mesmo escopo.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Amostra antes da decisão</strong>
            <p>Nenhum braço vira vencedor antes de todos atingirem sample-ready.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Dinheiro como métrica</strong>
            <p>Comissão por post é o sinal principal. Clique sozinho não paga a conta.</p>
          </div>
        </div>
      </Panel>
    </main>
  );
}
