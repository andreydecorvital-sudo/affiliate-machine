import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getAcquisitionPageData } from "@/lib/ui/operator-data";
import { compact, money, percent } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

function campaignMeta(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? {};
  return value && typeof value === "object" ? value : {};
}

export default async function AcquisitionPage() {
  const data = await getAcquisitionPageData();
  const campaigns = data.economics?.campaigns ?? [];
  const groups = data.economics?.groups ?? [];
  const creativePerformance =
    data.creativeLearning?.performance ?? [];
  const creativeMetrics =
    data.creativeLearning?.metrics ?? [];

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

  const confidenceByCreative = new Map(
    creativeMetrics.map((row: any) => [
      row.paid_creative_id,
      Number(row.sample_confidence ?? 0)
    ])
  );

  return (
    <main className="page">
      <PageHeader
        eyebrow="GROWTH ENGINE"
        title="Aquisição"
        description="Do anúncio até a visita roteada e a comissão: campanhas e criativos com separação explícita entre dado exato e resultado modelado."
        actions={
          <StatusPill state={data.meta?.configured ? "good" : "warn"}>
            Meta {data.meta?.configured ? "configurada" : "pendente"}
          </StatusPill>
        }
      />

      <section className="metrics-grid">
        <MetricCard
          label="Spend · 30d"
          value={money(spend)}
          hint="valor exato importado das plataformas"
        />
        <MetricCard
          label="Visitas roteadas"
          value={compact(routed)}
          hint="não significa membro adquirido"
        />
        <MetricCard
          label="Líquido modelado"
          value={money(net)}
          hint="comissão atribuída − spend rateado"
          tone={net >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Criativos Meta"
          value={compact(data.meta?.creatives?.discovered ?? 0)}
          hint={
            String(data.meta?.creatives?.unmapped ?? 0) +
            " sem creativeKey"
          }
        />
      </section>

      <Panel title="Performance por criativo" eyebrow="CREATIVE LEARNING">
        {creativePerformance.length === 0 ? (
          <EmptyState
            title="Ainda sem performance por criativo"
            description="Depois do sync ad-level da Meta e do vínculo campaignKey + creativeKey, o sistema cruza utm_content com visitas roteadas e começa a aprender."
          />
        ) : (
          <div className="data-table">
            <div className="data-table-head acquisition-columns">
              <span>Criativo</span>
              <span>Spend</span>
              <span>Visitas</span>
              <span>Custo/visita</span>
              <span>Líquido modelado</span>
              <span>Confiança</span>
            </div>
            {creativePerformance.slice(0, 30).map((row: any) => (
              <div
                className="data-table-row acquisition-columns"
                key={row.paid_creative_id}
              >
                <strong>
                  {row.ad_name ?? row.creative_key ?? row.external_ad_id}
                </strong>
                <span>{money(row.spend)}</span>
                <span>{compact(row.routed_visits)}</span>
                <span>{money(row.cost_per_routed_visit ?? 0)}</span>
                <span>{money(row.modeled_net_commission ?? 0)}</span>
                <span>
                  {percent(
                    confidenceByCreative.get(row.paid_creative_id) ?? 0
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

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
                <div
                  className="data-table-row acquisition-columns"
                  key={row.campaign_id}
                >
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
                        {row.external_campaign_name ??
                          row.external_campaign_id}
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

      <Panel title="Como ler o dado de criativo" eyebrow="ATTRIBUTION">
        <div className="principle-grid">
          <div>
            <span>01</span>
            <strong>Spend é exato</strong>
            <p>Spend, impressões e cliques vêm do nível de anúncio importado da plataforma.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Visita exige chave</strong>
            <p>O criativo só recebe visita quando campaignKey e utm_content batem com o vínculo explícito.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Comissão é modelada</strong>
            <p>A comissão do grupo é rateada pela participação das visitas do criativo. Não é causalidade individual.</p>
          </div>
        </div>
      </Panel>
    </main>
  );
}
