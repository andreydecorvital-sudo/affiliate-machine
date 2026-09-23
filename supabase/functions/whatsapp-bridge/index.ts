import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import makeWASocket, {
  BufferJSON,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  proto
} from "npm:baileys@7.0.0-rc14";
import pino from "npm:pino@9.6.0";
import QRCode from "npm:qrcode@1.5.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const logger = pino({ level: "silent" });

type AuthBundle = {
  files: Record<string, string>;
  phone?: string | null;
  updatedAt?: string;
};

type DeliveryAck = {
  confirmed: boolean;
  ack: "delivery" | "read" | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    ...extra
  };
}

async function authorized(req: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const bearer = String(req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const apiKey = String(req.headers.get("apikey") || "").trim();
  return Boolean(bearer && apiKey && bearer === SERVICE_KEY && apiKey === SERVICE_KEY);
}

async function rest<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: headers(extraHeaders),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase REST ${method} ${path} failed (HTTP ${response.status}): ${text.slice(0, 500)}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

function fileName(name: string) {
  return name.replace(/\//g, "__").replace(/:/g, "-");
}

function createBundleAuthState(bundle: AuthBundle | null) {
  const working: AuthBundle = {
    files: { ...(bundle?.files || {}) },
    phone: bundle?.phone || null,
    updatedAt: bundle?.updatedAt || new Date().toISOString()
  };

  let dirty = false;

  const readData = (file: string): any => {
    const raw = working.files[fileName(file)];
    if (!raw) return null;
    try {
      return JSON.parse(raw, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const writeData = (data: any, file: string) => {
    working.files[fileName(file)] = JSON.stringify(data, BufferJSON.replacer);
    dirty = true;
  };

  const removeData = (file: string) => {
    const key = fileName(file);
    if (key in working.files) {
      delete working.files[key];
      dirty = true;
    }
  };

  const creds = readData("creds.json") || initAuthCreds();

  const state = {
    creds,
    keys: {
      get: async (type: string, ids: string[]) => {
        const result: Record<string, any> = {};
        for (const id of ids) {
          let value = readData(`${type}-${id}.json`);
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          result[id] = value;
        }
        return result;
      },
      set: async (data: Record<string, Record<string, any>>) => {
        for (const [category, values] of Object.entries(data || {})) {
          for (const [id, value] of Object.entries(values || {})) {
            const file = `${category}-${id}.json`;
            if (value) writeData(value, file);
            else removeData(file);
          }
        }
      }
    }
  };

  const saveCreds = async () => {
    writeData(creds, "creds.json");
  };

  return {
    state,
    saveCreds,
    getBundle: (phone?: string | null) => ({
      ...working,
      phone: phone === undefined ? working.phone || null : phone,
      updatedAt: new Date().toISOString()
    }),
    isDirty: () => dirty
  };
}

async function loadAuth(accountId: string): Promise<AuthBundle | null> {
  const rows = await rest<Array<{ auth_bundle?: AuthBundle }>>(
    "GET",
    `/whatsapp_session_secrets?account_id=eq.${encodeURIComponent(accountId)}&select=auth_bundle&limit=1`
  );
  return rows[0]?.auth_bundle ?? null;
}

async function saveAuth(accountId: string, bundle: AuthBundle) {
  await rest(
    "POST",
    "/whatsapp_session_secrets?on_conflict=account_id",
    [{ account_id: accountId, auth_bundle: bundle, updated_at: new Date().toISOString() }],
    { Prefer: "resolution=merge-duplicates,return=minimal" }
  );
}

async function deleteAuth(accountId: string) {
  await rest(
    "DELETE",
    `/whatsapp_session_secrets?account_id=eq.${encodeURIComponent(accountId)}`
  );
}

async function patchAccount(accountId: string, patch: Record<string, unknown>) {
  await rest(
    "PATCH",
    `/whatsapp_accounts?id=eq.${encodeURIComponent(accountId)}`,
    { ...patch, updated_at: new Date().toISOString() },
    { Prefer: "return=minimal" }
  );
}

async function getAccount(accountId: string) {
  const rows = await rest<Array<{
    id: string;
    enabled: boolean;
    status: string;
  }>>(
    "GET",
    `/whatsapp_accounts?id=eq.${encodeURIComponent(accountId)}&select=id,enabled,status&limit=1`
  );
  return rows[0] ?? null;
}

function phoneFromJid(value: unknown): string | null {
  const raw = String(value || "").split(":")[0]?.split("@")[0] || "";
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

class ConnectionClosedError extends Error {
  statusCode: number | null;
  loggedOut: boolean;
  restartRequired: boolean;

  constructor(message: string, statusCode: number | null) {
    super(message);
    this.statusCode = statusCode;
    this.loggedOut = statusCode === DisconnectReason.loggedOut;
    this.restartRequired =
      statusCode === DisconnectReason.restartRequired || statusCode === 515;
  }
}

async function waitForOpen(sock: any, timeoutMs: number) {
  return await new Promise<void>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error("WhatsApp connection timeout."));
      }
    }, timeoutMs);

    const handler = (update: any) => {
      if (done) return;
      if (update?.connection === "open") {
        done = true;
        clearTimeout(timer);
        resolve();
        return;
      }
      if (update?.connection === "close") {
        done = true;
        clearTimeout(timer);
        const code = Number(
          update?.lastDisconnect?.error?.output?.statusCode ||
          update?.lastDisconnect?.error?.statusCode ||
          0
        ) || null;
        reject(new ConnectionClosedError("WhatsApp connection closed.", code));
      }
    };

    sock.ev.on("connection.update", handler);
  });
}

