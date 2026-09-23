import { getServerEnv, getSupabaseServerKey } from "@/lib/env";

type BridgeAction = "health" | "pair" | "groups" | "send" | "logout";

export type WhatsAppBridgeSendResult = {
  ok: boolean;
  accepted: boolean;
  confirmed: boolean;
  ack: "delivery" | "read" | null;
  messageId: string | null;
  duplicateSuppressed?: boolean;
};

function bridgeUrl() {
  const env = getServerEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }
  return `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/whatsapp-bridge`;
}

export async function callWhatsAppBridge<T>(
  action: BridgeAction,
  payload: Record<string, unknown> = {},
  timeoutMs = 45_000
): Promise<T> {
  const env = getServerEnv();
  const key = getSupabaseServerKey(env);
  if (!key) throw new Error("Supabase server key is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(bridgeUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ action, ...payload }),
      cache: "no-store"
    });

    const text = await response.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }

    if (!response.ok) {
      throw new Error(String(body?.error || `WhatsApp bridge HTTP ${response.status}`));
    }

    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendWhatsAppGroupMessage(input: {
  accountId: string;
  jid: string;
  message: string;
  idempotencyKey: string;
}) {
  return await callWhatsAppBridge<WhatsAppBridgeSendResult>("send", {
    accountId: input.accountId,
    jid: input.jid,
    message: input.message,
    idempotencyKey: input.idempotencyKey
  });
}
