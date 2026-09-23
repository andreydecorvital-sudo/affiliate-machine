import { ShopeeAffiliateClient } from "@affiliate/providers/shopee";
import { getServerEnv } from "@/lib/env";

export function isShopeeAffiliateConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.SHOPEE_AFFILIATE_APP_ID && env.SHOPEE_AFFILIATE_SECRET);
}

export function createShopeeAffiliateClient(): ShopeeAffiliateClient {
  const env = getServerEnv();

  if (!env.SHOPEE_AFFILIATE_APP_ID || !env.SHOPEE_AFFILIATE_SECRET) {
    throw new Error("Shopee Affiliate credentials are not configured.");
  }

  return new ShopeeAffiliateClient({
    appId: env.SHOPEE_AFFILIATE_APP_ID,
    secret: env.SHOPEE_AFFILIATE_SECRET,
    endpoint: env.SHOPEE_AFFILIATE_GRAPHQL_URL
  });
}
