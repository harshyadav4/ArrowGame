import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let client: BrowserClient | undefined;

/**
 * Supabase client for Client Components. Memoised so the whole app shares a
 * single auth + realtime connection (avoids "Multiple GoTrueClient" warnings).
 */
export function createClient(): BrowserClient {
  if (!client) {
    client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // Skip ngrok's free-tier browser interstitial so API/XHR calls succeed
      // when Supabase is reached through an ngrok tunnel. Harmless otherwise.
      global: { headers: { "ngrok-skip-browser-warning": "true" } },
    });
  }
  return client;
}
