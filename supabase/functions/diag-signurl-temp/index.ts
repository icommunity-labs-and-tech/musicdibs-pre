// NEUTRALIZADA tras un solo uso (2026-07-22). Mismo patron que diag-ibs-temp.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async () => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "Content-Type": "application/json" } }));
