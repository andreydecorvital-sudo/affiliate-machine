import assert from "node:assert/strict";
import test from "node:test";
import { ShopeeAffiliateClient, type ShopeeHttpRequest } from "../src/shopee/client.ts";

test("normalizes productOfferV2 and signs the exact serialized body", async () => {
  let captured: ShopeeHttpRequest | null = null;

  const client = new ShopeeAffiliateClient({
    appId: "app",
    secret: "secret",
    now: () => 1700000000000,
    transport: async (request) => {
      captured = request;
      return {
        status: 200,
        body: {
          data: {
            productOfferV2: {
              nodes: [
                {
                  itemId: 123,
                  shopId: 45,
                  productName: " Air Fryer ",
                  offerLink: "https://s.shopee.com.br/x",
                  priceMin: "199.90",
                  priceMax: "249.90",
                  priceDiscountRate: 35,
                  sales: 10000,
                  ratingStar: "4.8",
                  commissionRate: "0.12",
                  productCatIds: [1, 2]
                }
              ],
              pageInfo: { page: 1, limit: 50, hasNextPage: false }
            }
          }
        }
      };
    }
  });

  const page = await client.getProductOffers({ keyword: "air fryer" });

  assert.equal(page.items.length, 1);
  assert.equal(page.items[0]?.itemId, "123");
  assert.equal(page.items[0]?.productName, "Air Fryer");
  assert.equal(page.items[0]?.priceMin, 199.9);
  assert.equal(page.items[0]?.commissionRate, 0.12);
  assert.match(captured?.headers.Authorization ?? "", /^SHA256 Credential=app,/);
  assert.equal(JSON.parse(captured?.body ?? "{}").operationName, "productOfferV2");
});

test("generates short link with attribution subIds", async () => {
  const client = new ShopeeAffiliateClient({
    appId: "app",
    secret: "secret",
    transport: async (request) => {
      const body = JSON.parse(request.body);
      assert.deepEqual(body.variables.input.subIds, ["casa", "grupo-01", "post-99"]);
      return {
        status: 200,
        body: { data: { generateShortLink: { shortLink: "https://s.shopee.com.br/abc" } } }
      };
    }
  });

  const link = await client.generateShortLink({
    originUrl: "https://shopee.com.br/product",
    subIds: ["casa", "grupo-01", "post-99"]
  });

  assert.equal(link, "https://s.shopee.com.br/abc");
});

test("normalizes conversion report", async () => {
  const client = new ShopeeAffiliateClient({
    appId: "app",
    secret: "secret",
    transport: async () => ({
      status: 200,
      body: {
        data: {
          conversionReport: {
            nodes: [
              {
                conversionId: "conv-1",
                purchaseTime: 1700000000,
                clickTime: 1699999900,
                totalCommission: "12.34",
                utmContent: "post-99",
                orders: [
                  {
                    orderId: "order-1",
                    orderStatus: "COMPLETED",
                    items: [
                      {
                        itemId: "123",
                        itemName: "Air Fryer",
                        qty: 1,
                        itemPrice: "199.90",
                        itemTotalCommission: "12.34"
                      }
                    ]
                  }
                ]
              }
            ],
            pageInfo: { hasNextPage: false, scrollId: null }
          }
        }
      }
    })
  });

  const page = await client.getConversionReport({
    purchaseTimeStart: 1699900000,
    purchaseTimeEnd: 1700100000
  });

  assert.equal(page.items[0]?.conversionId, "conv-1");
  assert.equal(page.items[0]?.totalCommission, 12.34);
  assert.equal(page.items[0]?.items[0]?.orderId, "order-1");
});
