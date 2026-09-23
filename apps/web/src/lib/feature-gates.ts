import { getServerEnv } from "@/lib/env";

export type FeatureGateState = {
  autopilot: boolean;
  whatsappRealSend: boolean;
  metaAdsWrite: boolean;
};

export function getFeatureGates(): FeatureGateState {
  const env = getServerEnv();

  return {
    autopilot: env.AUTOPILOT_ENABLED === "1",
    whatsappRealSend: env.WHATSAPP_REAL_SEND_ENABLED === "1",
    metaAdsWrite: env.META_ADS_WRITE_ENABLED === "1"
  };
}
