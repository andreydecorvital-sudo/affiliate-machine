import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-flash-latest"),
  INTERNAL_JOB_SECRET: z.string().min(16).optional(),
  AUTOPILOT_ENABLED: z.enum(["0", "1"]).default("0"),
  WHATSAPP_REAL_SEND_ENABLED: z.enum(["0", "1"]).default("0"),
  META_ADS_WRITE_ENABLED: z.enum(["0", "1"]).default("0")
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET,
    AUTOPILOT_ENABLED: process.env.AUTOPILOT_ENABLED,
    WHATSAPP_REAL_SEND_ENABLED: process.env.WHATSAPP_REAL_SEND_ENABLED,
    META_ADS_WRITE_ENABLED: process.env.META_ADS_WRITE_ENABLED
  });
}

export function getSupabaseServerKey(env = getServerEnv()): string | null {
  return env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}
