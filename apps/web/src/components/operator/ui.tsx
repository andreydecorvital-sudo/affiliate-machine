import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <span className="page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <article className="metric-card" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

export function Panel({
  title,
  eyebrow,
  children,
  action
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel-card">
      <div className="panel-title-row">
        <div>
          {eyebrow ? <span className="panel-eyebrow">{eyebrow}</span> : null}
          <h2>{title}</h2>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StatusPill({
  state,
  children
}: {
  state: "good" | "warn" | "muted" | "danger";
  children: ReactNode;
}) {
  return (
    <span className="status-pill" data-state={state}>
      <i />
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-orbit">
        <span />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function MiniBar({
  value,
  max = 100
}: {
  value: number;
  max?: number;
}) {
  const width = Math.max(3, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <span className="mini-bar" aria-label={`${value}`}>
      <i style={{ width: `${width}%` }} />
    </span>
  );
}
