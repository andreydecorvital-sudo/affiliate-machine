import { buildShopeeAuthorization } from "./auth.ts";
import { normalizeShopeeConversion, normalizeShopeeOffer } from "./normalize.ts";
import {
  CONVERSION_REPORT_QUERY,
  GENERATE_SHORT_LINK_MUTATION,
  PRODUCT_OFFERS_QUERY
} from "./queries.ts";
import type {
  ConversionReportPage,
  ConversionReportParams,
  ProductOfferParams,
  ProductOffersPage,
  ShopeeProductOfferRaw,
  ShortLinkInput
} from "./types.ts";

type GraphQLError = {
  message?: string;
  extensions?: {
    code?: string | number;
    message?: string;
  };
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

export type ShopeeHttpRequest = {
  url: string;
  body: string;
  headers: Record<string, string>;
  timeoutMs: number;
};

export type ShopeeHttpResponse = {
  status: number;
  body: unknown;
};

export type ShopeeHttpTransport = (request: ShopeeHttpRequest) => Promise<ShopeeHttpResponse>;

export class ShopeeAffiliateError extends Error {
  constructor(
    message: string,
    readonly options: {
      status?: number;
      code?: string | number;
      retryable?: boolean;
      details?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "ShopeeAffiliateError";
  }
}

async function defaultTransport(request: ShopeeHttpRequest): Promise<ShopeeHttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: controller.signal
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

export type ShopeeAffiliateClientOptions = {
  appId: string;
  secret: string;
  endpoint?: string;
  timeoutMs?: number;
  transport?: ShopeeHttpTransport;
  now?: () => number;
};

export class ShopeeAffiliateClient {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly transport: ShopeeHttpTransport;
  private readonly now: () => number;

  constructor(private readonly options: ShopeeAffiliateClientOptions) {
    if (!options.appId.trim()) throw new Error("Shopee appId is required.");
    if (!options.secret.trim()) throw new Error("Shopee secret is required.");

    this.endpoint = options.endpoint ?? "https://open-api.affiliate.shopee.com.br/graphql";
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.transport = options.transport ?? defaultTransport;
    this.now = options.now ?? Date.now;
  }

  private async execute<T>(
    operationName: string,
    query: string,
    variables: Record<string, unknown>
  ): Promise<T> {
    const payload = JSON.stringify({ operationName, query, variables });
    const timestamp = Math.floor(this.now() / 1000);
    const authorization = buildShopeeAuthorization(
      this.options.appId,
      this.options.secret,
      payload,
      timestamp
    );

    let response: ShopeeHttpResponse;
    try {
      response = await this.transport({
        url: this.endpoint,
        body: payload,
        timeoutMs: this.timeoutMs,
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });
    } catch (error) {
      const retryable =
        error instanceof DOMException ? error.name === "AbortError" : true;
      throw new ShopeeAffiliateError("Shopee request failed.", {
        retryable,
        details: error instanceof Error ? error.message : error
      });
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (response.status < 200 || response.status >= 300) {
      throw new ShopeeAffiliateError(`Shopee HTTP ${response.status}.`, {
        status: response.status,
        retryable,
        details: response.body
      });
    }

    const envelope = response.body as GraphQLResponse<T>;
    if (envelope.errors?.length) {
      const first = envelope.errors[0]!;
      throw new ShopeeAffiliateError(
        first.extensions?.message ?? first.message ?? "Shopee GraphQL error.",
        {
          status: response.status,
          code: first.extensions?.code,
          retryable: false,
          details: envelope.errors
        }
      );
    }

    if (!envelope.data) {
      throw new ShopeeAffiliateError("Shopee response is missing data.", {
        status: response.status,
        retryable: false,
        details: response.body
      });
    }

    return envelope.data;
  }

  async getProductOffers(params: ProductOfferParams = {}): Promise<ProductOffersPage> {
    const variables = {
      shopId: params.shopId ?? null,
      itemId: params.itemId ?? null,
      productCatId: params.productCatId ?? null,
      listType: params.listType ?? 0,
      matchId: params.matchId ?? null,
      keyword: params.keyword?.trim() || null,
      sortType: params.sortType ?? 0,
      page: params.page ?? 1,
      isAMSOffer: params.isAMSOffer ?? null,
      isKeySeller: params.isKeySeller ?? null,
      limit: Math.min(Math.max(params.limit ?? 50, 1), 100)
    };

    const data = await this.execute<{
      productOfferV2: {
        nodes?: ShopeeProductOfferRaw[];
        pageInfo?: { page?: number; limit?: number; hasNextPage?: boolean };
      };
    }>("productOfferV2", PRODUCT_OFFERS_QUERY, variables);

    const result = data.productOfferV2;
    const items = (result?.nodes ?? [])
      .map(normalizeShopeeOffer)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items,
      page: result?.pageInfo?.page ?? variables.page,
      limit: result?.pageInfo?.limit ?? variables.limit,
      hasNextPage: Boolean(result?.pageInfo?.hasNextPage)
    };
  }

  async generateShortLink(input: ShortLinkInput): Promise<string> {
    const originUrl = input.originUrl.trim();
    if (!originUrl) throw new Error("originUrl is required.");

    const subIds = (input.subIds ?? [])
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 5);

    const data = await this.execute<{
      generateShortLink?: { shortLink?: string | null };
    }>("generateShortLink", GENERATE_SHORT_LINK_MUTATION, {
      input: {
        originUrl,
        ...(subIds.length ? { subIds } : {})
      }
    });

    const shortLink = data.generateShortLink?.shortLink?.trim();
    if (!shortLink) {
      throw new ShopeeAffiliateError("Shopee did not return a short link.", {
        retryable: false,
        details: data
      });
    }

    return shortLink;
  }

  async getConversionReport(params: ConversionReportParams): Promise<ConversionReportPage> {
    if (params.purchaseTimeEnd <= params.purchaseTimeStart) {
      throw new Error("purchaseTimeEnd must be greater than purchaseTimeStart.");
    }

    const variables = {
      purchaseTimeStart: params.purchaseTimeStart,
      purchaseTimeEnd: params.purchaseTimeEnd,
      orderStatus: params.orderStatus ?? "ALL",
      limit: Math.min(Math.max(params.limit ?? 50, 1), 100),
      scrollId: params.scrollId ?? null
    };

    const data = await this.execute<{
      conversionReport?: {
        nodes?: unknown[];
        pageInfo?: { hasNextPage?: boolean; scrollId?: string | null };
      };
    }>("conversionReport", CONVERSION_REPORT_QUERY, variables);

    return {
      items: (data.conversionReport?.nodes ?? []).map((item) =>
        normalizeShopeeConversion(item as Parameters<typeof normalizeShopeeConversion>[0])
      ),
      hasNextPage: Boolean(data.conversionReport?.pageInfo?.hasNextPage),
      scrollId: data.conversionReport?.pageInfo?.scrollId ?? null
    };
  }

  async getAllConversions(
    params: Omit<ConversionReportParams, "scrollId">,
    maxPages = 20
  ) {
    const items = [];
    let scrollId: string | undefined;

    for (let page = 0; page < Math.max(1, maxPages); page += 1) {
      const result = await this.getConversionReport({
        ...params,
        ...(scrollId ? { scrollId } : {})
      });

      items.push(...result.items);
      if (!result.hasNextPage || !result.scrollId) break;
      scrollId = result.scrollId;
    }

    return items;
  }
}
