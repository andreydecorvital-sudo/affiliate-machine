import { createHash } from "node:crypto";

export type DeliveryStatus =
  | "queued"
  | "sending"
  | "accepted"
  | "confirmed"
  | "failed"
  | "skipped";

export function createDeliveryIdempotencyKey(postId: string, groupId: string): string {
  const digest = createHash("sha256")
    .update(`${postId}|${groupId}`)
    .digest("hex")
    .slice(0, 40);
  return `delivery:${digest}`;
}

export function retryDelaySeconds(attempt: number): number {
  const safeAttempt = Math.max(1, Math.trunc(attempt));
  return Math.min(3600, 30 * 2 ** (safeAttempt - 1));
}
