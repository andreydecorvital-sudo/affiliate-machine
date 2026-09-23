import { createClient } from "@supabase/supabase-js";
import { getServerEnv, getSupabaseServerKey } from "@/lib/env";

export function createSupabaseAdminClient() {
  const env = getServerEnv();
  const key = getSupabaseServerKey(env);

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}
