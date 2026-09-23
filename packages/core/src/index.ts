import { createHash } from "node:crypto";

export const QUEUE_NAMES = [
  "offer_hunting",
  "offer_revalidation",
  "creative_generation",
  "post_distribution",
  "conversion_sync",
  "analytics_rollup"
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export function parseGate(value: string | undefined): boolean {
  return value === "1";
}

export function createIdempotencyKey(
  scope: string,
  parts: Array<string | number | boolean | null | undefined>
): string {
  const payload = [scope, ...parts.map((part) => String(part ?? ""))].join("|");
  const digest = createHash("sha256").update(payload).digest("hex").slice(0, 40);
  return `${scope}:${digest}`;
}

export function isQueueName(value: string): value is QueueName {
  return (QUEUE_NAMES as readonly string[]).includes(value);
}
