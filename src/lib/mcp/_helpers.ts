import { createClient } from "@supabase/supabase-js";

// Read Supabase URL + publishable key from the Edge Function env. These are
// public values (safe to expose) and are auto-set by Supabase. Import-safe:
// no throwing at module top level.
export function getPublicSupabase() {
  const url = process.env.SUPABASE_URL ?? "https://kmwehyixenybegwhqljx.supabase.co";
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function textContent(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function jsonContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: { data } as Record<string, unknown>,
  };
}
