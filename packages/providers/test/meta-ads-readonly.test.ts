import assert from "node:assert/strict";
import test from "node:test";
import {
  MetaAdsReadOnlyClient,
  MetaAdsReadOnlyError
} from "../src/meta/client.ts";

test("fetches account currency with GET-only transport shape", async () => {
  const client = new MetaAdsReadOnlyClient({
    accessToken: "token",
    adAccountId: "act_123",
    graphApiVersion: "v99.0",
    transport: async (request) => {
      assert.match(request.url, /\/v99\.0\/act_123/);
      assert.equal(request.headers.Authorization, "Bearer token");
      return {
        status: 200,
        body: { account_id: "123", name: "Affiliate Ads", currency: "BRL" }
      };
    }
  });

  const account = await client.getAdAccountInfo();
  assert.equal(account.accountId, "123");
  assert.equal(account.currency, "BRL");
});

test("normalizes daily campaign insights", async () => {
  const client = new MetaAdsReadOnlyClient({
    accessToken: "token",
    adAccountId: "123",
    graphApiVersion: "v99.0",
    transport: async (request) => {
      const url = new URL(request.url);
      assert.equal(url.searchParams.get("level"), "campaign");
      return {
        status: 200,
        body: {
          data: [{
            campaign_id: "c1",
            campaign_name: "Casa",
            spend: "12.34",
            impressions: "1000",
            clicks: "44",
            date_start: "2026-09-01"
          }]
        }
      };
    }
  });

  const rows = await client.getDailyCampaignInsights({
    since: "2026-09-01",
    until: "2026-09-01"
  });

  assert.equal(rows[0]?.spend, 12.34);
});

test("normalizes ad-level insights for creative attribution", async () => {
  const client = new MetaAdsReadOnlyClient({
    accessToken: "token",
    adAccountId: "123",
    graphApiVersion: "v99.0",
    transport: async (request) => {
      const url = new URL(request.url);
      assert.equal(url.searchParams.get("level"), "ad");
      assert.match(url.searchParams.get("fields") ?? "", /ad_id/);
      return {
        status: 200,
        body: {
          data: [{
            campaign_id: "c1",
            campaign_name: "Casa",
            adset_id: "s1",
            adset_name: "Broad",
            ad_id: "a1",
            ad_name: "Air Fryer Hook 01",
            spend: "7.25",
            impressions: "500",
            clicks: "22",
            date_start: "2026-09-01"
          }]
        }
      };
    }
  });

  const rows = await client.getDailyAdInsights({
    since: "2026-09-01",
    until: "2026-09-01"
  });

  assert.equal(rows[0]?.externalAdId, "a1");
  assert.equal(rows[0]?.externalAdsetId, "s1");
  assert.equal(rows[0]?.clicks, 22);
});

test("strips access_token from pagination URLs", async () => {
  let calls = 0;
  const client = new MetaAdsReadOnlyClient({
    accessToken: "token",
    adAccountId: "123",
    graphApiVersion: "v99.0",
    transport: async (request) => {
      calls += 1;
      const url = new URL(request.url);
      if (calls === 2) assert.equal(url.searchParams.has("access_token"), false);
      return calls === 1
        ? {
            status: 200,
            body: {
              data: [],
              paging: {
                next: "https://graph.facebook.com/v99.0/act_123/insights?after=x&access_token=leak"
              }
            }
          }
        : { status: 200, body: { data: [] } };
    }
  });

  await client.getDailyCampaignInsights({
    since: "2026-09-01",
    until: "2026-09-02"
  });
  assert.equal(calls, 2);
});

test("requires explicit Graph API version", () => {
  assert.throws(
    () =>
      new MetaAdsReadOnlyClient({
        accessToken: "token",
        adAccountId: "123",
        graphApiVersion: "latest"
      }),
    /version must be explicit/i
  );
});

test("marks rate limit errors as retryable", async () => {
  const client = new MetaAdsReadOnlyClient({
    accessToken: "token",
    adAccountId: "123",
    graphApiVersion: "v99.0",
    transport: async () => ({
      status: 429,
      body: { error: { message: "Too many calls", code: 4 } }
    })
  });

  await assert.rejects(
    () => client.getAdAccountInfo(),
    (error: unknown) => {
      assert.ok(error instanceof MetaAdsReadOnlyError);
      assert.equal(error.options.retryable, true);
      return true;
    }
  );
});
