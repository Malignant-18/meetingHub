// lib/supabase.ts
// Two clients: browser client (anon key) and server client (service role key)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// Browser-safe client — use in React components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only client — bypasses Row Level Security for admin operations
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser
export const supabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Storage bucket name — create this in Supabase dashboard
export const TRANSCRIPTS_BUCKET = "transcripts";