async function connect(accountId: string, options: {
  timeoutMs?: number;
  onQr?: (qr: string) => Promise<void>;
}) {
  const stored = await loadAuth(accountId);
  const auth = createBundleAuthState(stored);

  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: auth.state as any,
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  });

  sock.ev.on("creds.update", auth.saveCreds);
  if (options.onQr) {
    sock.ev.on("connection.update", (update: any) => {
      if (update?.qr) void options.onQr?.(update.qr).catch(() => undefined);
    });
  }

  try {
    await waitForOpen(sock, options.timeoutMs ?? 30_000);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await auth.saveCreds();
    const phone =
      phoneFromJid(sock.user?.id) ||
      phoneFromJid((auth.state as any)?.creds?.me?.id) ||
      stored?.phone ||
      null;

    await saveAuth(accountId, auth.getBundle(phone));
    await patchAccount(accountId, {
      status: "connected",
      phone,
      last_connected_at: new Date().toISOString(),
      last_error: null,
      pairing_qr_data_url: null,
      pairing_qr_expires_at: null
    });

    return { sock, phone };
  } catch (error) {
    await saveAuth(accountId, auth.getBundle(stored?.phone || null)).catch(() => undefined);
    try { sock.end(undefined); } catch {}
    throw error;
  }
}

async function withSocket<T>(accountId: string, fn: (sock: any) => Promise<T>) {
  const auth = await loadAuth(accountId);
  if (!auth?.files?.["creds.json"]) {
    throw new Error("WhatsApp account is not paired.");
  }

  let sock: any = null;
  try {
    const connected = await connect(accountId, { timeoutMs: 30_000 });
    sock = connected.sock;
    return await fn(sock);
  } catch (error) {
    const closed = error instanceof ConnectionClosedError ? error : null;
    if (closed?.loggedOut) {
      await deleteAuth(accountId).catch(() => undefined);
      await patchAccount(accountId, {
        status: "disconnected",
        phone: null,
        last_error: "WhatsApp session logged out."
      }).catch(() => undefined);
    } else {
      await patchAccount(accountId, {
        status: "error",
        last_error: error instanceof Error ? error.message : String(error)
      }).catch(() => undefined);
    }
    throw error;
  } finally {
    try { sock?.end(undefined); } catch {}
  }
}

async function syncGroups(accountId: string, sock: any) {
  const all = await sock.groupFetchAllParticipating();
  const rows = Object.values(all || {}).map((group: any) => ({
    account_id: accountId,
    group_jid: String(group.id || ""),
    name: String(group.subject || "Grupo sem nome").slice(0, 255),
    member_count: Array.isArray(group.participants) ? group.participants.length : 0,
    last_synced_at: new Date().toISOString()
  })).filter((row) => /^[A-Za-z0-9_.:-]+@g\.us$/.test(row.group_jid));

  if (rows.length) {
    await rest(
      "POST",
      "/whatsapp_groups?on_conflict=account_id,group_jid",
      rows,
      { Prefer: "resolution=merge-duplicates,return=minimal" }
    );
  }

  return rows;
}

