export type MetaAdAccountInfo = {
  accountId: string;
  accountName: string | null;
  currency: string;
};

export type MetaCampaignInsight = {
  externalAccountId: string;
  externalCampaignId: string;
  campaignName: string | null;
  spentOn: string;
  spend: number;
  impressions: number;
  clicks: number;
  raw: Record<string, unknown>;
};

export type MetaAdInsight = {
  externalAccountId: string;
  externalCampaignId: string;
  campaignName: string | null;
  externalAdsetId: string | null;
  adsetName: string | null;
  externalAdId: string;
  adName: string | null;
  spentOn: string;
  spend: number;
  impressions: number;
  clicks: number;
  raw: Record<string, unknown>;
};

export type MetaInsightsParams = {
  since: string;
  until: string;
  maxPages?: number;
  pageLimit?: number;
};

export type MetaInsightsSyncPage<T> = {
  items: T[];
  nextUrl: string | null;
};
