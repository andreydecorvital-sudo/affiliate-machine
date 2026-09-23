import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { callWhatsAppBridge } from "@/lib/whatsapp/bridge";

export async function createWhatsAppAccount(label: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whatsapp_accounts")
    .insert({ label: label.trim(), enabled: false })
    .select("id,label,status,enabled,phone")
    .single();

  if (error) throw error;
  return data;
}

export async function listWhatsAppAccounts() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whatsapp_accounts")
    .select("id,label,status,enabled,phone,last_connected_at,last_error,pairing_qr_data_url,pairing_qr_expires_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function startWhatsAppPairing(accountId: string) {
  return await callWhatsAppBridge("pair", { accountId }, 15_000);
}

export async function syncWhatsAppGroups(accountId: string) {
  return await callWhatsAppBridge<{ ok: boolean; groups: unknown[] }>(
    "groups",
    { accountId },
    45_000
  );
}

export async function configureWhatsAppGroup(input: {
  groupId: string;
  niche: string;
  active: boolean;
  acceptingTraffic: boolean;
  inviteUrl?: string | null;
  capacityLimit?: number | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .update({
      niche: input.niche.trim() || "general",
      active: input.active,
      accepting_traffic: input.acceptingTraffic,
      invite_url: input.inviteUrl?.trim() || null,
      capacity_limit: input.capacityLimit ?? null
    })
    .eq("id", input.groupId)
    .select("id,account_id,group_jid,name,member_count,niche,active,accepting_traffic,invite_url,capacity_limit,last_routed_at")
    .single();

  if (error) throw error;
  return data;
}

export async function setWhatsAppAccountEnabled(accountId: string, enabled: boolean) {
  const supabase = createSupabaseAdminClient();

  if (enabled) {
    const { data: account, error } = await supabase
      .from("whatsapp_accounts")
      .select("status")
      .eq("id", accountId)
      .single();

    if (error) throw error;
    if (account?.status !== "connected") {
      throw new Error("WhatsApp account must be connected before enabling sends.");
    }
  }

  const { data, error } = await supabase
    .from("whatsapp_accounts")
    .update({ enabled })
    .eq("id", accountId)
    .select("id,label,status,enabled,phone")
    .single();

  if (error) throw error;
  return data;
}
