import { createHash } from "node:crypto";

export function buildShopeeAuthorization(
  appId: string,
  secret: string,
  serializedPayload: string,
  timestampSeconds = Math.floor(Date.now() / 1000)
): string {
  const signature = createHash("sha256")
    .update(`${appId}${timestampSeconds}${serializedPayload}${secret}`, "utf8")
    .digest("hex");

  return `SHA256 Credential=${appId}, Timestamp=${timestampSeconds}, Signature=${signature}`;
}
