import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async () => new Response("gone", { status: 410 }));
