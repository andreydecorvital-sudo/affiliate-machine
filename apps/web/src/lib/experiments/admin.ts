import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CreateMessageExperimentInput = {
  name: string;
  niche?: string | null;
  objective: "rpc" | "cvr" | "commission_per_delivery";
  minClicksPerVariant?: number;
  variants: Array<{
    key: string;
    label: string;
    config: {
      headline?: string;
      ctaLabel?: string;
      footer?: string;
    };
  }>;
};

export async function createMessageExperiment(
  input: CreateMessageExperimentInput
) {
  const supabase = createSupabaseAdminClient();

  const { data: experiment, error: experimentError } = await supabase
    .from("experiments")
    .insert({
      name: input.name.trim(),
      kind: "message_copy",
      niche: input.niche?.trim() || null,
      objective: input.objective,
      status: "draft",
      min_clicks_per_variant: input.minClicksPerVariant ?? 30
    })
    .select("*")
    .single();

  if (experimentError) throw experimentError;

  const rows = input.variants.map((variant) => ({
    experiment_id: experiment.id,
    variant_key: variant.key.trim(),
    label: variant.label.trim(),
    config: variant.config,
    active: true
  }));

  const { data: variants, error: variantsError } = await supabase
    .from("experiment_variants")
    .insert(rows)
    .select("*");

  if (variantsError) {
    await supabase.from("experiments").delete().eq("id", experiment.id);
    throw variantsError;
  }

  return { experiment, variants: variants ?? [] };
}

export async function setExperimentStatus(
  experimentId: string,
  status: "running" | "paused" | "completed"
) {
  const supabase = createSupabaseAdminClient();

  if (status === "running") {
    const { data: experiment, error } = await supabase
      .from("experiments")
      .select("id,niche,status")
      .eq("id", experimentId)
      .single();

    if (error) throw error;

    const { count, error: variantError } = await supabase
      .from("experiment_variants")
      .select("id", { count: "exact", head: true })
      .eq("experiment_id", experimentId)
      .eq("active", true);

    if (variantError) throw variantError;
    if ((count ?? 0) < 2) {
      throw new Error("Experiment needs at least two active variants.");
    }

    let activeQuery = supabase
      .from("experiments")
      .select("id,name,niche")
      .eq("status", "running")
      .eq("kind", "message_copy")
      .neq("id", experimentId);

    activeQuery = experiment.niche
      ? activeQuery.eq("niche", experiment.niche)
      : activeQuery.is("niche", null);

    const { data: conflicts, error: conflictError } = await activeQuery;
    if (conflictError) throw conflictError;
    if ((conflicts ?? []).length > 0) {
      throw new Error(
        "Another message-copy experiment is already running for this scope."
      );
    }
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === "running") patch.starts_at = new Date().toISOString();
  if (status === "completed") patch.ends_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("experiments")
    .update(patch)
    .eq("id", experimentId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listExperiments() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("experiments")
    .select(
      "id,name,kind,niche,objective,status,min_clicks_per_variant,starts_at,ends_at,created_at,updated_at,experiment_variants(id,variant_key,label,config,active)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getExperimentPerformance(experimentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("experiment_performance", {
    p_experiment_id: experimentId
  });

  if (error) throw error;
  return data ?? [];
}
