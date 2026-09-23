import {
  createTrackingTag,
  replaceOfferTrackingUrl
} from "@affiliate/distribution";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createTrackedShopeeLink } from "@/lib/shopee/sync";
import { applyActiveMessageExperiment } from "@/lib/experiments/assignment";
import { recordOperationalEvent } from "@/lib/events";

type DeliveryTrackingContext = {
  delivery_id: string;
  post_id: string;
  group_id: string;
  group_name: string;
  niche: string;
  external_item_id: string;
  origin_url: string;
  product_name: string;
  price: number | string | null;
  price_min: number | string | null;
  discount_rate: number | string | null;
  sales: number | string | null;
  rating: number | string | null;
  affiliate_link_id: string | null;
  short_link_id: string | null;
  tracking_key: string | null;
  content_override: string | null;
};

export async function prepareDeliveryTracking(input: {
  deliveryId: string;
  baseContent: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_delivery_tracking_context", {
    p_delivery_id: input.deliveryId
  });

  if (error) throw error;

  const context = (Array.isArray(data) ? data[0] : null) as
    | DeliveryTrackingContext
    | null;

  if (!context) {
    throw new Error(
      `Delivery tracking context not found: ${input.deliveryId}`
    );
  }

  if (
    context.affiliate_link_id &&
    context.short_link_id &&
    context.tracking_key &&
    context.content_override
  ) {
    return {
      affiliateLinkId: context.affiliate_link_id,
      shortLinkId: context.short_link_id,
      trackingKey: context.tracking_key,
      content: context.content_override,
      experiment: null,
      reused: true
    };
  }

  const trackingKey = createTrackingTag("d", context.delivery_id, 12);
  const groupTag = createTrackingTag("g", context.group_id, 10);
  const postTag = createTrackingTag("p", context.post_id, 10);

  const link = await createTrackedShopeeLink({
    externalItemId: context.external_item_id,
    originUrl: context.origin_url,
    subIds: [context.niche, groupTag, postTag],
    trackingKey,
    context: {
      deliveryId: context.delivery_id,
      postId: context.post_id,
      groupId: context.group_id,
      groupName: context.group_name,
      niche: context.niche
    }
  });

  if (!link.shortLink.url) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required for delivery tracking."
    );
  }

  const trackedContent = replaceOfferTrackingUrl(
    input.baseContent,
    link.shortLink.url
  );

  const experimentResult = await applyActiveMessageExperiment({
    deliveryId: context.delivery_id,
    content: trackedContent
  });

  const content = experimentResult.content;

  const { error: attachError } = await supabase.rpc(
    "attach_delivery_tracking",
    {
      p_delivery_id: context.delivery_id,
      p_affiliate_link_id: link.affiliateLinkId,
      p_short_link_id: link.shortLink.id,
      p_tracking_key: trackingKey,
      p_content: content
    }
  );

  if (attachError) throw attachError;

  await recordOperationalEvent({
    eventType: "distribution.delivery_tracking_ready",
    source: "distribution",
    entityType: "post_delivery",
    entityId: context.delivery_id,
    idempotencyKey: `delivery-tracking:${trackingKey}`,
    payload: {
      postId: context.post_id,
      groupId: context.group_id,
      trackingKey,
      groupTag,
      postTag,
      shortCode: link.shortLink.code,
      experiment: experimentResult.experiment
    }
  });

  return {
    affiliateLinkId: link.affiliateLinkId,
    shortLinkId: link.shortLink.id,
    trackingKey,
    content,
    experiment: experimentResult.experiment,
    reused: false
  };
}
