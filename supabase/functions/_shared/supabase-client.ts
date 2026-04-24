import { createClient as _createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Wrap createClient to return a fully relaxed (any) client.
// This avoids strict generic inference issues across edge functions
// while keeping a single pinned SDK version.
export const createClient = (..._args: Parameters<typeof _createClient>): any => {
  return _createClient(..._args) as any;
};

export type SupabaseClient = any;
