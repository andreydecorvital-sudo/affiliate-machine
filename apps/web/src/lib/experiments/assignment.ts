import {
  applyMessageVariant,
  type MessageVariantConfig
} from "@affiliate/experiments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/events";

type AssignmentRow = {
  experiment_id: string;
  experiment_name: string;
  objective: string;
  min_clicks_per_variant: number;
  variant_id: string;
  variant_key: string;
  variant_label: string;
  variant_config: Record<string, unknown> | null;
};

export async function applyActiveMessageExperiment(input: {
  deliveryId: string;
  content: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("assign_message_experiment", {
    p_delivery_id: input.deliveryId
  });

  if (error) throw error;

  const assignment = (Array.isArray(data) ? data[0] : null) as
    | AssignmentRow
    | null;

  if (!assignment) {
    return {
      content: input.content,
      experiment: null
    };
  }

  const config =
    assignment.variant_config &&
    typeof assignment.variant_config === "object"
      ? (assignment.variant_config as MessageVariantConfig)
      : {};

  const content = applyMessageVariant(input.content, config);

  await recordOperationalEvent({
    eventType: "experiment.delivery_assigned",
    source: "experiments",
    entityType: "post_delivery",
    entityId: input.deliveryId,
    idempotencyKey: `experiment-assignment:${input.deliveryId}`,
    payload: {
      experimentId: assignment.experiment_id,
      experimentName: assignment.experiment_name,
      objective: assignment.objective,
      variantId: assignment.variant_id,
      variantKey: assignment.variant_key,
      variantLabel: assignment.variant_label
    }
  }).catch(() => undefined);

  return {
    content,
    experiment: {
      id: assignment.experiment_id,
      name: assignment.experiment_name,
      objective: assignment.objective,
      minClicksPerVariant: assignment.min_clicks_per_variant,
      variantId: assignment.variant_id,
      variantKey: assignment.variant_key,
      variantLabel: assignment.variant_label
    }
  };
}
