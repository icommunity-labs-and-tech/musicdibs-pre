/**
 * DEPRECATED — use `create-billing-portal-session` instead.
 * Proxies all traffic to the canonical function to avoid breaking legacy callers.
 * Will be removed 2026-08-01.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.warn("[stripe-portal] DEPRECATED: endpoint will be removed 2026-08-01. Use create-billing-portal-session.");

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-billing-portal-session`;
  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined;
  const proxyRes = await fetch(url, { method: req.method, headers: req.headers, body });

  const headers = new Headers(proxyRes.headers);
  headers.set("Deprecation", "true");
  headers.set("Sunset", "2026-08-01");
  return new Response(proxyRes.body, { status: proxyRes.status, headers });
});
