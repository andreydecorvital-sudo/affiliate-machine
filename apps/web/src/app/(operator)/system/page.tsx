import {
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getSystemPageData } from "@/lib/ui/operator-data";
import { compact } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

const pipeline = [
  ["01", "Hunter", "Descobre e versiona ofertas"],
  ["02", "Score", "Filtra margem, demanda e aprendizado"],
  ["03", "Materialização", "Cria link, post e destinos"],
  ["04", "Distribuição", "Quota, timing, grupo e retry"],
  ["05", "Tracking", "Clique e attribution key"],
  ["06", "Conversão", "Pedido e comissão retornam"],
  ["07", "Learning", "RPC/CVR/comissão voltam ao motor"],
  ["08", "Aquisição", "Spend e CAC fecham a conta"]
] as const;

export default async function SystemPage() {
  const data = await getSystemPageData();
  const counts = data.counts as Record<string, number>;

  return (
    <main className="page">
      <PageHeader
        eyebrow="PROJECT MAP"
        title="Sistema"
        description="O mapa mental da máquina: vínculos, fluxo econômico, banco e integrações sem depender da memória do chat."
        actions={
          <StatusPill state={data.connected ? "good" : "warn"}>
            {data.connected ? "Banco conectado" : "Banco pendente"}
          </StatusPill>
        }
      />

      <Panel title="Fluxo canônico" eyebrow="ARCHITECTURE">
        <div className="architecture-flow">
          {pipeline.map(([number, title, description]) => (
            <div className="architecture-node" key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <section className="content-grid">
        <Panel title="Banco de dados" eyebrow="SUPABASE">
          <div className="database-grid">
            {[
              ["affiliate_products", "Produtos"],
              ["offer_snapshots", "Snapshots"],
              ["offer_scores", "Scores"],
              ["hunter_strategies", "Estratégias"],
              ["posts", "Posts"],
              ["post_deliveries", "Deliveries"],
              ["whatsapp_groups", "Grupos"],
              ["click_events", "Cliques"],
              ["conversions", "Conversões"],
              ["commission_ledger", "Comissões"],
              ["paid_traffic_spend", "Spend"],
              ["experiments", "Experimentos"]
            ].map(([table, label]) => (
              <div className="database-card" key={table}>
                <span>{label}</span>
                <strong>{compact(counts[table] ?? 0)}</strong>
                <small>{table}</small>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Integrações" eyebrow="CONNECTIONS">
          <div className="readiness-list">
            {[
              ["Supabase", data.readiness.supabase, "Banco, state e RPCs"],
              ["Shopee Affiliate", data.readiness.shopee, "Oferta + conversão"],
              ["Gemini", data.readiness.gemini, "IA principal"],
              ["Meta Ads", data.readiness.meta, "Spend read-only"],
              ["WhatsApp", data.readiness.whatsapp, "Envio real"]
            ].map(([label, ready, description]) => (
              <div className="integration-row" key={String(label)}>
                <div>
                  <strong>{String(label)}</strong>
                  <span>{String(description)}</span>
                </div>
                <StatusPill state={ready ? "good" : "muted"}>
                  {ready ? "Conectada" : "Pendente"}
                </StatusPill>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Eventos recentes" eyebrow="AUDIT TRAIL">
        {data.recentEvents.length === 0 ? (
          <div className="empty-inline">
            Eventos operacionais aparecem aqui depois do primeiro canário real.
          </div>
        ) : (
          <div className="event-list">
            {data.recentEvents.map((event: any) => (
              <div className="event-row" key={event.id}>
                <span>{event.event_type}</span>
                <strong>{event.source}</strong>
                <small>{event.entity_type ?? "system"}</small>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </main>
  );
}
