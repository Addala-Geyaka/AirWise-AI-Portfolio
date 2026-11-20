import { createClient } from "@supabase/supabase-js";

export const supabaseProjectUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase =
  supabaseProjectUrl && supabasePublishableKey
    ? createClient(supabaseProjectUrl, supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;
