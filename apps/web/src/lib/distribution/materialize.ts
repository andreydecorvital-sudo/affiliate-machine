import { buildDeterministicOfferMessage } from "@affiliate/distribution";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createTrackedShopeeLink } from "@/lib/shopee/sync";
import { recordOperationalEvent } from "@/lib/events";

type Candidate = {
  offer_score_id: number;
  offer_snapshot_id: number;
  external_item_id: string;
  product_name: string;
  offer_link: string;
  price: number | string | null;
  price_min: number | string | null;
  discount_rate: number | string | null;
  sales: number | string | null;
  rating: number | string | null;
  score: number | string;
  confidence: number | string;
  discovery_niche: string | null;
};

function numberOrNull(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function materializePublishablePosts(input: {
  limit?: number;
  niche?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
  const fallbackNiche = input.niche?.trim() || "general";

  const { data, error } = await supabase.rpc("get_publishable_opportunities", {
    p_limit: limit
  });
  if (error) throw error;

  const candidates = (data ?? []) as Candidate[];
  const created: Array<{
    postId: string;
    externalItemId: string;
    score: number;
    niche: string;
    shortUrl: string;
  }> = [];

  const skipped: Array<{
    externalItemId: string;
    niche: string;
    reason: string;
  }> = [];

  for (const candidate of candidates) {
    const niche = candidate.discovery_niche?.trim() || fallbackNiche;

    const { data: targetCount, error: targetError } = await supabase.rpc(
      "distribution_target_count",
      { p_niche: niche }
    );
    if (targetError) throw targetError;

    if ((Number(targetCount) || 0) < 1) {
      skipped.push({
        externalItemId: candidate.external_item_id,
        niche,
        reason: "no_active_distribution_target"
      });
      continue;
    }

    const trackingKey = `score:${candidate.offer_score_id}`;
    const link = await createTrackedShopeeLink({
      externalItemId: candidate.external_item_id,
      originUrl: candidate.offer_link,
      subIds: [niche, `score-${candidate.offer_score_id}`],
      trackingKey,
      context: {
        offerScoreId: candidate.offer_score_id,
        niche
      }
    });

    if (!link.shortLink.url) {
      throw new Error("NEXT_PUBLIC_APP_URL is required before posts can be materialized.");
    }

    const content = buildDeterministicOfferMessage({
      productName: candidate.product_name,
      price: numberOrNull(candidate.price),
      priceMin: numberOrNull(candidate.price_min),
      discountRate: numberOrNull(candidate.discount_rate),
      rating: numberOrNull(candidate.rating),
      sales: numberOrNull(candidate.sales),
      shortUrl: link.shortLink.url
    });

    const { data: postId, error: postError } = await supabase.rpc(
      "create_post_with_deliveries",
      {
        p_offer_score_id: candidate.offer_score_id,
        p_offer_snapshot_id: candidate.offer_snapshot_id,
        p_affiliate_link_id: link.affiliateLinkId,
        p_short_link_id: link.shortLink.id,
        p_niche: niche,
        p_content: content,
        p_scheduled_at: null
      }
    );

    if (postError) throw postError;
    if (typeof postId !== "string") {
      throw new Error("create_post_with_deliveries returned an invalid post id.");
    }

    await recordOperationalEvent({
      eventType: "distribution.post_materialized",
      source: "distribution",
      entityType: "post",
      entityId: postId,
      idempotencyKey: `post:${candidate.offer_score_id}`,
      payload: {
        externalItemId: candidate.external_item_id,
        score: numberOrNull(candidate.score),
        confidence: numberOrNull(candidate.confidence),
        niche,
        trackingKey
      }
    });

    created.push({
      postId,
      externalItemId: candidate.external_item_id,
      score: numberOrNull(candidate.score) ?? 0,
      niche,
      shortUrl: link.shortLink.url
    });
  }

  return { processed: candidates.length, created, skipped };
}
