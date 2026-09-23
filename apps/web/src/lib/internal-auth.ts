import { getServerEnv } from "@/lib/env";

export function isInternalRequestAuthorized(headers: Headers): boolean {
  const secret = getServerEnv().INTERNAL_JOB_SECRET;
  if (!secret) return false;

  const authorization = headers.get("authorization");
  if (authorization === `Bearer ${secret}`) return true;

  return headers.get("x-internal-job-secret") === secret;
}
