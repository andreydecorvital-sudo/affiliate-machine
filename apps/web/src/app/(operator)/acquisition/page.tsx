import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getAcquisitionPageData } from "@/lib/ui/operator-data";
import { compact, money } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

function campaignMeta(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? {};
  return value && typeof value === "object" ? value : {};
}

export default async function AcquisitionPage() {
  const data = await getAcquisitionPageData();
  const campaigns = data.economics?.campaigns ?? [];
  const groups = data.economics?.groups ?? [];
  const spend = campaigns.reduce(
    (sum: number, row: any) => sum + Number(row.spend ?? 0),
    0
  );
  const routed = campaigns.reduce(
    (sum: number, row: any) => sum + Number(row.routed_visits ?? 0),
    0
  );
  const net = groups.reduce(
    (sum: number, row: any) =>
      sum + Number(row.modeled_net_commission ?? 0),
    0
  );

  return (
    <main className="page">
      <PageHeader
        eyebrow="GROWTH ENGINE"
        title="Aquisição"
        description="Do anúncio pago até a visita roteada e a comissão atribuída — separando dado exato do que é modelado."
        actions={
          <StatusPill state={data.meta?.configured ? "good" : "warn"}>
            Meta {data.meta?.configured ? "configurada" : "pendente"}
          </StatusPill>
        }
      />

      <section className="metrics-grid">
        <MetricCard label="Spend · 30d" value={money(spend)} hint="valor importado das plataformas" />
        <MetricCard label="Visitas roteadas" value={compact(routed)} hint="não significa membro adquirido" />
        <MetricCard label="Líquido modelado" value={money(net)} hint="comissão atribuída − spend rateado" tone={net >= 0 ? "positive" : "warning"} />
        <MetricCard
          label="Campanhas Meta"
          value={compact(data.meta?.campaigns?.discovered ?? 0)}
          hint={`${data.meta?.campaigns?.unmapped ?? 0} ainda sem campaignKey`}
        />
      </section>

      <section className="content-grid content-grid-wide">
        <Panel title="Campanhas pagas" eyebrow="EXACT">
          {campaigns.length === 0 ? (
            <EmptyState
              title="Nenhum spend importado"
              description="Assim que Meta Ads estiver configurada e sincronizada, spend, impressões e visitas aparecem aqui."
            />
          ) : (
            <div className="data-table">
              <div className="data-table-head acquisition-columns">
                <span>Campanha</span>
                <span>Spend</span>
                <span>Cliques</span>
                <span>Visitas</span>
                <span>Custo/visita</span>
                <span>Origem</span>
              </div>
              {campaigns.map((row: any) => (
                <div className="data-table-row acquisition-columns" key={row.campaign_id}>
                  <strong>{row.utm_campaign ?? row.campaign_key}</strong>
                  <span>{money(row.spend)}</span>
                  <span>{compact(row.platform_clicks)}</span>
                  <span>{compact(row.routed_visits)}</span>
                  <span>{money(row.cost_per_routed_visit)}</span>
                  <span>{row.utm_source ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Vínculos Meta → campanha" eyebrow="MAPPING">
          {data.campaigns.length === 0 ? (
            <EmptyState
              title="Sem campanhas descobertas"
              description="O sistema nunca tenta mapear uma campanha pelo nome. O vínculo aparece aqui depois do primeiro sync Meta."
            />
          ) : (
            <div className="compact-stack">
              {data.campaigns.slice(0, 12).map((row: any) => {
                const linked = campaignMeta(row.traffic_campaigns) as any;
                return (
                  <div className="compact-card" key={row.id}>
                    <div>
                      <strong>
                        {row.external_campaign_name ?? row.external_campaign_id}
                      </strong>
                      <span>{linked.campaign_key ?? "unmapped"}</span>
                    </div>
                    <StatusPill state={row.campaign_id ? "good" : "warn"}>
                      {row.campaign_id ? "Mapeada" : "Mapear"}
                    </StatusPill>
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
