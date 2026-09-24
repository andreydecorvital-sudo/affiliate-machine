import type {
  MetaAdAccountInfo,
  MetaAdInsight,
  MetaCampaignInsight,
  MetaInsightsParams,
  MetaInsightsSyncPage
} from "./types";

type MetaErrorEnvelope = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type MetaInsightsEnvelope = MetaErrorEnvelope & {
  data?: Array<Record<string, unknown>>;
  paging?: { next?: string };
};

export type MetaHttpRequest = {
  url: string;
  headers: Record<string, string>;
  timeoutMs: number;
};

export type MetaHttpResponse = {
  status: number;
  body: unknown;
};

export type MetaHttpTransport = (
  request: MetaHttpRequest
) => Promise<MetaHttpResponse>;

export class MetaAdsReadOnlyError extends Error {
  constructor(
    message: string,
    readonly options: {
      status?: number;
      code?: number;
      subcode?: number;
      retryable?: boolean;
      details?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "MetaAdsReadOnlyError";
  }
}

async function defaultTransport(
  request: MetaHttpRequest
): Promise<MetaHttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const response = await fetch(request.url, {
      method: "GET",
      headers: request.headers,
      signal: controller.signal,
      cache: "no-store"
    });

    const raw = await response.text();
    let body: unknown = null;

    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = { raw: raw.slice(0, 2000) };
      }
    }

    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function numberOrZero(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function integerOrZero(value: unknown) {
  return Math.trunc(numberOrZero(value));
}

function requiredString(value: unknown, name: string) {
  const clean = String(value ?? "").trim();
  if (!clean) throw new Error(`${name} is required.`);
  return clean;
}

function normalizeVersion(value: string) {
  const clean = value.trim();
  if (!/^v\d+\.\d+$/.test(clean)) {
    throw new Error(
      "Meta Graph API version must be explicit, e.g. vXX.X."
    );
  }
  return clean;
}

function normalizeAccountId(value: string) {
  return requiredString(value, "Meta ad account id").replace(/^act_/i, "");
}

function assertDate(value: string, name: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD.`);
  }
  return value;
}

export type MetaAdsReadOnlyClientOptions = {
  accessToken: string;
  adAccountId: string;
  graphApiVersion: string;
  graphBaseUrl?: string;
  timeoutMs?: number;
  transport?: MetaHttpTransport;
};

export class MetaAdsReadOnlyClient {
  private readonly accessToken: string;
  private readonly accountId: string;
  private readonly version: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly transport: MetaHttpTransport;

  constructor(options: MetaAdsReadOnlyClientOptions) {
    this.accessToken = requiredString(options.accessToken, "Meta access token");
    this.accountId = normalizeAccountId(options.adAccountId);
    this.version = normalizeVersion(options.graphApiVersion);
    this.baseUrl = new URL(
      options.graphBaseUrl ?? "https://graph.facebook.com"
    ).origin;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.transport = options.transport ?? defaultTransport;
  }

  private async get<T>(url: URL): Promise<T> {
    let response: MetaHttpResponse;

    try {
      response = await this.transport({
        url: url.toString(),
        timeoutMs: this.timeoutMs,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json"
        }
      });
    } catch (error) {
      throw new MetaAdsReadOnlyError("Meta read-only request failed.", {
        retryable:
          error instanceof DOMException ? error.name === "AbortError" : true,
        details: error instanceof Error ? error.message : error
      });
    }

    const envelope = (response.body ?? {}) as MetaErrorEnvelope;
    const metaError = envelope.error;

    if (response.status < 200 || response.status >= 300 || metaError) {
      throw new MetaAdsReadOnlyError(
        metaError?.message ?? `Meta read-only HTTP ${response.status}.`,
        {
          status: response.status,
          code: metaError?.code,
          subcode: metaError?.error_subcode,
          retryable: response.status === 429 || response.status >= 500,
          details: response.body
        }
      );
    }

    return response.body as T;
  }

  async getAdAccountInfo(): Promise<MetaAdAccountInfo> {
    const url = new URL(
      `/${this.version}/act_${this.accountId}`,
      this.baseUrl
    );
    url.searchParams.set("fields", "account_id,name,currency");

    const data = await this.get<Record<string, unknown>>(url);
    return {
      accountId: String(data.account_id ?? this.accountId),
      accountName: String(data.name ?? "").trim() || null,
      currency: requiredString(data.currency, "Meta account currency").toUpperCase()
    };
  }

  private nextUrl(envelope: MetaInsightsEnvelope) {
    return typeof envelope.paging?.next === "string" &&
      envelope.paging.next.trim()
      ? envelope.paging.next
      : null;
  }

  private async campaignPage(
    url: URL
  ): Promise<MetaInsightsSyncPage<MetaCampaignInsight>> {
    const data = await this.get<MetaInsightsEnvelope>(url);
    const items: MetaCampaignInsight[] = [];

    for (const row of data.data ?? []) {
      const campaignId = String(row.campaign_id ?? "").trim();
      const spentOn = String(row.date_start ?? "").trim();
      if (!campaignId || !/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) continue;

      items.push({
        externalAccountId: this.accountId,
        externalCampaignId: campaignId,
        campaignName: String(row.campaign_name ?? "").trim() || null,
        spentOn,
        spend: numberOrZero(row.spend),
        impressions: integerOrZero(row.impressions),
        clicks: integerOrZero(row.clicks),
        raw: row
      });
    }

    return { items, nextUrl: this.nextUrl(data) };
  }

  private async adPage(
    url: URL
  ): Promise<MetaInsightsSyncPage<MetaAdInsight>> {
    const data = await this.get<MetaInsightsEnvelope>(url);
    const items: MetaAdInsight[] = [];

    for (const row of data.data ?? []) {
      const campaignId = String(row.campaign_id ?? "").trim();
      const adId = String(row.ad_id ?? "").trim();
      const spentOn = String(row.date_start ?? "").trim();
      if (
        !campaignId ||
        !adId ||
        !/^\d{4}-\d{2}-\d{2}$/.test(spentOn)
      ) continue;

      items.push({
        externalAccountId: this.accountId,
        externalCampaignId: campaignId,
        campaignName: String(row.campaign_name ?? "").trim() || null,
        externalAdsetId: String(row.adset_id ?? "").trim() || null,
        adsetName: String(row.adset_name ?? "").trim() || null,
        externalAdId: adId,
        adName: String(row.ad_name ?? "").trim() || null,
        spentOn,
        spend: numberOrZero(row.spend),
        impressions: integerOrZero(row.impressions),
        clicks: integerOrZero(row.clicks),
        raw: row
      });
    }

    return { items, nextUrl: this.nextUrl(data) };
  }

  private async collect<T>(
    first: URL,
    params: MetaInsightsParams,
    load: (url: URL) => Promise<MetaInsightsSyncPage<T>>
  ): Promise<T[]> {
    const maxPages = Math.min(Math.max(params.maxPages ?? 20, 1), 100);
    const items: T[] = [];
    let next: URL | null = first;

    for (let page = 0; page < maxPages && next; page += 1) {
      if (next.origin !== this.baseUrl) {
        throw new MetaAdsReadOnlyError(
          "Meta pagination returned an unexpected host.",
          { retryable: false }
        );
      }

      const result = await load(next);
      items.push(...result.items);

      if (!result.nextUrl) break;
      const parsed = new URL(result.nextUrl);
      parsed.searchParams.delete("access_token");
      next = parsed;
    }

    return items;
  }

  private insightsUrl(
    params: MetaInsightsParams,
    level: "campaign" | "ad",
    fields: string[]
  ) {
    const since = assertDate(params.since, "since");
    const until = assertDate(params.until, "until");
    const pageLimit = Math.min(Math.max(params.pageLimit ?? 100, 1), 500);
    const url = new URL(
      `/${this.version}/act_${this.accountId}/insights`,
      this.baseUrl
    );

    url.searchParams.set("level", level);
    url.searchParams.set("time_increment", "1");
    url.searchParams.set("fields", fields.join(","));
    url.searchParams.set("time_range", JSON.stringify({ since, until }));
    url.searchParams.set("limit", String(pageLimit));
    return url;
  }

  async getDailyCampaignInsights(params: MetaInsightsParams) {
    const first = this.insightsUrl(params, "campaign", [
      "account_id",
      "campaign_id",
      "campaign_name",
      "spend",
      "impressions",
      "clicks",
      "date_start",
      "date_stop"
    ]);

    return this.collect(first, params, (url) => this.campaignPage(url));
  }

  async getDailyAdInsights(params: MetaInsightsParams) {
    const first = this.insightsUrl(params, "ad", [
      "account_id",
      "campaign_id",
      "campaign_name",
      "adset_id",
      "adset_name",
      "ad_id",
      "ad_name",
      "spend",
      "impressions",
      "clicks",
      "date_start",
      "date_stop"
    ]);

    return this.collect(first, params, (url) => this.adPage(url));
  }
}
