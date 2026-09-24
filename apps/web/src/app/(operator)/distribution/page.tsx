import {
  EmptyState,
  MetricCard,
  MiniBar,
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getDistributionPageData } from "@/lib/ui/operator-data";
import { compact, money, percent } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

function groupMeta(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? {};
  return value && typeof value === "object" ? value : {};
}

export default async function DistributionPage() {
  const data = await getDistributionPageData();
  const quota = data.quota as any;
  const topTiming = [...data.timing]
    .sort(
      (a: any, b: any) =>
        Number(b.smoothed_commission_per_delivery ?? 0) -
        Number(a.smoothed_commission_per_delivery ?? 0)
    )
    .slice(0, 12);
  const maxTiming = Math.max(
    1,
    ...topTiming.map((row: any) =>
      Number(row.smoothed_commission_per_delivery ?? 0)
    )
  );

  return (
    <main className="page">
      <PageHeader
        eyebrow="DELIVERY ENGINE"
        title="Distribuição"
        description="Capacidade de envio, grupos, aprendizado de horário e a camada que impede a máquina de virar spam."
        actions={
          <StatusPill state={data.connected ? "good" : "warn"}>
            {data.connected ? "Gates ativos" : "Setup pendente"}
          </StatusPill>
        }
      />

      <section className="metrics-grid">
        <MetricCard
          label="Enviados hoje"
          value={compact(quota?.sent_today ?? 0)}
          hint={`limite atual: ${quota?.daily_limit ?? 35}/dia`}
        />
        <MetricCard
          label="Hora atual"
          value={compact(quota?.sent_current_hour ?? 0)}
          hint={`limite atual: ${quota?.hourly_limit ?? 3}/hora`}
        />
        <MetricCard
          label="Grupos com histórico"
          value={compact(data.groups.length)}
          hint="performance rastreada por group_id"
        />
        <MetricCard
          label="Pode enviar agora"
          value={quota?.allowed ? "SIM" : "NÃO"}
          hint="quota + schedule + safety gates"
          tone={quota?.allowed ? "positive" : "warning"}
        />
      </section>

      <section className="content-grid">
        <Panel title="Melhores janelas observadas" eyebrow="TIMING">
          {topTiming.length === 0 ? (
            <EmptyState
              title="Sem janela aprendida"
              description="O sistema só passa a recomendar horário quando existe amostra suficiente por nicho e hora."
            />
          ) : (
            <div className="table-list">
              {topTiming.map((row: any) => (
                <div
                  className="table-row"
                  key={`${row.niche}-${row.local_hour}`}
                >
                  <div className="table-main">
                    <strong>
                      {String(row.local_hour).padStart(2, "0")}:00
                    </strong>
                    <span>{row.niche}</span>
                  </div>
                  <MiniBar
                    value={Number(
                      row.smoothed_commission_per_delivery ?? 0
                    )}
                    max={maxTiming}
                  />
                  <div className="strategy-score">
                    <strong>
                      {money(row.smoothed_commission_per_delivery ?? 0)}
                    </strong>
                    <span>{percent(row.sample_confidence ?? 0)} conf.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Performance por grupo" eyebrow="ALLOCATION">
          {data.groups.length === 0 ? (
            <EmptyState
              title="Sem grupos avaliados"
              description="Quando deliveries reais voltarem, o motor separa exploitation de exploration."
            />
          ) : (
            <div className="compact-stack">
              {data.groups.slice(0, 10).map((row: any) => {
                const meta = groupMeta(row.whatsapp_groups) as any;
                return (
                  <div className="compact-card" key={row.group_id}>
                    <div>
                      <strong>{meta.name ?? row.group_id}</strong>
                      <span>
                        {meta.niche ?? "general"} · {compact(row.successful_deliveries)} envios
                      </span>
                    </div>
                    <div className="strategy-score">
                      <strong>
                        {money(row.smoothed_commission_per_delivery ?? 0)}
                      </strong>
                      <span>{percent(row.sample_confidence ?? 0)} conf.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </section>
    </main>
  );
}
