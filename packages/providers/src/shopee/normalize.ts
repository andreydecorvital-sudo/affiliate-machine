import type {
  NormalizedShopeeConversion,
  NormalizedShopeeOffer,
  ShopeeProductOfferRaw
} from "./types";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function toId(value: unknown): string {
  return String(value ?? "").trim();
}

function toIsoFromUnix(value: unknown): string | null {
  const numeric = toNumber(value);
  if (!numeric || numeric <= 0) return null;
  const ms = numeric > 1e12 ? numeric : numeric * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeShopeeOffer(raw: ShopeeProductOfferRaw): NormalizedShopeeOffer | null {
  const itemId = toId(raw.itemId);
  const offerLink = String(raw.offerLink ?? "").trim();

  if (!itemId || !offerLink) return null;

  return {
    provider: "shopee",
    itemId,
    shopId: raw.shopId == null ? null : toId(raw.shopId),
    productName: String(raw.productName ?? "").trim() || "Produto sem nome",
    productLink: raw.productLink ? String(raw.productLink) : null,
    offerLink,
    imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
    price: toNumber(raw.price),
    priceMin: toNumber(raw.priceMin),
    priceMax: toNumber(raw.priceMax),
    discountRate: toNumber(raw.priceDiscountRate),
    sales: toNumber(raw.sales),
    rating: toNumber(raw.ratingStar),
    commissionRate: toNumber(raw.commissionRate),
    sellerCommissionRate: toNumber(raw.sellerCommissionRate),
    shopeeCommissionRate: toNumber(raw.shopeeCommissionRate),
    estimatedCommission: toNumber(raw.commission),
    categoryIds: Array.isArray(raw.productCatIds) ? raw.productCatIds.filter(Number.isFinite) : [],
    shopName: raw.shopName ? String(raw.shopName) : null,
    periodStartAt: toIsoFromUnix(raw.periodStartTime),
    periodEndAt: toIsoFromUnix(raw.periodEndTime),
    raw
  };
}

type RawConversion = {
  conversionId: string | number;
  purchaseTime: string | number;
  clickTime?: string | number | null;
  totalCommission?: string | number | null;
  sellerCommission?: string | number | null;
  shopeeCommissionCapped?: string | number | null;
  buyerType?: string | null;
  device?: string | null;
  utmContent?: string | null;
  orders?: Array<{
    orderId?: string | number;
    orderStatus?: string | null;
    items?: Array<{
      itemId?: string | number | null;
      itemName?: string | null;
      shopName?: string | null;
      itemPrice?: string | number | null;
      qty?: number | null;
      itemTotalCommission?: string | number | null;
      completeTime?: string | number | null;
      attributionType?: string | null;
    }>;
  }>;
};

export function normalizeShopeeConversion(raw: RawConversion): NormalizedShopeeConversion {
  const items: NormalizedShopeeConversion["items"] = [];
  let orderStatus: string | null = null;

  for (const order of raw.orders ?? []) {
    orderStatus ??= order.orderStatus ?? null;
    const orderId = toId(order.orderId ?? "unknown");

    for (const item of order.items ?? []) {
      items.push({
        orderId,
        itemId: item.itemId == null ? null : toId(item.itemId),
        itemName: item.itemName ?? null,
        shopName: item.shopName ?? null,
        itemPrice: toNumber(item.itemPrice),
        quantity: Math.max(1, Math.trunc(toNumber(item.qty) ?? 1)),
        itemCommission: toNumber(item.itemTotalCommission),
        orderStatus: order.orderStatus ?? null,
        completeAt: toIsoFromUnix(item.completeTime),
        attributionType: item.attributionType ?? null
      });
    }
  }

  return {
    provider: "shopee",
    conversionId: toId(raw.conversionId),
    purchaseAt: toIsoFromUnix(raw.purchaseTime) ?? new Date(0).toISOString(),
    clickAt: toIsoFromUnix(raw.clickTime),
    totalCommission: toNumber(raw.totalCommission) ?? 0,
    sellerCommission: toNumber(raw.sellerCommission),
    shopeeCommission: toNumber(raw.shopeeCommissionCapped),
    buyerType: raw.buyerType ?? null,
    device: raw.device ?? null,
    utmContent: raw.utmContent ?? null,
    orderStatus,
    items
  };
}
