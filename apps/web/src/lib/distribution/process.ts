import { retryDelaySeconds } from "@affiliate/distribution";
import { getFeatureGates } from "@/lib/feature-gates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppGroupMessage } from "@/lib/whatsapp/bridge";
import { recordOperationalEvent } from "@/lib/events";
import { revalidatePostBeforeFirstSend } from "@/lib/distribution/revalidate";
import { prepareDeliveryTracking } from "@/lib/distribution/delivery-tracking";

type ClaimedDelivery = {
  delivery_id: string;
  post_id: string;
  account_id: string;
  group_id: string;
  group_jid: string;
  content: string;
  attempt_count: number;
  idempotency_key: string;
};

async function finishDelivery(input: {
  deliveryId: string;
  status: "accepted" | "confirmed" | "failed" | "skipped";
  messageId?: string | null;
  error?: string | null;
  retryAfterSeconds?: number | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("finish_delivery", {
    p_delivery_id: input.deliveryId,
    p_status: input.status,
    p_provider_message_id: input.messageId ?? null,
    p_error: input.error ?? null,
    p_retry_after_seconds: input.retryAfterSeconds ?? null
  });
  if (error) throw error;
}

export async function processNextDelivery() {
  if (!getFeatureGates().whatsappRealSend) {
    return {
      status: "gate_disabled" as const,
      sent: false
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("claim_next_delivery");
  if (error) throw error;

  const delivery = (Array.isArray(data) ? data[0] : null) as ClaimedDelivery | null;
  if (!delivery) {
    const { data: quota } = await supabase.rpc("distribution_quota_status");
    return {
      status: "idle" as const,
      sent: false,
      quota: Array.isArray(quota) ? quota[0] ?? null : quota
    };
  }

  try {
    const validation = await revalidatePostBeforeFirstSend(delivery.post_id);
    if (!validation.valid) {
      return {
        status: "cancelled" as const,
        sent: false,
        deliveryId: delivery.delivery_id,
        reason: validation.reason
      };
    }

    const tracked = await prepareDeliveryTracking({
      deliveryId: delivery.delivery_id,
      baseContent: validation.content ?? delivery.content
    });

    const result = await sendWhatsAppGroupMessage({
      accountId: delivery.account_id,
      jid: delivery.group_jid,
      message: tracked.content,
      idempotencyKey: delivery.idempotency_key
    });

    const finalStatus = result.confirmed ? "confirmed" : "accepted";
    await finishDelivery({
      deliveryId: delivery.delivery_id,
      status: finalStatus,
      messageId: result.messageId
    });

    await recordOperationalEvent({
      eventType: "distribution.delivery_sent",
      source: "distribution",
      entityType: "post_delivery",
      entityId: delivery.delivery_id,
      idempotencyKey: `delivery-sent:${delivery.idempotency_key}`,
      payload: {
        postId: delivery.post_id,
        groupId: delivery.group_id,
        accountId: delivery.account_id,
        trackingKey: tracked.trackingKey,
        confirmed: result.confirmed,
        ack: result.ack,
        messageId: result.messageId,
        duplicateSuppressed: result.duplicateSuppressed === true
      }
    });

    return {
      status: finalStatus,
      sent: true,
      deliveryId: delivery.delivery_id,
      trackingKey: tracked.trackingKey,
      messageId: result.messageId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (delivery.attempt_count >= 5) {
      await finishDelivery({
        deliveryId: delivery.delivery_id,
        status: "skipped",
        error: `max_attempts: ${message}`
      });
    } else {
      await finishDelivery({
        deliveryId: delivery.delivery_id,
        status: "failed",
        error: message,
        retryAfterSeconds: retryDelaySeconds(delivery.attempt_count)
      });
    }

    await recordOperationalEvent({
      eventType: "distribution.delivery_failed",
      source: "distribution",
      entityType: "post_delivery",
      entityId: delivery.delivery_id,
      payload: {
        postId: delivery.post_id,
        groupId: delivery.group_id,
        attempt: delivery.attempt_count,
        error: message
      }
    });

    return {
      status: delivery.attempt_count >= 5 ? "skipped" as const : "failed" as const,
      sent: false,
      deliveryId: delivery.delivery_id,
      error: message
    };
  }
}
