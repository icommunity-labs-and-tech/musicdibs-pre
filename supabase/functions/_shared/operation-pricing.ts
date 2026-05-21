// Shared helper: resolve credit cost for a feature from the `operation_pricing` table.
// This is the single source of truth managed from /dashboard/admin/credits.
//
// Usage:
//   const cost = await getOperationCost(supabaseAdmin, "generate_video", 3);
//
// `fallback` is only used if the DB lookup fails or the row is missing.
// New features added in the future just need a row in `operation_pricing`
// with the matching `operation_key` — no code changes needed.

import type { SupabaseClient } from "./supabase-client.ts";

export async function getOperationCost(
  supabase: SupabaseClient,
  operationKey: string,
  fallback: number,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("operation_pricing")
      .select("credits_cost")
      .eq("operation_key", operationKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn(`[operation-pricing] lookup failed for ${operationKey}:`, error.message);
      return fallback;
    }
    if (data?.credits_cost == null) {
      console.warn(`[operation-pricing] no active row for ${operationKey}, using fallback=${fallback}`);
      return fallback;
    }
    return data.credits_cost;
  } catch (e) {
    console.warn(`[operation-pricing] exception for ${operationKey}:`, (e as Error).message);
    return fallback;
  }
}
