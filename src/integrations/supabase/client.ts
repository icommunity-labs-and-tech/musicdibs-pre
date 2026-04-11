import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kmwehyixenybegwhqljx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eQYBJryPGBCibEfJYAzbvg_iGlP6pBx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
