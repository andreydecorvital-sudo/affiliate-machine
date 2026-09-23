import { getFeatureGates } from "@/lib/feature-gates";
import { getServerEnv, getSupabaseServerKey } from "@/lib/env";
import { isGeminiConfigured } from "@/lib/gemini";

const modules = [
  ["Foundation", "BUILDING"],
  ["Shopee Affiliate", "PLANNED"],
  ["Offer Intelligence", "PLANNED"],
  ["WhatsApp Distribution", "PLANNED"],
  ["Attribution", "PLANNED"],
  ["Acquisition Router", "PLANNED"]
] as const;

export default function Home() {
  const env = getServerEnv();
  const gates = getFeatureGates();
  const supabaseConfigured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseServerKey(env));

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <span className="eyebrow">AFFILIATE MACHINE · FOUNDATION</span>
          <h1>Controle central da máquina de aquisição e afiliados.</h1>
          <p>
            Vercel para experiência e execução. Supabase para estado, filas, cron e dados.
            Gemini como IA principal — sem ser ponto único de falha.
          </p>
        </div>
        <div className="heroStatus">
          <span className="dot" />
          Foundation em construção
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <span className="label">SUPABASE</span>
          <strong>{supabaseConfigured ? "Configurado" : "Aguardando credenciais"}</strong>
          <small>Postgres · Queues · Cron · Storage · Auth</small>
        </article>
        <article className="card">
          <span className="label">GEMINI</span>
          <strong>{isGeminiConfigured() ? "Configurado" : "Aguardando API key"}</strong>
          <small>Provider principal de IA, com degradação segura.</small>
        </article>
        <article className="card">
          <span className="label">AUTOPILOT</span>
          <strong>{gates.autopilot ? "ON" : "OFF"}</strong>
          <small>Deve permanecer OFF durante a fundação.</small>
        </article>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">PROJECT BRAIN</span>
            <h2>Capacidades</h2>
          </div>
          <a href="/api/health">/api/health</a>
        </div>
        <div className="rows">
          {modules.map(([name, state]) => (
            <div className="row" key={name}>
              <span>{name}</span>
              <b data-state={state}>{state}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
