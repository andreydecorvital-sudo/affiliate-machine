import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type DistributionExperimentKind =
  | "timing"
  | "group_allocation";

export type CreateDistributionExperimentInput = {
  name: string;
  kind: DistributionExperimentKind;
  niche?: string | null;
  treatmentShare?: number;
  minPostsPerArm?: number;
  config: Record<string, unknown>;
};

function normalizeConfig(
  kind: DistributionExperimentKind,
  config: Record<string, unknown>
) {
  if (kind === "timing") {
    return {
      maxDelayHours: Math.min(
        Math.max(Math.trunc(Number(config.maxDelayHours ?? 6)), 0),
        24
      ),
      minConfidence: Math.min(
        Math.max(Number(config.minConfidence ?? 0.25), 0),
        1
      )
    };
  }

  const maxGroups = Math.min(
    Math.max(Math.trunc(Number(config.maxGroups ?? 3)), 1),
    50
  );

  return {
    maxGroups,
    explorationGroups: Math.min(
      Math.max(
        Math.trunc(Number(config.explorationGroups ?? 1)),
        1
      ),
      maxGroups
    ),
    minConfidence: Math.min(
      Math.max(Number(config.minConfidence ?? 0.25), 0),
      1
    )
  };
}

async function assertNoOverlappingExperiment(input: {
  experimentId: string;
  niche: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  const distributionBase = () =>
    supabase
      .from("distribution_experiments")
      .select("id,name,kind,niche")
      .eq("status", "running")
      .neq("id", input.experimentId);

  const copyBase = () =>
    supabase
      .from("experiments")
      .select("id,name,niche")
      .eq("status", "running")
      .eq("kind", "message_copy");

  if (!input.niche) {
    const [distribution, copy] = await Promise.all([
      distributionBase(),
      copyBase()
    ]);

    const error = distribution.error || copy.error;
    if (error) throw error;

    if (
      (distribution.data ?? []).length > 0 ||
      (copy.data ?? []).length > 0
    ) {
      throw new Error(
        "A global experiment would overlap another running experiment."
      );
    }

    return;
  }

  const [
    distributionExact,
    distributionGlobal,
    copyExact,
    copyGlobal
  ] = await Promise.all([
    distributionBase().eq("niche", input.niche),
    distributionBase().is("niche", null),
    copyBase().eq("niche", input.niche),
    copyBase().is("niche", null)
  ]);

  const error =
    distributionExact.error ||
    distributionGlobal.error ||
    copyExact.error ||
    copyGlobal.error;

  if (error) throw error;

  if (
    (distributionExact.data ?? []).length > 0 ||
    (distributionGlobal.data ?? []).length > 0 ||
    (copyExact.data ?? []).length > 0 ||
    (copyGlobal.data ?? []).length > 0
  ) {
    throw new Error(
      "Another running experiment overlaps this niche."
    );
  }
}

export async function createDistributionExperiment(
  input: CreateDistributionExperimentInput
) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("distribution_experiments")
    .insert({
      name: input.name.trim(),
      kind: input.kind,
      niche: input.niche?.trim() || null,
      status: "draft",
      treatment_share: Math.min(
        Math.max(input.treatmentShare ?? 0.5, 0.05),
        0.95
      ),
      min_posts_per_arm: Math.min(
        Math.max(Math.trunc(input.minPostsPerArm ?? 30), 5),
        100000
      ),
      config: normalizeConfig(input.kind, input.config)
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listDistributionExperiments() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("distribution_experiments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function setDistributionExperimentStatus(
  experimentId: string,
  status: "running" | "paused" | "completed"
) {
  const supabase = createSupabaseAdminClient();

  if (status === "running") {
    const { data: experiment, error } = await supabase
      .from("distribution_experiments")
      .select("id,kind,niche,status")
      .eq("id", experimentId)
      .single();

    if (error) throw error;

    await assertNoOverlappingExperiment({
      experimentId,
      niche: experiment.niche ?? null
    });
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === "running") {
    patch.starts_at = new Date().toISOString();
    patch.ends_at = null;
  }

  if (status === "completed") {
    patch.ends_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("distribution_experiments")
    .update(patch)
    .eq("id", experimentId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getDistributionExperimentPerformance(
  experimentId: string
) {
  const supabase = createSupabaseAdminClient();

  const [{ data: experiment, error: experimentError }, performance] =
    await Promise.all([
      supabase
        .from("distribution_experiments")
        .select("*")
        .eq("id", experimentId)
        .single(),
      supabase.rpc("distribution_experiment_performance", {
        p_experiment_id: experimentId
      })
    ]);

  const error = experimentError || performance.error;
  if (error) throw error;

  const arms = performance.data ?? [];
  const sampleReady =
    arms.length === 2 &&
    arms.every(
      (arm: { sample_ready?: boolean | null }) =>
        arm.sample_ready === true
    );

  return {
    experiment,
    arms,
    sampleReady,
    automaticWinner: false,
    interpretation:
      "Compare commission_per_post first; use RPC and commission_per_delivery as diagnostics only after both arms are sample-ready."
  };
}
