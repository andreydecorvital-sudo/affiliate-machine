import assert from "node:assert/strict";
import test from "node:test";
import {
  getDryRunExecutionPlan,
  isDryRunSafetyClosed
} from "../src/lib/control-center/dry-run";

test("dry-run is allowed only when every dangerous gate is off", () => {
  assert.equal(
    isDryRunSafetyClosed({
      autopilot: false,
      whatsappRealSend: false,
      metaAdsWrite: false
    }),
    true
  );

  assert.equal(
    isDryRunSafetyClosed({
      autopilot: true,
      whatsappRealSend: false,
      metaAdsWrite: false
    }),
    false
  );

  assert.equal(
    isDryRunSafetyClosed({
      autopilot: false,
      whatsappRealSend: true,
      metaAdsWrite: false
    }),
    false
  );

  assert.equal(
    isDryRunSafetyClosed({
      autopilot: false,
      whatsappRealSend: false,
      metaAdsWrite: true
    }),
    false
  );
});

test("probe plan is read-only and never enters the mutation pipeline", () => {
  assert.deepEqual(getDryRunExecutionPlan("probe"), [
    "readiness",
    "supabase_probe",
    "shopee_probe"
  ]);
});

test("pipeline dry-run stops after scoring", () => {
  const plan = getDryRunExecutionPlan("pipeline");

  assert.deepEqual(plan, [
    "readiness",
    "supabase_probe",
    "shopee_probe",
    "hunter",
    "score"
  ]);

  assert.equal(plan.includes("materialize" as never), false);
  assert.equal(plan.includes("delivery" as never), false);
  assert.equal(plan.includes("meta_write" as never), false);
  assert.equal(plan.includes("whatsapp_send" as never), false);
});
