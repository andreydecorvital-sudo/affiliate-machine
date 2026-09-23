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
}) {
  const client = createShopeeAffiliateClient();
  const effectiveSubIds = buildShopeeSubIds(input.subIds, input.trackingKey);

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
      subIds: effectiveSubIds
    }
  });

  await recordOperationalEvent({
    eventType: "affiliate.link.created",
    source: "shopee-affiliate",
    entityType: "affiliate_link",
    entityId: affiliateLinkId,
    payload: {
      externalItemId: input.externalItemId,
      trackingKey: input.trackingKey ?? null,
      subIds: effectiveSubIds,
      shortCode: shortLink.code
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
