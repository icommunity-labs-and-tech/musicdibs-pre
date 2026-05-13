// Resubmits the sitemap to Google Search Console via the connector gateway.
// Triggered by a daily pg_cron job and/or manually by an admin.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_search_console/webmasters/v3';
const SITE_URL = 'sc-domain:musicdibs.com';
const SITEMAP_URL = 'https://www.musicdibs.com/sitemap.xml';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GSC_API_KEY = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');
    const CRON_SECRET = Deno.env.get('CRON_SECRET');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!GSC_API_KEY) throw new Error('GOOGLE_SEARCH_CONSOLE_API_KEY not configured');

    // Auth: allow either CRON_SECRET (for pg_cron) or an authenticated admin user.
    const authHeader = req.headers.get('authorization') ?? '';
    const cronHeader = req.headers.get('x-cron-secret') ?? '';
    let authorized = false;

    if (CRON_SECRET && cronHeader === CRON_SECRET) {
      authorized = true;
    } else if (authHeader.startsWith('Bearer ')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const { data: roleRow } = await admin
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const encodedSite = encodeURIComponent(SITE_URL);
    const encodedSitemap = encodeURIComponent(SITEMAP_URL);

    // Submit (PUT is idempotent — Google re-fetches the sitemap on each call)
    const submitRes = await fetch(
      `${GATEWAY_URL}/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': GSC_API_KEY,
        },
      },
    );

    if (!submitRes.ok) {
      const body = await submitRes.text();
      throw new Error(`GSC submit failed [${submitRes.status}]: ${body}`);
    }

    // Read back current status
    const statusRes = await fetch(
      `${GATEWAY_URL}/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
      {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': GSC_API_KEY,
        },
      },
    );
    const status = statusRes.ok ? await statusRes.json() : null;

    return new Response(
      JSON.stringify({ success: true, sitemap: SITEMAP_URL, status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('resubmit-sitemap-gsc error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
