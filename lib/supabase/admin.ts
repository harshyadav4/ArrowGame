import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { SUPABASE_URL, getServiceRoleKey } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS — use only on the server for
 * trusted operations (e.g. checking username availability before signup).
 * NEVER import this into a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
