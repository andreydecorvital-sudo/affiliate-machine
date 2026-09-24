import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = (min = 1) =>
  z.preprocess(
    emptyToUndefined,
    z.string().min(min).optional()
  ).catch(undefined);

const optionalUrl = () =>
  z.preprocess(
    emptyToUndefined,
    z.string().url().optional()
  ).catch(undefined);

const optionalGate = () =>
  z.preprocess(
    emptyToUndefined,
    z.enum(["0", "1"]).default("0")
  ).catch("0");

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString(),
  NEXT_PUBLIC_APP_URL: optionalUrl(),
  SUPABASE_SECRET_KEY: optionalString(),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),
  APP_ACCESS_PASSWORD: optionalString(12),
  GEMINI_API_KEY: optionalString(),
  GEMINI_MODEL: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("gemini-flash-latest")
  ).catch("gemini-flash-latest"),
  SHOPEE_AFFILIATE_APP_ID: optionalString(),
  SHOPEE_AFFILIATE_SECRET: optionalString(),
  SHOPEE_AFFILIATE_GRAPHQL_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("https://open-api.affiliate.shopee.com.br/graphql")
  ).catch("https://open-api.affiliate.shopee.com.br/graphql"),
  INTERNAL_JOB_SECRET: optionalString(16),
  AUTOPILOT_ENABLED: optionalGate(),
  WHATSAPP_REAL_SEND_ENABLED: optionalGate(),
  META_ADS_WRITE_ENABLED: optionalGate(),
  META_ACCESS_TOKEN: optionalString(),
  META_AD_ACCOUNT_ID: optionalString(),
  META_GRAPH_API_VERSION: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^v\d+\.\d+$/).optional()
  ).catch(undefined),
  META_GRAPH_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("https://graph.facebook.com")
  ).catch("https://graph.facebook.com")
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_ACCESS_PASSWORD: process.env.APP_ACCESS_PASSWORD,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    SHOPEE_AFFILIATE_APP_ID: process.env.SHOPEE_AFFILIATE_APP_ID,
    SHOPEE_AFFILIATE_SECRET: process.env.SHOPEE_AFFILIATE_SECRET,
    SHOPEE_AFFILIATE_GRAPHQL_URL: process.env.SHOPEE_AFFILIATE_GRAPHQL_URL,
    INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET,
    AUTOPILOT_ENABLED: process.env.AUTOPILOT_ENABLED,
    WHATSAPP_REAL_SEND_ENABLED: process.env.WHATSAPP_REAL_SEND_ENABLED,
    META_ADS_WRITE_ENABLED: process.env.META_ADS_WRITE_ENABLED,
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
    META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
    META_GRAPH_BASE_URL: process.env.META_GRAPH_BASE_URL
  });
}

export function getSupabaseServerKey(env = getServerEnv()): string | null {
  return env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}
