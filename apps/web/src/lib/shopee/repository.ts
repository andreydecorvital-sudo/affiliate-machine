import type {
  NormalizedShopeeConversion,
  NormalizedShopeeOffer
} from "@affiliate/providers/shopee";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function persistShopeeOfferSnapshot(
  offer: NormalizedShopeeOffer
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("persist_shopee_offer_snapshot", {
    p_offer: offer
  });

  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("persist_shopee_offer_snapshot returned an invalid product id.");
  }

  return data;
}

export async function persistAffiliateLink(input: {
  provider: string;
  externalItemId: string;
  originUrl: string;
  affiliateUrl: string;
  subIds?: string[];
  trackingKey?: string;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("persist_affiliate_link", {
    p_provider: input.provider,
    p_external_item_id: input.externalItemId,
    p_origin_url: input.originUrl,
    p_affiliate_url: input.affiliateUrl,
    p_sub_ids: input.subIds ?? [],
    p_tracking_key: input.trackingKey ?? null
  });

  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("persist_affiliate_link returned an invalid link id.");
  }

  return data;
}

export async function persistShopeeConversion(
  conversion: NormalizedShopeeConversion
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("persist_shopee_conversion", {
    p_conversion: conversion
  });

  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("persist_shopee_conversion returned an invalid conversion id.");
  }

  return data;
}
