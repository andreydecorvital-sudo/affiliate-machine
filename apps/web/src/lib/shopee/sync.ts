import type {
  ConversionReportParams,
  ProductOfferParams
} from "@affiliate/providers/shopee";
import { createShopeeAffiliateClient } from "@/lib/shopee/client";
import {
  persistAffiliateLink,
  persistShopeeConversion,
  persistShopeeOfferSnapshot
} from "@/lib/shopee/repository";
import { createManagedShortLink } from "@/lib/attribution/short-links";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/events";

export async function syncShopeeOffers(params: ProductOfferParams = {}) {
  const client = createShopeeAffiliateClient();
  const page = await client.getProductOffers(params);

  let persisted = 0;
  for (const offer of page.items) {
    await persistShopeeOfferSnapshot(offer);
    persisted += 1;
  }

  await recordOperationalEvent({
    eventType: "affiliate.shopee.offers_synced",
    source: "shopee-affiliate",
    payload: {
      fetched: page.items.length,
      persisted,
      page: page.page,
      limit: page.limit,
      hasNextPage: page.hasNextPage,
      keyword: params.keyword ?? null
    }
  });

  return { ...page, persisted };
}

function buildShopeeSubIds(subIds: string[] | undefined, trackingKey: string | undefined) {
  const values = (subIds ?? []).map((value) => value.trim()).filter(Boolean);
  const unique = [...new Set(values)];

  if (trackingKey?.trim() && !unique.includes(trackingKey.trim())) {
    unique.push(trackingKey.trim());
  }

  return unique.slice(0, 5);
}

export async function createTrackedShopeeLink(input: {
  externalItemId: string;
  originUrl: string;
  subIds?: string[];
  trackingKey?: string;
  context?: Record<string, unknown>;
}) {
  const effectiveSubIds = buildShopeeSubIds(input.subIds, input.trackingKey);
  const supabase = createSupabaseAdminClient();

  if (input.trackingKey) {
    const { data: existing, error } = await supabase
      .from("affiliate_links")
      .select("id,affiliate_url")
      .eq("provider", "shopee")
      .eq("tracking_key", input.trackingKey)
      .maybeSingle();

    if (error) throw error;

    if (existing?.id && existing?.affiliate_url) {
      const shortLink = await createManagedShortLink({
        provider: "shopee",
        affiliateLinkId: String(existing.id),
        destinationUrl: String(existing.affiliate_url),
        trackingKey: input.trackingKey,
        context: {
          externalItemId: input.externalItemId,
          subIds: effectiveSubIds,
          ...(input.context ?? {})
        }
      });

      return {
        affiliateLinkId: String(existing.id),
        affiliateUrl: String(existing.affiliate_url),
        subIds: effectiveSubIds,
        shortLink
      };
    }
  }

  const client = createShopeeAffiliateClient();
  const affiliateUrl = await client.generateShortLink({
    originUrl: input.originUrl,
    subIds: effectiveSubIds
  });

  const affiliateLinkId = await persistAffiliateLink({
    provider: "shopee",
    externalItemId: input.externalItemId,
    originUrl: input.originUrl,
    affiliateUrl,
    subIds: effectiveSubIds,
    trackingKey: input.trackingKey
  });

  const shortLink = await createManagedShortLink({
    provider: "shopee",
    affiliateLinkId,
    destinationUrl: affiliateUrl,
    trackingKey: input.trackingKey,
    context: {
      externalItemId: input.externalItemId,
      subIds: effectiveSubIds,
      ...(input.context ?? {})
    }
  });

  await recordOperationalEvent({
    eventType: "affiliate.link.created",
    source: "shopee-affiliate",
    entityType: "affiliate_link",
    entityId: affiliateLinkId,
    idempotencyKey: input.trackingKey
      ? `affiliate-link-created:${input.trackingKey}`
      : undefined,
    payload: {
      externalItemId: input.externalItemId,
      trackingKey: input.trackingKey ?? null,
      subIds: effectiveSubIds,
      shortCode: shortLink.code,
      context: input.context ?? {}
    }
  });

  return {
    affiliateLinkId,
    affiliateUrl,
    subIds: effectiveSubIds,
    shortLink
  };
}

export async function syncShopeeConversions(
  params: Omit<ConversionReportParams, "scrollId">,
  maxPages = 20
) {
  const client = createShopeeAffiliateClient();
  const conversions = await client.getAllConversions(params, maxPages);

  let persisted = 0;
  let totalCommission = 0;

  for (const conversion of conversions) {
    await persistShopeeConversion(conversion);
    persisted += 1;
    totalCommission += conversion.totalCommission;
  }

  await recordOperationalEvent({
    eventType: "affiliate.shopee.conversions_synced",
    source: "shopee-affiliate",
    payload: {
      fetched: conversions.length,
      persisted,
      totalCommission,
      purchaseTimeStart: params.purchaseTimeStart,
      purchaseTimeEnd: params.purchaseTimeEnd
    }
  });

  return {
    fetched: conversions.length,
    persisted,
    totalCommission
  };
}
