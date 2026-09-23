import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncShopeeOffers } from "@/lib/shopee/sync";
import { recordOperationalEvent } from "@/lib/events";

type HunterStrategy = {
  strategy_id: string;
  provider: string;
  name: string;
  niche: string;
  keyword: string | null;
  product_cat_id: number | null;
  list_type: number;
  sort_type: number;
  pages_per_run: number;
  page_size: number;
  priority: number;
  enabled: boolean;
  clicks: number | string;
  conversions: number | string;
  commission: number | string;
  sample_confidence: number | string;
  performance_index: number | string | null;
  effective_rank: number | string;
};

export async function runHunter(input: { strategyLimit?: number } = {}) {
  const supabase = createSupabaseAdminClient();
  const strategyLimit = Math.min(Math.max(input.strategyLimit ?? 10, 1), 50);

  const { data, error } = await supabase.rpc("learning_strategy_rank");
  if (error) throw error;

  const strategies = ((data ?? []) as HunterStrategy[])
    .filter((item) => item.enabled && item.provider === "shopee")
    .slice(0, strategyLimit);

  const results: Array<{
    strategyId: string;
    name: string;
    niche: string;
    status: "success" | "partial" | "error";
    pagesFetched: number;
    offersFetched: number;
    offersPersisted: number;
    uniqueItems: number;
    effectiveRank: number;
    performanceIndex: number | null;
    sampleConfidence: number;
    error: string | null;
  }> = [];

  const allUniqueItems = new Set<string>();

  for (const strategy of strategies) {
    const startedAt = new Date().toISOString();
    const { data: run, error: runError } = await supabase
      .from("hunter_runs")
      .insert({
        strategy_id: strategy.strategy_id,
        started_at: startedAt,
        status: "running"
      })
      .select("id")
      .single();

    if (runError) throw runError;

    let pagesFetched = 0;
    let offersFetched = 0;
    let offersPersisted = 0;
    let failure: string | null = null;
    const strategyItems = new Set<string>();

    for (let page = 1; page <= strategy.pages_per_run; page += 1) {
      try {
        const response = await syncShopeeOffers(
          {
            keyword: strategy.keyword ?? undefined,
            productCatId: strategy.product_cat_id ?? undefined,
            listType: strategy.list_type,
            sortType: strategy.sort_type,
            page,
            limit: strategy.page_size
          },
          {
            niche: strategy.niche,
            strategyId: strategy.strategy_id,
            strategyName: strategy.name
          }
        );

        pagesFetched += 1;
        offersFetched += response.items.length;
        offersPersisted += response.persisted;

        for (const offer of response.items) {
          strategyItems.add(offer.itemId);
          allUniqueItems.add(offer.itemId);
        }

        if (!response.hasNextPage) break;
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
        break;
      }
    }

    const status =
      failure === null
        ? "success"
        : pagesFetched > 0
          ? "partial"
          : "error";

    const finishedAt = new Date().toISOString();

    const { error: updateRunError } = await supabase
      .from("hunter_runs")
      .update({
        finished_at: finishedAt,
        status,
        pages_fetched: pagesFetched,
        offers_fetched: offersFetched,
        offers_persisted: offersPersisted,
        unique_items: strategyItems.size,
        error: failure
      })
      .eq("id", run.id);

    if (updateRunError) throw updateRunError;

    const { error: strategyUpdateError } = await supabase
      .from("hunter_strategies")
      .update({
        last_run_at: finishedAt,
        last_error: failure,
        updated_at: finishedAt
      })
      .eq("id", strategy.strategy_id);

    if (strategyUpdateError) throw strategyUpdateError;

    results.push({
      strategyId: strategy.strategy_id,
      name: strategy.name,
      niche: strategy.niche,
      status,
      pagesFetched,
      offersFetched,
      offersPersisted,
      uniqueItems: strategyItems.size,
      effectiveRank: Number(strategy.effective_rank) || strategy.priority,
      performanceIndex:
        strategy.performance_index === null
          ? null
          : Number(strategy.performance_index),
      sampleConfidence: Number(strategy.sample_confidence) || 0,
      error: failure
    });
  }

  const summary = {
    strategies: results.length,
    successful: results.filter((item) => item.status === "success").length,
    partial: results.filter((item) => item.status === "partial").length,
    failed: results.filter((item) => item.status === "error").length,
    pagesFetched: results.reduce((sum, item) => sum + item.pagesFetched, 0),
    offersFetched: results.reduce((sum, item) => sum + item.offersFetched, 0),
    offersPersisted: results.reduce(
      (sum, item) => sum + item.offersPersisted,
      0
    ),
    uniqueItems: allUniqueItems.size
  };

  await recordOperationalEvent({
    eventType: "hunter.run.completed",
    source: "hunter",
    payload: {
      ...summary,
      strategyOrder: results.map((item) => ({
        strategyId: item.strategyId,
        name: item.name,
        effectiveRank: item.effectiveRank,
        performanceIndex: item.performanceIndex,
        sampleConfidence: item.sampleConfidence
      }))
    }
  }).catch(() => undefined);

  return { summary, results };
}
