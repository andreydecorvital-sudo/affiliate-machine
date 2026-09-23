import type { QueueName } from "@affiliate/core";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type QueueMessage = Record<string, unknown>;

export type QueuedJob<T extends QueueMessage = QueueMessage> = {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: T;
};

export async function enqueueJob(
  queueName: QueueName,
  message: QueueMessage,
  delaySeconds = 0
): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("enqueue_job", {
    queue_name: queueName,
    message,
    delay_seconds: Math.max(0, delaySeconds)
  });

  if (error) throw error;
  if (typeof data !== "number") throw new Error("enqueue_job returned an invalid message id.");

  return data;
}

export async function readJobs<T extends QueueMessage>(
  queueName: QueueName,
  options: { visibilitySeconds?: number; batchSize?: number } = {}
): Promise<Array<QueuedJob<T>>> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("read_jobs", {
    queue_name: queueName,
    visibility_seconds: options.visibilitySeconds ?? 60,
    batch_size: options.batchSize ?? 1
  });

  if (error) throw error;
  return (data ?? []) as Array<QueuedJob<T>>;
}

export async function archiveJob(queueName: QueueName, messageId: number): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("archive_job", {
    queue_name: queueName,
    message_id: messageId
  });

  if (error) throw error;
  if (data !== true) throw new Error(`Queue message ${messageId} was not archived.`);
}
