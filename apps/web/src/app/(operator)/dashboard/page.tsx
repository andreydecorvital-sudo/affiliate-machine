import {
  EmptyState,
  MetricCard,
  MiniBar,
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getDashboardData } from "@/lib/ui/operator-data";
import { compact, money } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const summary = data.money?.summary;
  const paidCampaigns = data.money?.paidTraffic?.campaigns ?? [];
  const spend = paidCampaigns.reduce(
    (total: number, row: { spend?: number | string | null }) =>
      total + Number(row.spend ?? 0),
    0
  );
  const commission = Number(summary?.commission_total ?? 0);
  const net = commission - spend;
  const groups = (data.money?.groups ?? []).slice(0, 6);
  const maxCommission = Math.max(
    1,
    ...groups.map((row: { commission?: number | string | null }) =>
      Number(row.commission ?? 0)
    )
  );

  return (
    <main className="page">
      <PageHeader
        eyebrow="MONEY CONTROL"
        title="Visão geral"
        description="Uma leitura única do que a máquina encontrou, distribuiu, converteu e devolveu em comissão."
        actions={
          <StatusPill state={data.connected ? "good" : "warn"}>
            {data.connected ? "Dados reais" : "Aguardando Supabase"}
          </StatusPill>
        }
      />

      <section className="metrics-grid">
        <MetricCard
          label="Comissão · 30d"
          value={money(commission)}
          hint={`${compact(summary?.conversions ?? 0)} conversões observadas`}
          tone="positive"
        />
        <MetricCard
          label="Gasto pago · 30d"
          value={money(spend)}
          hint={`${paidCampaigns.length} campanhas com dados`}
        />
        <MetricCard
          label="Líquido observado"
          value={money(net)}
          hint="Comissão menos spend importado"
          tone={net >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="EPC"
          value={money(summary?.epc ?? 0)}
          hint={`${compact(summary?.clicks ?? 0)} cliques não-bot`}
        />
      </section>

      <section className="content-grid content-grid-wide">
        <Panel title="Motor de dinheiro" eyebrow="PIPELINE">
          <div className="flow-line">
            {[
              ["Ofertas", data.counters.offers],
              ["Posts", data.counters.posts],
              ["Cliques", Number(summary?.clicks ?? 0)],
              ["Conversões", Number(summary?.conversions ?? 0)],
              ["Grupos", data.counters.groups]
            ].map(([label, value], index) => (
              <div className="flow-step" key={String(label)}>
                <span>{String(label)}</span>
                <strong>{compact(value)}</strong>
                {index < 4 ? <i>→</i> : null}
              </div>
            ))}
          </div>

          <div className="signal-grid">
            <div>
              <span>Hunter ativo</span>
              <strong>{data.counters.strategies} estratégias</strong>
            </div>
            <div>
              <span>Atribuição</span>
              <strong>
                {Number(data.money?.attribution?.attributionRate ?? 0).toFixed(1)}%
              </strong>
            </div>
            <div>
              <span>Meta Ads</span>
              <strong>
                {data.meta?.configured ? "Configurado" : "Pendente"}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel title="Estado operacional" eyebrow="READINESS">
          <div className="readiness-list">
            {[
              ["Supabase", data.readiness.supabase],
              ["Shopee Affiliate", data.readiness.shopee],
              ["Gemini", data.readiness.gemini],
              ["Meta Ads read-only", data.readiness.meta],
              ["WhatsApp real-send", data.readiness.whatsapp]
            ].map(([label, ready]) => (
              <div className="readiness-row" key={String(label)}>
                <span>{String(label)}</span>
                <StatusPill state={ready ? "good" : "muted"}>
                  {ready ? "Pronto" : "Pendente"}
                </StatusPill>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="content-grid">
        <Panel title="Grupos que mais devolveram comissão" eyebrow="DISTRIBUIÇÃO">
          {!data.connected || groups.length === 0 ? (
            <EmptyState
              title="Ainda sem amostra de grupo"
              description="Quando os primeiros deliveries forem atribuídos, este ranking passa a mostrar comissão, cliques e EPC por grupo."
            />
          ) : (
            <div className="table-list">
              {groups.map((row: any) => (
                <div className="table-row" key={row.group_id}>
                  <div className="table-main">
                    <strong>{row.group_name}</strong>
                    <span>{row.niche} · {compact(row.clicks)} cliques</span>
                  </div>
                  <MiniBar
                    value={Number(row.commission ?? 0)}
                    max={maxCommission}
                  />
                  <strong className="table-value">
                    {money(row.commission)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Pontos que ainda impedem escala" eyebrow="GATES">
          <div className="issue-stack">
            {!data.readiness.supabase ? (
              <div className="issue-card">
                <StatusPill state="warn">Infra</StatusPill>
                <strong>Supabase dedicado ainda não está ligado.</strong>
                <p>Sem ele a interface fica em modo estrutural e não lê as migrations do Money Engine.</p>
              </div>
            ) : null}
            {!data.readiness.shopee ? (
              <div className="issue-card">
                <StatusPill state="warn">Receita</StatusPill>
                <strong>Credenciais Shopee Affiliate pendentes.</strong>
                <p>O Hunter não consegue virar comissão real sem o provider.</p>
              </div>
            ) : null}
            {!data.readiness.whatsapp ? (
              <div className="issue-card">
                <StatusPill state="muted">Safety</StatusPill>
                <strong>WhatsApp real continua OFF.</strong>
                <p>Correto para esta fase: primeiro conectamos infraestrutura e fazemos um canário.</p>
              </div>
            ) : null}
            {data.errors.slice(0, 2).map((error) => (
              <div className="issue-card" key={error}>
                <StatusPill state="danger">Backend</StatusPill>
                <strong>Leitura parcial indisponível.</strong>
                <p>{error}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
