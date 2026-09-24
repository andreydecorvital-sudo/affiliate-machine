import {
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getReadiness } from "@/lib/ui/operator-data";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const readiness = getReadiness();

  const items = [
    ["Supabase", readiness.supabase, "NEXT_PUBLIC_SUPABASE_URL + server key"],
    ["Shopee Affiliate", readiness.shopee, "APP_ID + SECRET"],
    ["Gemini", readiness.gemini, "GEMINI_API_KEY"],
    ["Meta Ads read-only", readiness.meta, "token + account + Graph version"],
    ["WhatsApp real-send", readiness.whatsapp, "WHATSAPP_REAL_SEND_ENABLED"],
    ["Autopilot", readiness.autopilot, "AUTOPILOT_ENABLED"],
    ["Meta Ads write", readiness.metaWrite, "deve continuar OFF"]
  ] as const;

  return (
    <main className="page">
      <PageHeader
        eyebrow="CONTROL PLANE"
        title="Configurações"
        description="Readiness técnico e safety gates. Segredos ficam no ambiente Vercel, nunca nesta tela."
        actions={
          <StatusPill state="good">Secrets ocultos</StatusPill>
        }
      />

      <section className="content-grid content-grid-wide">
        <Panel title="Integrações e variáveis" eyebrow="ENV">
          <div className="settings-list">
            {items.map(([label, ready, detail]) => (
              <div className="settings-row" key={label}>
                <div>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </div>
                <StatusPill
                  state={
                    label === "Meta Ads write"
                      ? ready
                        ? "danger"
                        : "good"
                      : ready
                        ? "good"
                        : "muted"
                  }
                >
                  {label === "Meta Ads write"
                    ? ready
                      ? "ON"
                      : "OFF seguro"
                    : ready
                      ? "Configurado"
                      : "Pendente"}
                </StatusPill>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Próximo gate de produção" eyebrow="CANARY">
          <div className="checklist">
            <div data-done={readiness.supabase}>
              <i /> Supabase dedicado + migrations
            </div>
            <div data-done={readiness.shopee}>
              <i /> Credenciais Shopee Affiliate
            </div>
            <div data-done={readiness.gemini}>
              <i /> Gemini configurado
            </div>
            <div data-done={false}>
              <i /> 1 grupo de teste explicitamente ativado
            </div>
            <div data-done={false}>
              <i /> 1 ciclo controlado ponta a ponta
            </div>
            <div data-done={false}>
              <i /> Conferência de clique → conversão → comissão
            </div>
          </div>
        </Panel>
      </section>
    </main>
  );
}
