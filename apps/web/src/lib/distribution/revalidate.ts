import { scoreOpportunity } from "@affiliate/intelligence";
import { buildDeterministicOfferMessage } from "@affiliate/distribution";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createShopeeAffiliateClient } from "@/lib/shopee/client";
import { getServerEnv } from "@/lib/env";
import { recordOperationalEvent } from "@/lib/events";

type RevalidationContext = {
  post_id: string;
  first_sent_at: string | null;
  last_revalidated_at: string | null;
  external_item_id: string;
  short_code: string;
  niche: string;
};

export async function revalidatePostBeforeFirstSend(postId: string): Promise<{
  valid: boolean;
  content?: string;
  reason?: string;
  skipped?: boolean;
}> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_post_revalidation_context", {
    p_post_id: postId
  });

  if (error) throw error;
  const context = (Array.isArray(data) ? data[0] : null) as RevalidationContext | null;
  if (!context) throw new Error(`Post revalidation context not found: ${postId}`);

  if (context.first_sent_at) {
    return { valid: true, skipped: true };
  }

  const itemId = Number(context.external_item_id);
  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    const reason = "invalid_external_item_id";
    await supabase.rpc("cancel_post", { p_post_id: postId, p_reason: reason });
    return { valid: false, reason };
  }

  const shopee = createShopeeAffiliateClient();
  const page = await shopee.getProductOffers({ itemId, limit: 1 });
  const current = page.items.find((item) => item.itemId === context.external_item_id) ?? page.items[0];

  if (!current) {
    const reason = "offer_no_longer_available";
    await supabase.rpc("cancel_post", { p_post_id: postId, p_reason: reason });
    await recordOperationalEvent({
      eventType: "distribution.post_cancelled",
      source: "revalidation",
      entityType: "post",
      entityId: postId,
      payload: { reason, externalItemId: context.external_item_id }
    });
    return { valid: false, reason };
  }

  if ((current.commissionRate ?? 0) <= 0 || !current.offerLink) {
    const reason = "commission_or_offer_link_unavailable";
    await supabase.rpc("cancel_post", { p_post_id: postId, p_reason: reason });
    return { valid: false, reason };
  }

  const score = scoreOpportunity({
    commissionRate: current.commissionRate,
    discountRate: current.discountRate,
    sales: current.sales,
    rating: current.rating,
    price: current.price,
    priceMin: current.priceMin,
    recentPublicationCount: 0
  });

  if (score.score < 70 || score.confidence < 0.5) {
    const reason = `score_dropped:${score.score}:${score.confidence}`;
    await supabase.rpc("cancel_post", { p_post_id: postId, p_reason: reason });
    await recordOperationalEvent({
      eventType: "distribution.post_cancelled",
      source: "revalidation",
      entityType: "post",
      entityId: postId,
      payload: {
        reason,
        score: score.score,
        confidence: score.confidence,
        externalItemId: context.external_item_id
      }
    });
    return { valid: false, reason };
  }

  const baseUrl = getServerEnv().NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL is required for distribution.");

  const content = buildDeterministicOfferMessage({
    productName: current.productName,
    price: current.price,
    priceMin: current.priceMin,
    discountRate: current.discountRate,
    rating: current.rating,
    sales: current.sales,
    shortUrl: `${baseUrl}/go/${context.short_code}`
  });

  const { error: updateError } = await supabase.rpc("mark_post_revalidated", {
    p_post_id: postId,
    p_state: "valid",
    p_reason: `score=${score.score};confidence=${score.confidence}`,
    p_content: content
  });
  if (updateError) throw updateError;

  await recordOperationalEvent({
    eventType: "distribution.post_revalidated",
    source: "revalidation",
    entityType: "post",
    entityId: postId,
    payload: {
      score: score.score,
      confidence: score.confidence,
      externalItemId: context.external_item_id
    }
  });

  return { valid: true, content };
}
