import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient: any = null;

export function getSupabaseAdmin() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("WARNING: Supabase URL or Service Role Key is missing. Using local fallback.");
    return null;
  }

  try {
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseAdminClient;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
}