function ackFromStatus(status: unknown): DeliveryAck["ack"] {
  const value = Number(status);
  if (value === Number(proto.WebMessageInfo.Status.READ)) return "read";
  if (value === Number(proto.WebMessageInfo.Status.DELIVERY_ACK)) return "delivery";
  return null;
}

async function waitForAck(
  sock: any,
  jid: string,
  messageId: string,
  timeoutMs = 10_000
): Promise<DeliveryAck> {
  return await new Promise<DeliveryAck>((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (ack: DeliveryAck["ack"]) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { sock.ev.off?.("message-receipt.update", onReceipt); } catch {}
      try { sock.ev.off?.("messages.update", onUpdate); } catch {}
      resolve({ confirmed: Boolean(ack), ack });
    };

    const matches = (key: any) =>
      String(key?.id || "") === messageId &&
      (!key?.remoteJid || String(key.remoteJid) === jid);

    const onReceipt = (updates: any[]) => {
      for (const item of updates || []) {
        if (!matches(item?.key)) continue;
        if (item?.receipt?.readTimestamp) return finish("read");
        if (item?.receipt?.receiptTimestamp) return finish("delivery");
      }
    };

    const onUpdate = (updates: any[]) => {
      for (const item of updates || []) {
        if (!matches(item?.key)) continue;
        const ack = ackFromStatus(item?.update?.status);
        if (ack) return finish(ack);
      }
    };

    timer = setTimeout(() => finish(null), timeoutMs);
    sock.ev.on("message-receipt.update", onReceipt);
    sock.ev.on("messages.update", onUpdate);
  });
}

async function reserveSend(input: {
  idempotencyKey: string;
  accountId: string;
  groupJid: string;
}) {
  try {
    await rest(
      "POST",
      "/whatsapp_send_dedupe",
      [{
        idempotency_key: input.idempotencyKey,
        account_id: input.accountId,
        group_jid: input.groupJid,
        status: "sending"
      }],
      { Prefer: "return=minimal" }
    );
    return { reserved: true as const, existing: null };
  } catch {
    const rows = await rest<Array<{
      status: "sending" | "sent";
      provider_message_id: string | null;
      confirmed: boolean;
      ack: "delivery" | "read" | null;
      updated_at: string;
    }>>(
      "GET",
      `/whatsapp_send_dedupe?idempotency_key=eq.${encodeURIComponent(input.idempotencyKey)}&select=status,provider_message_id,confirmed,ack,updated_at&limit=1`
    );
    return { reserved: false as const, existing: rows[0] ?? null };
  }
}

async function releaseSend(idempotencyKey: string) {
  await rest(
    "DELETE",
    `/whatsapp_send_dedupe?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`
  );
}

async function markSendCompleted(
  idempotencyKey: string,
  messageId: string,
  ack: DeliveryAck
) {
  await rest(
    "PATCH",
    `/whatsapp_send_dedupe?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`,
    {
      status: "sent",
      provider_message_id: messageId,
      confirmed: ack.confirmed,
      ack: ack.ack,
      updated_at: new Date().toISOString()
    },
    { Prefer: "return=minimal" }
  );
}

async function runPair(accountId: string) {
  await patchAccount(accountId, {
    status: "pairing",
    last_error: null,
    pairing_qr_data_url: null,
    pairing_qr_expires_at: null
  });

  let sock: any = null;
  try {
    const connected = await connect(accountId, {
      timeoutMs: 125_000,
      onQr: async (qr) => {
        const qrDataUrl = await QRCode.toDataURL(qr, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "M"
        });
        await patchAccount(accountId, {
          status: "pairing",
          pairing_qr_data_url: qrDataUrl,
          pairing_qr_expires_at: new Date(Date.now() + 30_000).toISOString()
        });
      }
    });
    sock = connected.sock;
    await syncGroups(accountId, sock);
  } catch (error) {
    await patchAccount(accountId, {
      status: "error",
      last_error: error instanceof Error ? error.message : String(error),
      pairing_qr_data_url: null,
      pairing_qr_expires_at: null
    }).catch(() => undefined);
  } finally {
    try { sock?.end(undefined); } catch {}
  }
}

