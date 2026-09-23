export type ShopeeProductOfferRaw = {
  itemId: string | number;
  commissionRate?: string | number | null;
  sellerCommissionRate?: string | number | null;
  shopeeCommissionRate?: string | number | null;
  commission?: string | number | null;
  price?: string | number | null;
  sales?: number | null;
  priceMax?: string | number | null;
  priceMin?: string | number | null;
  productCatIds?: number[] | null;
  ratingStar?: string | number | null;
  priceDiscountRate?: number | null;
  imageUrl?: string | null;
  productName?: string | null;
  shopId?: string | number | null;
  shopName?: string | null;
  shopType?: number[] | null;
  productLink?: string | null;
  offerLink?: string | null;
  periodStartTime?: string | number | null;
  periodEndTime?: string | number | null;
};

export type NormalizedShopeeOffer = {
  provider: "shopee";
  itemId: string;
  shopId: string | null;
  productName: string;
  productLink: string | null;
  offerLink: string;
  imageUrl: string | null;
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
  discountRate: number | null;
  sales: number | null;
  rating: number | null;
  commissionRate: number | null;
  sellerCommissionRate: number | null;
  shopeeCommissionRate: number | null;
  estimatedCommission: number | null;
  categoryIds: number[];
  shopName: string | null;
  periodStartAt: string | null;
  periodEndAt: string | null;
  raw: ShopeeProductOfferRaw;
};

export type ProductOfferParams = {
  shopId?: number;
  itemId?: number;
  productCatId?: number;
  listType?: number;
  matchId?: number;
  keyword?: string;
  sortType?: number;
  page?: number;
  isAMSOffer?: boolean;
  isKeySeller?: boolean;
  limit?: number;
};

export type ProductOffersPage = {
  items: NormalizedShopeeOffer[];
  page: number;
  limit: number;
  hasNextPage: boolean;
};

export type ShortLinkInput = {
  originUrl: string;
  subIds?: string[];
};

export type ShopeeConversionItem = {
  orderId: string;
  itemId: string | null;
  itemName: string | null;
  shopName: string | null;
  itemPrice: number | null;
  quantity: number;
  itemCommission: number | null;
  orderStatus: string | null;
  completeAt: string | null;
  attributionType: string | null;
};

export type NormalizedShopeeConversion = {
  provider: "shopee";
  conversionId: string;
  purchaseAt: string;
  clickAt: string | null;
  totalCommission: number;
  sellerCommission: number | null;
  shopeeCommission: number | null;
  buyerType: string | null;
  device: string | null;
  utmContent: string | null;
  orderStatus: string | null;
  items: ShopeeConversionItem[];
};

export type ConversionReportParams = {
  purchaseTimeStart: number;
  purchaseTimeEnd: number;
  orderStatus?: "ALL" | "UNPAID" | "PENDING" | "COMPLETED" | "CANCELLED";
  limit?: number;
  scrollId?: string;
};

export type ConversionReportPage = {
  items: NormalizedShopeeConversion[];
  hasNextPage: boolean;
  scrollId: string | null;
};
