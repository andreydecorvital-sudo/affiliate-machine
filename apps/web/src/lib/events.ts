import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type OperationalEvent = {
  eventType: string;
  source: string;
  entityType?: string;
  entityId?: string;
  idempotencyKey?: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
};

export async function claimIdempotency(
  key: string,
  scope: string,
  payloadHash?: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("claim_idempotency", {
    idempotency_key: key,
    idempotency_scope: scope,
    hash_value: payloadHash ?? null
  });

  if (error) throw error;
  return data === true;
}

export async function recordOperationalEvent(event: OperationalEvent): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("record_event", {
    p_event_type: event.eventType,
    p_source: event.source,
    p_entity_type: event.entityType ?? null,
    p_entity_id: event.entityId ?? null,
    p_idempotency_key: event.idempotencyKey ?? null,
    p_correlation_id: event.correlationId ?? null,
    p_payload: event.payload ?? {}
  });

  if (error) throw error;
  if (typeof data !== "string") throw new Error("record_event returned an invalid event id.");

  return data;
}