Deno.serve(async (req: Request) => {
  if (!(await authorized(req))) return json({ error: "unauthorized" }, 401);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const action = String(body?.action || "");
  const accountId = String(body?.accountId || "").trim();

  try {
    if (action === "health") {
      return json({ ok: true, status: "ready" });
    }

    if (!/^[0-9a-f-]{36}$/i.test(accountId)) {
      return json({ error: "invalid_account_id" }, 400);
    }

    const account = await getAccount(accountId);
    if (!account) return json({ error: "account_not_found" }, 404);

    if (action === "pair") {
      EdgeRuntime.waitUntil(runPair(accountId));
      return json({ ok: true, status: "pairing" }, 202);
    }

    if (action === "groups") {
      const groups = await withSocket(accountId, (sock) => syncGroups(accountId, sock));
      return json({ ok: true, groups });
    }

    if (action === "send") {
      if (!account.enabled) return json({ error: "account_disabled" }, 409);

      const jid = String(body?.jid || "").trim();
      const message = String(body?.message || "").trim();
      const idempotencyKey = String(body?.idempotencyKey || "").trim();

      if (!/^[A-Za-z0-9_.:-]+@g\.us$/.test(jid)) {
        return json({ error: "invalid_group_jid" }, 400);
      }
      if (!message || message.length > 4096) {
        return json({ error: "invalid_message" }, 400);
      }
      if (!idempotencyKey || idempotencyKey.length > 180) {
        return json({ error: "invalid_idempotency_key" }, 400);
      }

      const reservation = await reserveSend({
        idempotencyKey,
        accountId,
        groupJid: jid
      });

      if (!reservation.reserved) {
        const existing = reservation.existing;
        if (existing?.status === "sent" && existing.provider_message_id) {
          return json({
            ok: true,
            accepted: true,
            confirmed: existing.confirmed,
            ack: existing.ack,
            messageId: existing.provider_message_id,
            duplicateSuppressed: true
          });
        }

        const updatedAt = Date.parse(existing?.updated_at || "");
        if (Number.isFinite(updatedAt) && Date.now() - updatedAt < 90_000) {
          return json({ error: "send_in_progress" }, 409);
        }

        await releaseSend(idempotencyKey);
        const retried = await reserveSend({ idempotencyKey, accountId, groupJid: jid });
        if (!retried.reserved) return json({ error: "send_reservation_failed" }, 409);
      }

      try {
        const result = await withSocket(accountId, async (sock) => {
          await sock.groupMetadata(jid);
          const deterministicId = "3EB0" + idempotencyKey
            .replace(/[^A-Fa-f0-9]/g, "")
            .padEnd(20, "0")
            .slice(-20)
            .toUpperCase();
          const ackPromise = waitForAck(sock, jid, deterministicId);
          const sent = await sock.sendMessage(
            jid,
            { text: message },
            { messageId: deterministicId }
          );
          const messageId = String(sent?.key?.id || deterministicId);
          const ack = await ackPromise;
          return { messageId, ack };
        });

        await markSendCompleted(idempotencyKey, result.messageId, result.ack);

        return json({
          ok: true,
          accepted: true,
          confirmed: result.ack.confirmed,
          ack: result.ack.ack,
          messageId: result.messageId
        });
      } catch (error) {
        await releaseSend(idempotencyKey).catch(() => undefined);
        throw error;
      }
    }

    if (action === "logout") {
      const auth = await loadAuth(accountId);
      if (auth?.files?.["creds.json"]) {
        await withSocket(accountId, async (sock) => {
          await sock.logout().catch(() => undefined);
        }).catch(() => undefined);
      }
      await deleteAuth(accountId).catch(() => undefined);
      await patchAccount(accountId, {
        status: "disconnected",
        phone: null,
        enabled: false,
        pairing_qr_data_url: null,
        pairing_qr_expires_at: null,
        last_error: null
      });
      return json({ ok: true });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    console.error("[whatsapp-bridge]", {
      action,
      accountId,
      error: error instanceof Error ? error.message : String(error)
    });
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      502
    );
  }
});
