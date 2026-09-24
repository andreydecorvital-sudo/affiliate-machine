import {
  MetricCard,
  PageHeader,
  Panel,
  StatusPill
} from "@/components/operator/ui";
import { getCanaryReadiness } from "@/lib/control-center/readiness";

export const dynamic = "force-dynamic";

function pillState(state: string) {
  if (state === "ready") return "good" as const;
  if (state === "blocked") return "danger" as const;
  if (state === "warning") return "warn" as const;
  return "muted" as const;
}

const actionByKey: Record<string, string> = {
  supabase:
    "Adicionar NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel.",
  "internal-secret":
    "Criar um INTERNAL_JOB_SECRET forte para proteger os endpoints internos.",
  "app-url":
    "Definir NEXT_PUBLIC_APP_URL com https://affiliate-machine-vitaldecor.vercel.app.",
  shopee:
    "Adicionar SHOPEE_AFFILIATE_APP_ID e SHOPEE_AFFILIATE_SECRET.",
  gemini:
    "Adicionar GEMINI_API_KEY para liberar geração e avaliação de copy.",
  "whatsapp-account":
    "Parear uma única conta WhatsApp; o envio real continuará desligado.",
  "whatsapp-group":
    "Selecionar somente 1 grupo para o canário e liberar accepting_traffic.",
  "meta-write":
    "Desligar META_ADS_WRITE_ENABLED antes de qualquer canário.",
  autopilot:
    "Desligar AUTOPILOT_ENABLED; o primeiro ciclo deve continuar manual.",
  "whatsapp-send":
    "Manter WHATSAPP_REAL_SEND_ENABLED=0 fora da janela controlada."
};

