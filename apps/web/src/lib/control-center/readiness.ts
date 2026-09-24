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
export type CheckCategory =
  | "infra"
  | "revenue"
  | "distribution"
  | "safety";

export type ReadinessCheck = {
  key: string;
  label: string;
  state: CheckState;
  detail: string;
  action?: string;
  category: CheckCategory;
  manualAction: boolean;
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
    strategies: 0,
    products: 0,
    offers: 0,
    posts: 0,
    conversions: 0,
    error: hasSupabase ? null : "Supabase envs ausentes."
  };

  if (hasSupabase) {
    const supabase = createSupabaseAdminClient();
    const [
      quota,
      money,
      groups,
      accounts,
      strategies,
      products,
      offers,
      posts,
      conversions
    ] = await Promise.all([
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
      }),
      safe(async () => {
        const { count, error } = await supabase
          .from("hunter_strategies")
          .select("id", { count: "exact", head: true })
          .eq("enabled", true);
        if (error) throw error;
        return count ?? 0;
      }),
      safe(async () => {
        const { count, error } = await supabase
          .from("affiliate_products")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }),
      safe(async () => {
        const { count, error } = await supabase
          .from("offer_snapshots")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }),
      safe(async () => {
        const { count, error } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }),
      safe(async () => {
        const { count, error } = await supabase
          .from("conversions")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      })
    ]);

    const groupRows = groups.data ?? [];
    const accountRows = accounts.data ?? [];
    dbHealth = {
      ok:
        quota.ok &&
        money.ok &&
        groups.ok &&
        accounts.ok &&
        strategies.ok &&
        products.ok &&
        offers.ok &&
        posts.ok &&
        conversions.ok,
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
      strategies: strategies.data ?? 0,
      products: products.data ?? 0,
      offers: offers.data ?? 0,
      posts: posts.data ?? 0,
      conversions: conversions.data ?? 0,
      error:
        quota.error ||
        money.error ||
        groups.error ||
        accounts.error ||
        strategies.error ||
        products.error ||
        offers.error ||
        posts.error ||
        conversions.error ||
        null
    };
  }

  const hasPipelineData =
    dbHealth.products +
      dbHealth.offers +
      dbHealth.posts +
      dbHealth.conversions >
    0;

  const checks: ReadinessCheck[] = [
    {
      key: "supabase",
      label: "Supabase dedicado",
      state: dbHealth.ok ? "ready" : "blocked",
      detail: dbHealth.ok
        ? "RPCs críticos e tabelas operacionais respondendo."
        : dbHealth.error ?? "Banco indisponível.",
      action: dbHealth.ok
        ? undefined
        : "Adicionar NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no projeto da Vercel.",
      category: "infra",
      manualAction: !dbHealth.ok,
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
      action: env.INTERNAL_JOB_SECRET
        ? undefined
        : "Criar um INTERNAL_JOB_SECRET forte na Vercel antes de executar jobs internos.",
      category: "infra",
      manualAction: !env.INTERNAL_JOB_SECRET,
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "app-url",
      label: "URL da aplicação",
      state: env.NEXT_PUBLIC_APP_URL ? "ready" : "warning",
      detail: env.NEXT_PUBLIC_APP_URL
        ? env.NEXT_PUBLIC_APP_URL
        : "A aplicação funciona sem esta env, mas links absolutos ficam limitados.",
      action: env.NEXT_PUBLIC_APP_URL
        ? undefined
        : "Definir NEXT_PUBLIC_APP_URL com a URL de produção quando o alias estiver estabilizado.",
      category: "infra",
      manualAction: !env.NEXT_PUBLIC_APP_URL,
      requiredForDryRun: false,
      requiredForRealCanary: true
    },
    {
      key: "foundation",
      label: "Fundação do Hunter",
      state:
        dbHealth.ok && dbHealth.strategies > 0
          ? "ready"
          : dbHealth.ok
            ? "warning"
            : "blocked",
      detail:
        dbHealth.strategies > 0
          ? `${dbHealth.strategies} estratégia(s) Hunter ativa(s) no banco.`
          : dbHealth.ok
            ? "Banco responde, mas não há estratégia Hunter ativa."
            : "Aguardando conexão com o banco.",
      action:
        dbHealth.ok && dbHealth.strategies === 0
          ? "Reaplicar o seed/migration da fundação Hunter."
          : undefined,
      category: "revenue",
      manualAction: false,
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "pipeline-data",
      label: "Dados reais do funil",
      state: hasPipelineData ? "ready" : dbHealth.ok ? "warning" : "blocked",
      detail: hasPipelineData
        ? `${dbHealth.offers} oferta(s), ${dbHealth.products} produto(s), ${dbHealth.posts} post(s) e ${dbHealth.conversions} conversão(ões).`
        : dbHealth.ok
          ? "Fundação pronta, mas a ingestão real ainda não gerou ofertas/produtos/posts/conversões."
          : "Aguardando conexão com o banco.",
      action:
        dbHealth.ok && !hasPipelineData
          ? "Rodar primeiro sync read-only da Shopee e depois o Hunter em dry-run."
          : undefined,
      category: "revenue",
      manualAction: false,
      requiredForDryRun: false,
      requiredForRealCanary: false
    },
    {
      key: "shopee",
      label: "Shopee Affiliate",
      state: hasShopee ? "ready" : "blocked",
      detail: hasShopee
        ? "Credenciais configuradas; probe read-only disponível."
        : "APP_ID/SECRET pendentes.",
      action: hasShopee
        ? undefined
        : "Adicionar SHOPEE_AFFILIATE_APP_ID e SHOPEE_AFFILIATE_SECRET.",
      category: "revenue",
      manualAction: !hasShopee,
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "gemini",
      label: "Gemini",
      state: hasGemini ? "ready" : "blocked",
      detail: hasGemini
        ? "API key configurada."
        : "GEMINI_API_KEY pendente.",
      action: hasGemini
        ? undefined
        : "Adicionar GEMINI_API_KEY para geração/avaliação de copy.",
      category: "revenue",
      manualAction: !hasGemini,
      requiredForDryRun: true,
      requiredForRealCanary: true
    },
    {
      key: "whatsapp-account",
      label: "Conta WhatsApp pareada",
      state: dbHealth.pairedAccounts > 0 ? "ready" : "blocked",
      detail:
        dbHealth.pairedAccounts > 0
          ? `${dbHealth.pairedAccounts} conta(s) pareada(s).`
          : "Nenhuma conta pareada no banco.",
      action:
        dbHealth.pairedAccounts > 0
          ? undefined
          : "Parear uma única conta no Control Center; envio real continua bloqueado.",
      category: "distribution",
      manualAction: dbHealth.pairedAccounts === 0,
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
      action:
        dbHealth.acceptingGroups > 0
          ? undefined
          : "Selecionar apenas 1 grupo para o canário e marcar accepting_traffic=true.",
      category: "distribution",
      manualAction: dbHealth.acceptingGroups === 0,
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
      action: meta.configured
        ? undefined
        : "Pode ficar para depois; não bloqueia o primeiro canário orgânico.",
      category: "revenue",
      manualAction: false,
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
      action: gates.metaAdsWrite
        ? "Desligar META_ADS_WRITE_ENABLED antes de qualquer canário."
        : undefined,
      category: "safety",
      manualAction: gates.metaAdsWrite,
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
      action: gates.autopilot
        ? "Desligar AUTOPILOT_ENABLED antes de continuar."
        : undefined,
      category: "safety",
      manualAction: gates.autopilot,
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
      action: gates.whatsappRealSend
        ? "Voltar WHATSAPP_REAL_SEND_ENABLED para 0 fora da janela controlada."
        : undefined,
      category: "safety",
      manualAction: gates.whatsappRealSend,
      requiredForDryRun: true,
      requiredForRealCanary: false
    }
  ];

  const dryRunBlockers = checks.filter(
    (item) => item.requiredForDryRun && item.state === "blocked"
  );
  const realCanaryBlockers = checks.filter(
    (item) => item.requiredForRealCanary && item.state === "blocked"
  );
  const manualActions = checks.filter(
    (item) =>
      item.manualAction &&
      Boolean(item.action) &&
      ["blocked", "warning"].includes(item.state)
  );
  const systemActions = checks.filter(
    (item) =>
      !item.manualAction &&
      Boolean(item.action) &&
      ["blocked", "warning"].includes(item.state)
  );

  return {
    generatedAt: new Date().toISOString(),
    checks,
    gates,
    db: dbHealth,
    actions: {
      manual: manualActions,
      system: systemActions
    },
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
