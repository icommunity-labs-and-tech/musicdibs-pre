// Resubmits the sitemap to Google Search Console via the connector gateway.
// Triggered by a daily pg_cron job and/or manually by an admin.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_search_console/webmasters/v3';
const TARGET_URL = 'https://www.musicdibs.com/';
const SITEMAP_URL = 'https://www.musicdibs.com/sitemap.xml';

type SiteEntry = { siteUrl: string; permissionLevel?: string };

function coversTarget(siteUrl: string, target: URL): boolean {
  if (siteUrl.startsWith('sc-domain:')) {
    const domain = siteUrl.slice('sc-domain:'.length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    return target.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
}

async function resolveVerifiedSite(headers: Record<string, string>): Promise<string> {
  const response = await fetch(`${GATEWAY_URL}/sites`, { headers });
  if (!response.ok) throw new Error(`GSC property list failed [${response.status}]`);
  const { siteEntry = [] } = await response.json() as { siteEntry?: SiteEntry[] };
  const target = new URL(TARGET_URL);
  const matches = siteEntry.filter((entry) => entry.permissionLevel !== 'siteUnverifiedUser' && coversTarget(entry.siteUrl, target));
  if (matches.length === 0) throw new Error('No verified Search Console property covers the published site');
  const exactRoot = matches.find((entry) => entry.siteUrl === TARGET_URL);
  if (exactRoot) return exactRoot.siteUrl;
  if (matches.length === 1) return matches[0].siteUrl;
  throw new Error('Multiple verified Search Console properties cover the published site');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GSC_API_KEY = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!GSC_API_KEY) throw new Error('GOOGLE_SEARCH_CONSOLE_API_KEY not configured');

    // Auth: allow either the cron secret stored in vault (for pg_cron) or an authenticated admin user.
    const authHeader = req.headers.get('authorization') ?? '';
    const cronHeader = req.headers.get('x-cron-secret') ?? '';
    let authorized = false;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (cronHeader) {
      const { data: secret } = await adminClient.rpc('get_sitemap_cron_secret');
      if (secret && cronHeader === secret) {
        authorized = true;
      }
    }

    if (!authorized && authHeader.startsWith('Bearer ')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: roleRow } = await adminClient
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

    const gatewayHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GSC_API_KEY,
    };
    const siteUrl = await resolveVerifiedSite(gatewayHeaders);
    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(SITEMAP_URL);

    // Submit (PUT is idempotent — Google re-fetches the sitemap on each call)
    const submitRes = await fetch(
      `${GATEWAY_URL}/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
      {
        method: 'PUT',
        headers: gatewayHeaders,
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
        headers: gatewayHeaders,
      },
    );
    const status = statusRes.ok ? await statusRes.json() : null;

    return new Response(
      JSON.stringify({ success: true, siteUrl, sitemap: SITEMAP_URL, status }),
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
