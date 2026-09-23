import {
  classifyUserAgent,
  generateShortCode,
  safeReferrerHost
} from "@affiliate/attribution";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";

export type ManagedShortLink = {
  id: string;
  code: string;
  path: string;
  url: string | null;
};

export async function createManagedShortLink(input: {
  provider: string;
  affiliateLinkId: string;
  destinationUrl: string;
  trackingKey?: string;
  context?: Record<string, unknown>;
  expiresAt?: string;
}): Promise<ManagedShortLink> {
  const supabase = createSupabaseAdminClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateShortCode(8);
    const { data, error } = await supabase.rpc("create_short_link", {
      p_code: code,
      p_provider: input.provider,
      p_affiliate_link_id: input.affiliateLinkId,
      p_destination_url: input.destinationUrl,
      p_tracking_key: input.trackingKey ?? null,
      p_context: input.context ?? {},
      p_expires_at: input.expiresAt ?? null
    });

    if (!error && typeof data === "string") {
      const path = `/go/${code}`;
      const baseUrl = getServerEnv().NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? null;
      return {
        id: data,
        code,
        path,
        url: baseUrl ? `${baseUrl}${path}` : null
      };
    }

    if (error?.code !== "23505") {
      throw error ?? new Error("create_short_link returned an invalid id.");
    }
  }

  throw new Error("Could not allocate a unique short-link code.");
}

export async function resolveShortLink(code: string): Promise<{
  id: string;
  destinationUrl: string;
  trackingKey: string | null;
  context: Record<string, unknown>;
} | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("resolve_short_link", {
    p_code: code
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    id: String(row.short_link_id),
    destinationUrl: String(row.destination_url),
    trackingKey: row.tracking_key ? String(row.tracking_key) : null,
    context:
      row.context && typeof row.context === "object"
        ? (row.context as Record<string, unknown>)
        : {}
  };
}

export async function recordClick(input: {
  shortLinkId: string;
  referrer: string | null;
  userAgent: string | null;
}): Promise<void> {
  const family = classifyUserAgent(input.userAgent);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("record_short_link_click", {
    p_short_link_id: input.shortLinkId,
    p_referrer_host: safeReferrerHost(input.referrer),
    p_user_agent_family: family,
    p_is_bot: family === "bot"
  });

  if (error) throw error;
}
