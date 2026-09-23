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

export type MetaInsightsParams = {
  since: string;
  until: string;
  maxPages?: number;
  pageLimit?: number;
};

export type MetaInsightsSyncPage = {
  items: MetaCampaignInsight[];
  nextUrl: string | null;
};
