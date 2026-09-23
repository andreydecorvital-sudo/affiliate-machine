import {
  buildCampaignKey,
  normalizeNiche,
  normalizeUtm
} from "@affiliate/acquisition";
import {
  classifyUserAgent,
  safeReferrerHost
} from "@affiliate/attribution";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AcquisitionRouteInput = {
  niche: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
};

export async function routeAcquisitionVisit(input: AcquisitionRouteInput) {
  const niche = normalizeNiche(input.niche);
  const utmSource = normalizeUtm(input.utmSource);
  const utmMedium = normalizeUtm(input.utmMedium);
  const utmCampaign = normalizeUtm(input.utmCampaign);
  const utmContent = normalizeUtm(input.utmContent);
  const utmTerm = normalizeUtm(input.utmTerm);

  const campaignKey = buildCampaignKey({
    source: utmSource,
    medium: utmMedium,
    campaign: utmCampaign
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("route_acquisition_visit", {
    p_niche: niche,
    p_campaign_key: campaignKey,
    p_utm_source: utmSource,
    p_utm_medium: utmMedium,
    p_utm_campaign: utmCampaign,
    p_utm_content: utmContent,
    p_utm_term: utmTerm,
    p_referrer_host: safeReferrerHost(input.referrer),
    p_user_agent_family: classifyUserAgent(input.userAgent)
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  return {
    niche,
    campaignKey,
    visitId: row?.visit_id ? String(row.visit_id) : null,
    groupId: row?.group_id ? String(row.group_id) : null,
    groupName: row?.group_name ? String(row.group_name) : null,
    inviteUrl: row?.invite_url ? String(row.invite_url) : null,
    routedNiche: row?.routed_niche ? String(row.routed_niche) : null
  };
}

export function isAllowedWhatsAppInviteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "chat.whatsapp.com" || url.hostname.endsWith(".whatsapp.com"))
    );
  } catch {
    return false;
  }
}
