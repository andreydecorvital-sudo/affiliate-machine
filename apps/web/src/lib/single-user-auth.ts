import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

export const OPERATOR_SESSION_COOKIE = "affiliate_machine_session";

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isSingleUserAccessConfigured() {
  return Boolean(getServerEnv().APP_ACCESS_PASSWORD);
}

export function verifyOperatorPassword(candidate: string) {
  const expected = getServerEnv().APP_ACCESS_PASSWORD;
  if (!expected) return true;

  return timingSafeEqual(hash(candidate), hash(expected));
}

export function buildOperatorSessionValue() {
  const secret = getServerEnv().APP_ACCESS_PASSWORD;
  if (!secret) return null;

  return createHash("sha256")
    .update("affiliate-machine-session:" + secret, "utf8")
    .digest("hex");
}

export async function hasOperatorSession() {
  const expected = buildOperatorSessionValue();
  if (!expected) return true;

  const cookieStore = await cookies();
  const actual = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value ?? "";

  return timingSafeEqual(hash(actual), hash(expected));
}