export default async function ControlCenterPage() {
  const data = await getCanaryReadiness();
  const ready = data.checks.filter((item) => item.state === "ready").length;
  const blocked = data.checks.filter((item) => item.state === "blocked").length;
  const warnings = data.checks.filter(
    (item) => item.state === "warning"
  ).length;
  const manualActions = data.checks
    .filter(
      (item) =>
        ["blocked", "warning"].includes(item.state) &&
        Boolean(actionByKey[item.key])
    )
    .map((item) => ({
      ...item,
      action: actionByKey[item.key]
    }));

  return (
    <main className="page">
      <PageHeader
        eyebrow="CANARY READINESS"
        title="Control Center"
        description="O painel mostra o que já está pronto, o que ainda depende de uma configuração sua e mantém qualquer envio real bloqueado até o canário."
        actions={
          <StatusPill
            state={
              data.readiness.realCanaryPrerequisitesReady
                ? "good"
                : "danger"
            }
          >
            {data.readiness.realCanaryPrerequisitesReady
              ? "Pré-requisitos prontos"
              : "Canário bloqueado"}
          </StatusPill>
        }
      />

      <section className="metrics-grid">
        <MetricCard
          label="Checks prontos"
          value={String(ready)}
          hint={String(data.checks.length) + " checks totais"}
          tone="positive"
        />
        <MetricCard
          label="Blockers"
          value={String(blocked)}
          hint="impedem dry-run ou canário real"
          tone={blocked > 0 ? "warning" : "positive"}
        />
        <MetricCard
          label="Ações suas"
          value={String(manualActions.length)}
          hint={warnings > 0 ? `${warnings} aviso(s) incluído(s)` : "pendências de configuração"}
          tone={manualActions.length > 0 ? "warning" : "positive"}
        />
        <MetricCard
          label="Dry-run"
          value={data.readiness.dryRunReady ? "LIBERADO" : "BLOQUEADO"}
          hint="sem envio real"
          tone={data.readiness.dryRunReady ? "positive" : "warning"}
        />
      </section>

      <section className="content-grid content-grid-wide">
        <Panel title="O que falta de você" eyebrow="ACTION QUEUE">
          {manualActions.length === 0 ? (
            <div className="issue-card">
              <StatusPill state="good">Sem ação manual</StatusPill>
              <strong>Nenhuma configuração sua está bloqueando a próxima etapa.</strong>
              <p>A máquina pode seguir para os probes e dry-run controlado.</p>
            </div>
          ) : (
            <div className="issue-stack">
              {manualActions.map((item) => (
                <div className="issue-card" key={item.key}>
                  <StatusPill state={pillState(item.state)}>
                    {item.requiredForDryRun ? "Antes do dry-run" : "Antes do canário"}
                  </StatusPill>
                  <strong>{item.label}</strong>
                  <p>{item.action}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Próximo passo da máquina" eyebrow="SAFE EXECUTION">
          <div className="checklist">
            <div data-done={data.db.ok}>
              <i />
              Validar RPCs e acesso ao banco
            </div>
            <div data-done={data.readiness.dryRunReady}>
              <i />
              Liberar Hunter/score/link em dry-run
            </div>
            <div data-done={data.db.pairedAccounts > 0}>
              <i />
              Reconhecer 1 conta de distribuição
            </div>
            <div data-done={data.db.acceptingGroups > 0}>
              <i />
              Isolar 1 grupo de canário
            </div>
            <div data-done={!data.gates.whatsappRealSend}>
              <i />
              Manter envio real fechado
            </div>
          </div>

          <div className="issue-card" style={{ marginTop: 12 }}>
            <StatusPill
              state={data.readiness.dryRunReady ? "good" : "muted"}
            >
              {data.readiness.dryRunReady ? "Próximo: dry-run" : "Aguardando setup"}
            </StatusPill>
            <strong>
              {data.readiness.dryRunReady
                ? "A próxima execução pode ser totalmente sem envio externo."
                : "A máquina não vai tentar contornar credenciais ou gates ausentes."}
            </strong>
            <p>
              Autopilot, WhatsApp real-send e escrita em Meta continuam fail-closed.
            </p>
          </div>
        </Panel>
      </section>

      <section className="content-grid content-grid-wide">
        <Panel title="Checklist operacional" eyebrow="READINESS">
          <div className="settings-list">
            {data.checks.map((item) => (
              <div className="settings-row" key={item.key}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <StatusPill state={pillState(item.state)}>
                  {item.state === "ready"
                    ? "Pronto"
                    : item.state === "blocked"
                      ? "Bloqueado"
                      : item.state === "warning"
                        ? "Atenção"
                        : "Opcional"}
                </StatusPill>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Gate do canário" eyebrow="CONTROL">
          <div className="checklist">
            <div data-done={data.readiness.dryRunReady}>
              <i />
              Dry-run completo sem envio real
            </div>
            <div data-done={data.db.ok}>
              <i />
              Supabase/RPCs críticos respondendo
            </div>
            <div data-done={data.db.pairedAccounts > 0}>
              <i />
              Conta WhatsApp conectada
            </div>
            <div data-done={data.db.acceptingGroups > 0}>
              <i />
              Grupo de canário explicitamente ativo
            </div>
            <div data-done={!data.gates.autopilot}>
              <i />
              Autopilot desligado
            </div>
            <div data-done={!data.gates.metaAdsWrite}>
              <i />
              Meta write desligado
            </div>
          </div>

          <div className="issue-card" style={{ marginTop: 12 }}>
            <StatusPill
              state={
                data.readiness.realCanaryPrerequisitesReady
                  ? "good"
                  : "danger"
              }
            >
              {data.readiness.realCanaryPrerequisitesReady
                ? "READY"
                : "BLOCKED"}
            </StatusPill>
            <strong>
              {data.readiness.realCanaryPrerequisitesReady
                ? "Pré-requisitos do canário atendidos."
                : "Ainda existem blockers críticos."}
            </strong>
            <p>
              Mesmo quando tudo estiver verde, o envio real só deve ser ativado
              durante uma janela controlada.
            </p>
          </div>
        </Panel>
      </section>

      <section className="content-grid">
        <Panel title="Estado do banco" eyebrow="SUPABASE">
          <div className="signal-grid">
            <div>
              <span>Grupos</span>
              <strong>{data.db.groups}</strong>
            </div>
            <div>
              <span>Ativos</span>
              <strong>{data.db.activeGroups}</strong>
            </div>
            <div>
              <span>Aceitando tráfego</span>
              <strong>{data.db.acceptingGroups}</strong>
            </div>
          </div>
          <div className="signal-grid" style={{ marginTop: 16 }}>
            <div>
              <span>Contas</span>
              <strong>{data.db.accounts}</strong>
            </div>
            <div>
              <span>Pareadas</span>
              <strong>{data.db.pairedAccounts}</strong>
            </div>
            <div>
              <span>RPC money</span>
              <strong>{data.db.moneyOk ? "OK" : "FAIL"}</strong>
            </div>
          </div>
        </Panel>

        <Panel title="Safety gates" eyebrow="FAIL CLOSED">
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Autopilot</span>
              <StatusPill state={data.gates.autopilot ? "danger" : "good"}>
                {data.gates.autopilot ? "ON" : "OFF seguro"}
              </StatusPill>
            </div>
            <div className="readiness-row">
              <span>Meta Ads write</span>
              <StatusPill state={data.gates.metaAdsWrite ? "danger" : "good"}>
                {data.gates.metaAdsWrite ? "ON" : "OFF seguro"}
              </StatusPill>
            </div>
            <div className="readiness-row">
              <span>WhatsApp real-send</span>
              <StatusPill
                state={data.gates.whatsappRealSend ? "warn" : "good"}
              >
                {data.gates.whatsappRealSend ? "ON" : "OFF seguro"}
              </StatusPill>
            </div>
          </div>
        </Panel>
      </section>

      <Panel title="Sequência correta" eyebrow="CANARY PLAN">
        <div className="principle-grid">
          <div>
            <span>01</span>
            <strong>Dry-run</strong>
            <p>Hunter, score, link, materialização e delivery preparado sem envio externo.</p>
          </div>
          <div>
            <span>02</span>
            <strong>1 grupo</strong>
            <p>Somente uma conta e um grupo explicitamente escolhidos para o primeiro envio real.</p>
          </div>
          <div>
            <span>03</span>
            <strong>1 oferta</strong>
            <p>Validar preço, link, mensagem, tracking, clique e conversão antes de qualquer escala.</p>
          </div>
        </div>
      </Panel>
    </main>
  );
}
