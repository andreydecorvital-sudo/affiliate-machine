import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  APP_ACCESS_PASSWORD: z.string().min(12).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-flash-latest"),
  SHOPEE_AFFILIATE_APP_ID: z.string().min(1).optional(),
  SHOPEE_AFFILIATE_SECRET: z.string().min(1).optional(),
  SHOPEE_AFFILIATE_GRAPHQL_URL: z
    .string()
    .url()
    .default("https://open-api.affiliate.shopee.com.br/graphql"),
  INTERNAL_JOB_SECRET: z.string().min(16).optional(),
  AUTOPILOT_ENABLED: z.enum(["0", "1"]).default("0"),
  WHATSAPP_REAL_SEND_ENABLED: z.enum(["0", "1"]).default("0"),
  META_ADS_WRITE_ENABLED: z.enum(["0", "1"]).default("0"),
  META_ACCESS_TOKEN: z.string().min(1).optional(),
  META_AD_ACCOUNT_ID: z.string().min(1).optional(),
  META_GRAPH_API_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/)
    .optional(),
  META_GRAPH_BASE_URL: z
    .string()
    .url()
    .default("https://graph.facebook.com")
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
