import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Function decommissioned after one-time use on 2026-05-29
serve(() => new Response(JSON.stringify({ error: "Gone", message: "This function was a one-time utility and is no longer active." }), { status: 410, headers: { "Content-Type": "application/json" } }));
