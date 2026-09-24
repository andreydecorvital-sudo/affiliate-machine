import { getServerEnv, getSupabaseServerKey } from "@/lib/env";
import { getFeatureGates } from "@/lib/feature-gates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createShopeeAffiliateClient } from "@/lib/shopee/client";
import {
  createMetaAdsReadOnlyClient,
  getMetaAdsReadOnlyConfig
} from "@/lib/meta/client";
import { callWhatsAppBridge } from "@/lib/whatsapp/bridge";

export type CheckState = "ready" | "blocked" | "warning" | "optional";

export type ReadinessCheck = {
  key: string;
  label: string;
  state: CheckState;
  detail: string;
  requiredForDryRun: boolean;
  requiredForRealCanary: boolean;
};

async function safe<T>(fn: () => Promise<T>) {
  try {
    return { ok: true as const, data: await fn(), error: null };
  } catch (error) {
    return {
      ok: false as const,
      data: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function getCanaryReadiness() {
  const env = getServerEnv();
  const gates = getFeatureGates();
  const hasSupabase = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseServerKey(env)
  );
  const hasShopee = Boolean(
    env.SHOPEE_AFFILIATE_APP_ID && env.SHOPEE_AFFILIATE_SECRET
  );
  const hasGemini = Boolean(env.GEMINI_API_KEY);
  const meta = getMetaAdsReadOnlyConfig();

  let dbHealth = {
    ok: false,
    quotaOk: false,
    moneyOk: false,
    groups: 0,
    activeGroups: 0,
    acceptingGroups: 0,
    accounts: 0,
    pairedAccounts: 0,
    error: hasSupabase ? null : "Supabase envs ausentes."
  };

  if (hasSupabase) {
    const supabase = createSupabaseAdminClient();
    const [quota, money, groups, accounts] = await Promise.all([
      safe(async () => {
        const { data, error } = await supabase.rpc("distribution_quota_status");
        if (error) throw error;
        return data;
      }),
      safe(async () => {
        const { data, error } = await supabase.rpc("money_summary", {
          p_days: 30
        });
        if (error) throw error;
        return data;
      }),
      safe(async () => {
        const { data, error } = await supabase
          .from("whatsapp_groups")
          .select("id,active,accepting_traffic");
        if (error) throw error;
        return data ?? [];
      }),
      safe(async () => {
        const { data, error } = await supabase
          .from("whatsapp_accounts")
          .select("id,status");
        if (error) throw error;
        return data ?? [];
      })
    ]);

    const groupRows = groups.data ?? [];
    const accountRows = accounts.data ?? [];
    dbHealth = {
      ok: quota.ok && money.ok && groups.ok && accounts.ok,
      quotaOk: quota.ok,
      moneyOk: money.ok,
      groups: groupRows.length,
      activeGroups: groupRows.filter((row: any) => row.active).length,
      acceptingGroups: groupRows.filter(
        (row: any) => row.active && row.accepting_traffic
      ).length,
      accounts: accountRows.length,
      pairedAccounts: accountRows.filter((row: any) =>
        ["connected", "ready", "paired"].includes(
          String(row.status ?? "").toLowerCase()
        )
      ).length,
      error:
        quota.error ||
        money.error ||
        groups.error ||
        accounts.error ||
        null
    };
  }

  const checks: ReadinessCheck[] = [
    {
      key: "supabase",
      label: "Supabase dedicado",
      state: dbHealth.ok ? "ready" : "blocked",
      detail: dbHealth.ok
        ? "RPCs críticos e tabelas operacionais respondendo."
        : dbHealth.error ?? "Banco indisponível.",
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "internal-secret",
      label: "INTERNAL_JOB_SECRET",
      state: env.INTERNAL_JOB_SECRET ? "ready" : "blocked",
      detail: env.INTERNAL_JOB_SECRET
        ? "Jobs internos protegidos."
        : "Falta secret para proteger endpoints internos.",
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "app-url",
      label: "URL da aplicação",
      state: env.NEXT_PUBLIC_APP_URL ? "ready" : "warning",
      detail: env.NEXT_PUBLIC_APP_URL
        ? env.NEXT_PUBLIC_APP_URL
        : "Será definida quando o projeto Vercel existir.",
      requiredForDryRun: false,
      requiredForRealCanary: true
    },
    {
      key: "shopee",
      label: "Shopee Affiliate",
      state: hasShopee ? "ready" : "blocked",
      detail: hasShopee
        ? "Credenciais configuradas; probe read-only disponível."
        : "APP_ID/SECRET pendentes.",
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "gemini",
      label: "Gemini",
      state: hasGemini ? "ready" : "optional",
      detail: hasGemini
        ? "API key configurada."
        : "Opcional para o dry-run Hunter + score e para o primeiro canário determinístico.",
      requiredForDryRun: false,
      requiredForRealCanary: false
    },
    {
      key: "whatsapp-account",
      label: "Conta WhatsApp pareada",
      state: dbHealth.pairedAccounts > 0 ? "ready" : "blocked",
      detail:
        dbHealth.pairedAccounts > 0
          ? `${dbHealth.pairedAccounts} conta(s) pareada(s).`
          : "Nenhuma conta pareada no banco.",
      requiredForDryRun: false,
      requiredForRealCanary: true
    },
    {
      key: "whatsapp-group",
      label: "Grupo de canário",
      state: dbHealth.acceptingGroups > 0 ? "ready" : "blocked",
      detail:
        dbHealth.acceptingGroups > 0
          ? `${dbHealth.acceptingGroups} grupo(s) ativo(s) aceitando tráfego.`
          : "Nenhum grupo ativo e accepting_traffic=true.",
      requiredForDryRun: false,
      requiredForRealCanary: true
    },
    {
      key: "meta",
      label: "Meta Ads read-only",
      state: meta.configured ? "ready" : "optional",
      detail: meta.configured
        ? "Conta configurada para leitura."
        : "Opcional para o primeiro canário orgânico.",
      requiredForDryRun: false,
      requiredForRealCanary: false
    },
    {
      key: "meta-write",
      label: "Meta Ads write",
      state: gates.metaAdsWrite ? "blocked" : "ready",
      detail: gates.metaAdsWrite
        ? "Está ON e deve voltar para OFF antes do canário."
        : "OFF — estado seguro.",
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "autopilot",
      label: "Autopilot",
      state: gates.autopilot ? "blocked" : "ready",
      detail: gates.autopilot
        ? "Está ON cedo demais; desligar antes do canário."
        : "OFF — canário continua manual/controlado.",
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "whatsapp-send",
      label: "WhatsApp real-send",
      state: gates.whatsappRealSend ? "warning" : "ready",
      detail: gates.whatsappRealSend
        ? "ON — só deve permanecer assim durante a janela do canário."
        : "OFF — bloqueio seguro até a hora do canário.",
      requiredForDryRun: true,
      requiredForRealCanary: false
    }
  ];

  const dryRunBlockers = checks.filter(
    (item) => item.requiredForDryRun && item.state !== "ready"
  );
  const realCanaryBlockers = checks.filter(
    (item) => item.requiredForRealCanary && item.state !== "ready"
  );

  return {
    generatedAt: new Date().toISOString(),
    checks,
    gates,
    db: dbHealth,
    readiness: {
      dryRunReady: dryRunBlockers.length === 0,
      realCanaryPrerequisitesReady: realCanaryBlockers.length === 0,
      dryRunBlockers: dryRunBlockers.map((item) => item.key),
      realCanaryBlockers: realCanaryBlockers.map((item) => item.key)
    }
  };
}

export async function probeCanaryIntegration(
  target: "supabase" | "shopee" | "meta" | "whatsapp"
) {
  const env = getServerEnv();

  if (target === "supabase") {
    const supabase = createSupabaseAdminClient();
    const started = Date.now();
    const { data, error } = await supabase.rpc("distribution_quota_status");
    if (error) throw error;
    return {
      target,
      ok: true,
      latencyMs: Date.now() - started,
      summary: "RPC distribution_quota_status respondeu.",
      data
    };
  }

  if (target === "shopee") {
    const client = createShopeeAffiliateClient();
    const started = Date.now();
    const page = await client.getProductOffers({ page: 1, limit: 1 });
    return {
      target,
      ok: true,
      latencyMs: Date.now() - started,
      summary: "Shopee Affiliate respondeu ao productOfferV2.",
      data: {
        items: page.items.length,
        hasNextPage: page.hasNextPage
      }
    };
  }

  if (target === "meta") {
    if (!env.META_ACCESS_TOKEN) {
      throw new Error("Meta Ads não configurada.");
    }
    const client = createMetaAdsReadOnlyClient();
    const started = Date.now();
    const account = await client.getAdAccountInfo();
    return {
      target,
      ok: true,
      latencyMs: Date.now() - started,
      summary: "Meta Ads respondeu em modo read-only.",
      data: {
        accountId: account.accountId,
        currency: account.currency
      }
    };
  }

  const started = Date.now();
  const data = await callWhatsAppBridge<Record<string, unknown>>(
    "health",
    {},
    15_000
  );
  return {
    target,
    ok: true,
    latencyMs: Date.now() - started,
    summary: "WhatsApp bridge respondeu ao health check.",
    data
  };
}
