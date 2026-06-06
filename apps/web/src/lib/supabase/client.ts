"use client";

import { createClient } from "@supabase/supabase-js";

import { requiredPublicEnv } from "@/lib/env";

export function createBrowserSupabaseClient() {
  const supabaseUrl = requiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(supabaseUrl, supabaseAnonKey);
}
