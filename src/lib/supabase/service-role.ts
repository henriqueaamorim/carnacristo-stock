import { createClient } from "@supabase/supabase-js";
import { assertServiceRoleKey } from "@/lib/supabase/validate-service-role-key";

/** Cliente com service role — apenas em Route Handlers server-side. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ou URL ausente");
  }
  assertServiceRoleKey(key);
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
