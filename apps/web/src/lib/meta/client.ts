import { MetaAdsReadOnlyClient } from "@affiliate/providers/meta";
import { getServerEnv } from "@/lib/env";

export function getMetaAdsReadOnlyConfig() {
  const env = getServerEnv();

  return {
    configured: Boolean(
      env.META_ACCESS_TOKEN &&
      env.META_AD_ACCOUNT_ID &&
      env.META_GRAPH_API_VERSION
    ),
    adAccountId: env.META_AD_ACCOUNT_ID ?? null,
    graphApiVersion: env.META_GRAPH_API_VERSION ?? null,
    graphBaseUrl: env.META_GRAPH_BASE_URL
  };
}

export function createMetaAdsReadOnlyClient() {
  const env = getServerEnv();

  if (!env.META_ACCESS_TOKEN) {
    throw new Error("META_ACCESS_TOKEN is not configured.");
  }
  if (!env.META_AD_ACCOUNT_ID) {
    throw new Error("META_AD_ACCOUNT_ID is not configured.");
  }
  if (!env.META_GRAPH_API_VERSION) {
    throw new Error(
      "META_GRAPH_API_VERSION is required; no Graph API version is guessed."
    );
  }

  return new MetaAdsReadOnlyClient({
    accessToken: env.META_ACCESS_TOKEN,
    adAccountId: env.META_AD_ACCOUNT_ID,
    graphApiVersion: env.META_GRAPH_API_VERSION,
    graphBaseUrl: env.META_GRAPH_BASE_URL
  });
}
