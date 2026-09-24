import { getServerEnv, getSupabaseServerKey } from "@/lib/env";
import { getFeatureGates } from "@/lib/feature-gates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMoneyAnalytics } from "@/lib/money/analytics";
import { getLearningStatus } from "@/lib/learning/learning";
import { getDistributionLearningStatus } from "@/lib/distribution/learning";
import {
  getMetaAdsReadOnlyStatus,
  listMetaCampaignLinks
} from "@/lib/meta/sync";

type SafeResult<T> = {
  ok: boolean;
  data: T | null;
  error: string | null;
};

async function safe<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    return { ok: true, data: await fn(), error: null };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function getReadiness() {
  const env = getServerEnv();
  const gates = getFeatureGates();
  const supabase = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseServerKey(env)
  );

  return {
    supabase,
    shopee: Boolean(
      env.SHOPEE_AFFILIATE_APP_ID && env.SHOPEE_AFFILIATE_SECRET
    ),
    gemini: Boolean(env.GEMINI_API_KEY),
    meta: Boolean(
      env.META_ACCESS_TOKEN &&
        env.META_AD_ACCOUNT_ID &&
        env.META_GRAPH_API_VERSION
    ),
    whatsapp: gates.whatsappRealSend,
    autopilot: gates.autopilot,
    metaWrite: gates.metaAdsWrite
  };
}

export async function getDashboardData() {
  const readiness = getReadiness();

  if (!readiness.supabase) {
    return {
      readiness,
      connected: false,
      money: null,
      learning: null,
      distribution: null,
      meta: null,
      counters: {
        groups: 0,
        strategies: 0,
        posts: 0,
        offers: 0
      },
      errors: ["Supabase dedicado ainda não conectado."]
    };
  }

  const supabase = createSupabaseAdminClient();

  const [money, learning, distribution, meta, groups, strategies, posts, offers] =
    await Promise.all([
      safe(() => getMoneyAnalytics(30)),
      safe(() => getLearningStatus()),
      safe(() => getDistributionLearningStatus()),
      safe(() => getMetaAdsReadOnlyStatus()),
      safe(() =>
        supabase
          .from("whatsapp_groups")
          .select("id", { count: "exact", head: true })
      ),
      safe(() =>
        supabase
          .from("hunter_strategies")
          .select("id", { count: "exact", head: true })
          .eq("enabled", true)
      ),
      safe(() =>
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
      ),
      safe(() =>
        supabase
          .from("offer_snapshots")
          .select("id", { count: "exact", head: true })
      )
    ]);

  const errors = [
    money,
    learning,
    distribution,
    meta,
    groups,
    strategies,
    posts,
    offers
  ]
    .filter((item) => !item.ok && item.error)
    .map((item) => item.error as string);

  return {
    readiness,
    connected: true,
    money: money.data,
    learning: learning.data,
    distribution: distribution.data,
    meta: meta.data,
    counters: {
      groups: groups.data?.count ?? 0,
      strategies: strategies.data?.count ?? 0,
      posts: posts.data?.count ?? 0,
      offers: offers.data?.count ?? 0
    },
    errors
  };
}

export async function getHunterPageData() {
  if (!getReadiness().supabase) {
    return { connected: false, ranking: [], runs: [], products: [] };
  }

  const supabase = createSupabaseAdminClient();
  const [learning, runs, products] = await Promise.all([
    safe(() => getLearningStatus()),
    safe(() =>
      supabase
        .from("hunter_runs")
        .select(
          "id,status,pages_fetched,offers_fetched,offers_persisted,unique_items,started_at,finished_at,error,hunter_strategies(name,niche)"
        )
        .order("started_at", { ascending: false })
        .limit(12)
    ),
    safe(() =>
      supabase
        .from("learning_product_metrics")
        .select(
          "product_id,clicks,conversions,commission,smoothed_cvr,smoothed_rpc,sample_confidence,affiliate_products(product_name,external_item_id)"
        )
        .order("smoothed_rpc", { ascending: false, nullsFirst: false })
        .limit(20)
    )
  ]);

  return {
    connected: true,
    ranking: learning.data?.ranking ?? [],
    runs: runs.data?.data ?? [],
    products: products.data?.data ?? []
  };
}

export async function getDistributionPageData() {
  if (!getReadiness().supabase) {
    return { connected: false, timing: [], groups: [], quota: null };
  }

  const supabase = createSupabaseAdminClient();
  const [learning, quota] = await Promise.all([
    safe(() => getDistributionLearningStatus()),
    safe(() => supabase.rpc("distribution_quota_status"))
  ]);

  return {
    connected: true,
    timing: learning.data?.timing ?? [],
    groups: learning.data?.groups ?? [],
    quota: Array.isArray(quota.data?.data)
      ? quota.data?.data[0] ?? null
      : quota.data?.data ?? null
  };
}

export async function getAcquisitionPageData() {
  if (!getReadiness().supabase) {
    return {
      connected: false,
      economics: null,
      meta: null,
      campaigns: []
    };
  }

  const [money, meta, campaigns] = await Promise.all([
    safe(() => getMoneyAnalytics(30)),
    safe(() => getMetaAdsReadOnlyStatus()),
    safe(() => listMetaCampaignLinks())
  ]);

  return {
    connected: true,
    economics: money.data?.paidTraffic ?? null,
    meta: meta.data,
    campaigns: campaigns.data ?? []
  };
}

export async function getExperimentsPageData() {
  if (!getReadiness().supabase) {
    return {
      connected: false,
      copy: [],
      distribution: []
    };
  }

  const supabase = createSupabaseAdminClient();
  const [copy, distribution] = await Promise.all([
    safe(() =>
      supabase
        .from("experiments")
        .select(
          "id,name,kind,niche,objective,status,min_clicks_per_variant,starts_at,ends_at,created_at"
        )
        .order("created_at", { ascending: false })
    ),
    safe(() =>
      supabase
        .from("distribution_experiments")
        .select(
          "id,name,kind,niche,status,treatment_share,min_posts_per_arm,config,starts_at,ends_at,created_at"
        )
        .order("created_at", { ascending: false })
    )
  ]);

  return {
    connected: true,
    copy: copy.data?.data ?? [],
    distribution: distribution.data?.data ?? []
  };
}

export async function getSystemPageData() {
  const readiness = getReadiness();

  if (!readiness.supabase) {
    return {
      readiness,
      connected: false,
      counts: {},
      recentEvents: []
    };
  }

  const supabase = createSupabaseAdminClient();
  const tableNames = [
    "affiliate_products",
    "offer_snapshots",
    "offer_scores",
    "hunter_strategies",
    "posts",
    "post_deliveries",
    "whatsapp_groups",
    "click_events",
    "conversions",
    "commission_ledger",
    "paid_traffic_spend",
    "experiments",
    "distribution_experiments"
  ] as const;

  const entries = await Promise.all(
    tableNames.map(async (name) => {
      const result = await safe(() =>
        supabase.from(name).select("*", { count: "exact", head: true })
      );
      return [name, result.data?.count ?? 0] as const;
    })
  );

  const recentEvents = await safe(() =>
    supabase
      .from("operational_events")
      .select("id,event_type,source,entity_type,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
  );

  return {
    readiness,
    connected: true,
    counts: Object.fromEntries(entries),
    recentEvents: recentEvents.data?.data ?? []
  };
}
