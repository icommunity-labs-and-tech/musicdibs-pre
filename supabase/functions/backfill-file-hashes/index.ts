import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Backfill: compute SHA-256 for all works that have a file_path but no file_hash.
 * Params (JSON body):
 *   - limit:      max works to process this call (default 300)
 *   - concurrency: parallel downloads (default 8)
 * Requires service-role Authorization header.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const cronHeader = req.headers.get("x-cron-secret") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    const authed = (serviceKey && authHeader === `Bearer ${serviceKey}`) ||
                   (cronSecret && cronHeader === cronSecret);
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const limit = Math.min(Math.max(Number(body.limit) || 300, 1), 1000);
    const concurrency = Math.min(Math.max(Number(body.concurrency) || 8, 1), 20);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: works, error } = await supabaseAdmin
      .from("works")
      .select("id, file_path")
      .is("file_hash", null)
      .not("file_path", "is", null)
      .limit(limit);

    if (error) throw error;
    if (!works || works.length === 0) {
      return new Response(JSON.stringify({ message: "No works to backfill", count: 0, remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let failed = 0;

    async function processOne(work: { id: string; file_path: string }) {
      try {
        const { data: fileData, error: dlError } = await supabaseAdmin.storage
          .from("works-files")
          .download(work.file_path);
        if (dlError || !fileData) {
          failed++;
          return;
        }
        const buffer = await fileData.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const fileHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        await supabaseAdmin.from("works").update({ file_hash: fileHash }).eq("id", work.id);
        updated++;
      } catch (_e) {
        failed++;
      }
    }

    // Simple concurrency pool
    const queue = [...works];
    async function worker() {
      while (queue.length) {
        const w = queue.shift();
        if (!w) break;
        await processOne(w as any);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    // Report remaining
    const { count: remaining } = await supabaseAdmin
      .from("works")
      .select("id", { count: "exact", head: true })
      .is("file_hash", null)
      .not("file_path", "is", null);

    return new Response(
      JSON.stringify({ message: "Backfill batch complete", updated, failed, processed: works.length, remaining: remaining ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[BACKFILL] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
