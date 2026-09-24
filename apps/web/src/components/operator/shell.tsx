import type { ReactNode } from "react";
import Link from "next/link";
import { OperatorNav } from "@/components/operator/nav";

type Readiness = {
  supabase: boolean;
  shopee: boolean;
  gemini: boolean;
  meta: boolean;
  whatsapp: boolean;
  autopilot: boolean;
  metaWrite: boolean;
};

export function OperatorShell({
  children,
  readiness
}: {
  children: ReactNode;
  readiness: Readiness;
}) {
  const liveSignals = [
    readiness.supabase,
    readiness.shopee,
    readiness.gemini,
    readiness.meta
  ].filter(Boolean).length;

  return (
    <div className="operator-layout">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">A</span>
          <span className="brand-copy">
            <strong>Affiliate Machine</strong>
            <small>Money Operating System</small>
          </span>
        </Link>

        <OperatorNav />

        <div className="sidebar-footer">
          <div className="system-pulse">
            <span className="pulse-dot" data-online={readiness.supabase} />
            <div>
              <strong>
                {readiness.supabase ? "Backend conectado" : "Setup pendente"}
              </strong>
              <small>{liveSignals}/4 integrações-base prontas</small>
            </div>
          </div>
          <div className="safety-strip">
            <span>Ads write</span>
            <b>{readiness.metaWrite ? "ON" : "OFF"}</b>
          </div>
          <div className="safety-strip">
            <span>WhatsApp real</span>
            <b>{readiness.whatsapp ? "ON" : "OFF"}</b>
          </div>
        </div>
      </aside>

      <div className="operator-main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-kicker">OPERAÇÃO</span>
            <strong>Foco: comissão líquida e escala controlada</strong>
          </div>
          <div className="topbar-actions">
            <Link href="/system" className="ghost-button">
              Ver arquitetura
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="ghost-button" type="submit">
                Sair
              </button>
            </form>
            <span className="environment-pill">
              <i />
              Privado
            </span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
