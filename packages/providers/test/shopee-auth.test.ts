import assert from "node:assert/strict";
import test from "node:test";
import { buildShopeeAuthorization } from "../src/shopee/auth.ts";

test("builds Shopee SHA256 authorization deterministically", () => {
  const payload = '{"query":"query Test { ping }","operationName":"Test"}';
  const authorization = buildShopeeAuthorization(
    "app123",
    "secret456",
    payload,
    1700000000
  );

  assert.equal(
    authorization,
    "SHA256 Credential=app123, Timestamp=1700000000, Signature=0c6017f9561ae427c39a4c0a9e505eff60eb5766400bdf2d53235f5d8b6aa424"
  );
});
