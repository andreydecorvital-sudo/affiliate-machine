export const PRODUCT_OFFERS_QUERY = `query productOfferV2(
  $shopId: Int64
  $itemId: Int64
  $productCatId: Int
  $listType: Int
  $matchId: Int64
  $keyword: String
  $sortType: Int
  $page: Int
  $isAMSOffer: Boolean
  $isKeySeller: Boolean
  $limit: Int
) {
  productOfferV2(
    shopId: $shopId
    itemId: $itemId
    productCatId: $productCatId
    listType: $listType
    matchId: $matchId
    keyword: $keyword
    sortType: $sortType
    page: $page
    isAMSOffer: $isAMSOffer
    isKeySeller: $isKeySeller
    limit: $limit
  ) {
    nodes {
      itemId
      commissionRate
      sellerCommissionRate
      shopeeCommissionRate
      commission
      price
      sales
      priceMax
      priceMin
      productCatIds
      ratingStar
      priceDiscountRate
      imageUrl
      productName
      shopId
      shopName
      shopType
      productLink
      offerLink
      periodStartTime
      periodEndTime
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}`;

export const GENERATE_SHORT_LINK_MUTATION = `mutation generateShortLink($input: GenerateShortLinkInput!) {
  generateShortLink(input: $input) {
    shortLink
  }
}`;

export const CONVERSION_REPORT_QUERY = `query conversionReport(
  $purchaseTimeStart: Int64!
  $purchaseTimeEnd: Int64!
  $orderStatus: DisplayOrderStatus!
  $limit: Int!
  $scrollId: String
) {
  conversionReport(
    purchaseTimeStart: $purchaseTimeStart
    purchaseTimeEnd: $purchaseTimeEnd
    orderStatus: $orderStatus
    limit: $limit
    scrollId: $scrollId
  ) {
    nodes {
      purchaseTime
      clickTime
      conversionId
      totalCommission
      sellerCommission
      shopeeCommissionCapped
      buyerType
      device
      utmContent
      orders {
        orderId
        orderStatus
        items {
          itemId
          itemName
          shopName
          itemPrice
          qty
          itemTotalCommission
          completeTime
          attributionType
        }
      }
    }
    pageInfo {
      limit
      hasNextPage
      scrollId
    }
  }
}`;
