import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
}

export function getSupabaseBrowserClient() {
  if (client) return client;

  const { url, key, isConfigured } = getSupabaseConfig();

  if (!isConfigured || !url || !key) {
    return null;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return client;
}
