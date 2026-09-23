import { randomBytes } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function generateShortCode(length = 8): string {
  const safeLength = Math.min(Math.max(Math.trunc(length), 6), 16);
  const bytes = randomBytes(safeLength);
  let result = "";

  for (const byte of bytes) {
    result += ALPHABET[byte % ALPHABET.length];
  }

  return result;
}

export type UserAgentFamily = "bot" | "mobile" | "desktop" | "unknown";

export function classifyUserAgent(value: string | null | undefined): UserAgentFamily {
  if (!value) return "unknown";
  const ua = value.toLowerCase();

  if (/bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp/i.test(ua)) {
    return "bot";
  }

  if (/android|iphone|ipad|mobile/i.test(ua)) {
    return "mobile";
  }

  if (/mozilla|chrome|safari|firefox|edge|edg\//i.test(ua)) {
    return "desktop";
  }

  return "unknown";
}

export function safeReferrerHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().slice(0, 255);
  } catch {
    return null;
  }
}
