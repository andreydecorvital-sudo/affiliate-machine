import type {
  MetaAdAccountInfo,
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
  paging?: {
    next?: string;
  };
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

    const text = await response.text();
    let body: unknown = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text.slice(0, 2000) };
      }
    }

    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function numberOrZero(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function integerOrZero(value: unknown): number {
  return Math.trunc(numberOrZero(value));
}

function requiredString(value: unknown, name: string): string {
  const clean = String(value ?? "").trim();
  if (!clean) throw new Error(`${name} is required.`);
  return clean;
}

function normalizeVersion(value: string): string {
  const clean = value.trim();
  if (!/^v\d+\.\d+$/.test(clean)) {
    throw new Error(
      "Meta Graph API version must be explicit, e.g. vXX.X."
    );
  }
  return clean;
}

function normalizeAccountId(value: string): string {
  return requiredString(value, "Meta ad account id")
    .replace(/^act_/i, "");
}

function assertDate(value: string, name: string): string {
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
    this.accessToken = requiredString(
      options.accessToken,
      "Meta access token"
    );
    this.accountId = normalizeAccountId(options.adAccountId);
    this.version = normalizeVersion(options.graphApiVersion);
    this.baseUrl = new URL(
      options.graphBaseUrl ?? "https://graph.facebook.com"
    ).origin;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.transport = options.transport ?? defaultTransport;
  }

  private async get<T>(
    url: URL
  ): Promise<T> {
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
      const retryable =
        error instanceof DOMException
          ? error.name === "AbortError"
          : true;

      throw new MetaAdsReadOnlyError(
        "Meta read-only request failed.",
        {
          retryable,
          details: error instanceof Error ? error.message : error
        }
      );
    }

    const envelope = (response.body ?? {}) as MetaErrorEnvelope;
    const metaError = envelope.error;

    if (
      response.status < 200 ||
      response.status >= 300 ||
      metaError
    ) {
      const retryable =
        response.status === 429 || response.status >= 500;

      throw new MetaAdsReadOnlyError(
        metaError?.message ??
          `Meta read-only HTTP ${response.status}.`,
        {
          status: response.status,
          code: metaError?.code,
          subcode: metaError?.error_subcode,
          retryable,
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
    const currency = requiredString(data.currency, "Meta account currency");

    return {
      accountId: String(data.account_id ?? this.accountId),
      accountName: String(data.name ?? "").trim() || null,
      currency: currency.toUpperCase()
    };
  }

  private async getInsightsPage(
    url: URL
  ): Promise<MetaInsightsSyncPage> {
    const data = await this.get<MetaInsightsEnvelope>(url);

    const items: MetaCampaignInsight[] = [];

    for (const row of data.data ?? []) {
      const campaignId = String(row.campaign_id ?? "").trim();
      const dateStart = String(row.date_start ?? "").trim();

      if (!campaignId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStart)) {
        continue;
      }

      items.push({
        externalAccountId: this.accountId,
        externalCampaignId: campaignId,
        campaignName: String(row.campaign_name ?? "").trim() || null,
        spentOn: dateStart,
        spend: numberOrZero(row.spend),
        impressions: integerOrZero(row.impressions),
        clicks: integerOrZero(row.clicks),
        raw: row
      });
    }

    return {
      items,
      nextUrl:
        typeof data.paging?.next === "string" &&
        data.paging.next.trim()
          ? data.paging.next
          : null
    };
  }

  async getDailyCampaignInsights(
    params: MetaInsightsParams
  ): Promise<MetaCampaignInsight[]> {
    const since = assertDate(params.since, "since");
    const until = assertDate(params.until, "until");
    const maxPages = Math.min(
      Math.max(params.maxPages ?? 20, 1),
      100
    );
    const pageLimit = Math.min(
      Math.max(params.pageLimit ?? 100, 1),
      500
    );

    const first = new URL(
      `/${this.version}/act_${this.accountId}/insights`,
      this.baseUrl
    );
    first.searchParams.set("level", "campaign");
    first.searchParams.set("time_increment", "1");
    first.searchParams.set(
      "fields",
      [
        "account_id",
        "campaign_id",
        "campaign_name",
        "spend",
        "impressions",
        "clicks",
        "date_start",
        "date_stop"
      ].join(",")
    );
    first.searchParams.set(
      "time_range",
      JSON.stringify({ since, until })
    );
    first.searchParams.set("limit", String(pageLimit));

    const items: MetaCampaignInsight[] = [];
    let next: URL | null = first;

    for (let page = 0; page < maxPages && next; page += 1) {
      if (next.origin !== this.baseUrl) {
        throw new MetaAdsReadOnlyError(
          "Meta pagination returned an unexpected host.",
          { retryable: false }
        );
      }

      const result = await this.getInsightsPage(next);
      items.push(...result.items);

      if (!result.nextUrl) {
        next = null;
        break;
      }

      const parsed = new URL(result.nextUrl);
      parsed.searchParams.delete("access_token");
      next = parsed;
    }

    return items;
  }
}
