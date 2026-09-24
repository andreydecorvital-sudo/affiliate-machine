"use client";

import { useState } from "react";

type DryRunResponse = {
  ok: boolean;
  status: string;
  reason?: string | null;
  pipelineDelta?: {
    hunterRuns: number;
    products: number;
    offers: number;
    scores: number;
    posts: number;
    deliveries: number;
  };
  safety?: {
    outboundArtifactDelta?: boolean;
  };
  steps?: Array<{
    name: string;
    status: string;
    detail: string;
  }>;
};

export function ControlCenterDryRun() {
  const [running, setRunning] = useState<"probe" | "pipeline" | null>(null);
  const [result, setResult] = useState<DryRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function execute(mode: "probe" | "pipeline") {
    setRunning(mode);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/operator/control-center/dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ mode })
      });

      const body = (await response.json()) as DryRunResponse & {
        error?: string;
      };

      if (!response.ok && !body.status) {
        throw new Error(body.error || "dry_run_failed");
      }

      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(null);
    }
  }

  const delta = result?.pipelineDelta;

  return (
    <div className="dry-run-console">
      <div className="dry-run-actions">
        <button
          type="button"
          className="operator-button"
          disabled={running !== null}
          onClick={() => execute("probe")}
        >
          {running === "probe" ? "Testando..." : "Rodar probe"}
        </button>
        <button
          type="button"
          className="operator-button operator-button-primary"
          disabled={running !== null}
          onClick={() => execute("pipeline")}
        >
          {running === "pipeline" ? "Executando..." : "Rodar dry-run"}
        </button>
      </div>

      <p className="dry-run-note">
        Probe só consulta integrações. Dry-run executa Hunter + score e termina
        antes de criar posts, deliveries, Ads ou qualquer envio WhatsApp.
      </p>

      {error ? (
        <div className="dry-run-result" data-state="danger">
          <strong>Falha ao executar</strong>
          <span>{error}</span>
        </div>
      ) : null}

      {result ? (
        <div
          className="dry-run-result"
          data-state={result.ok ? "good" : "warn"}
        >
          <div className="dry-run-result-head">
            <strong>{result.ok ? "Execução concluída" : "Execução bloqueada"}</strong>
            <span>{result.status}</span>
          </div>

          {delta ? (
            <div className="dry-run-delta">
              <span>Runs <b>+{delta.hunterRuns}</b></span>
              <span>Produtos <b>+{delta.products}</b></span>
              <span>Ofertas <b>+{delta.offers}</b></span>
              <span>Scores <b>+{delta.scores}</b></span>
              <span>Posts <b>{delta.posts >= 0 ? "+" : ""}{delta.posts}</b></span>
              <span>Deliveries <b>{delta.deliveries >= 0 ? "+" : ""}{delta.deliveries}</b></span>
            </div>
          ) : null}

          {result.safety?.outboundArtifactDelta === false ? (
            <p>✓ Nenhum post ou delivery foi criado durante o dry-run.</p>
          ) : null}

          {result.reason ? <p>Motivo: {result.reason}</p> : null}

          {result.steps?.length ? (
            <div className="dry-run-steps">
              {result.steps.map((step) => (
                <div key={step.name}>
                  <span>{step.name}</span>
                  <strong>{step.status}</strong>
                  <small>{step.detail}</small>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
