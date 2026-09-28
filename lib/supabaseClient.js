"use client";

import { createBrowserClient } from "@supabase/ssr";

let client;

// Single shared browser client — avoids re-creating it (and its auth
// listeners) on every render.
export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
