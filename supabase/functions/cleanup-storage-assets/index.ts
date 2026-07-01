// Cleanup storage assets — weekly retention policy
// Modes:
//   dry_run  → only counts and logs candidates (no deletes, no emails)
//   notify   → sends 14-day / 7-day emails and moves files past final warning to cleanup-trash
//   purge    → same as notify + physically deletes cleanup-trash items >14 days old
//
// Auth: header x-cron-secret == CRON_SECRET, or Authorization: Bearer <SERVICE_ROLE>
//
// PROTECTED buckets (never touched): works-files, purchase-certificates, documents, blog-images
// Path convention assumed: `{user_id}/...` at the root of each bucket. Objects whose first
// segment is not a UUID are logged and skipped (no user attribution).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { storageCleanupEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type Mode = "dry_run" | "notify" | "purge";

// Retention per bucket (in days). null = untouched. inactiveDays applies to users without active subscription.
const RULES: Record<string, { activeDays: number | null; inactiveDays: number | null; forceDays?: number }> = {
  "works-files":           { activeDays: 180, inactiveDays: 30 },
  "ai-generations":        { activeDays: 365, inactiveDays: 56 },
  "voice-samples":         { activeDays: 365, inactiveDays: 56 },
  "voice-clones":          { activeDays: 365, inactiveDays: 56 } as any,
  "social-promo-images":   { activeDays: 180, inactiveDays: 28 },
  "social-promo-videos":   { activeDays: 180, inactiveDays: 28 },
  "premium-promo-media":   { activeDays: 180, inactiveDays: 28 },
  "instagram-creatives":   { activeDays: 180, inactiveDays: 28 },
  "youtube-thumbnails":    { activeDays: 180, inactiveDays: 28 },
  "event-posters":         { activeDays: 180, inactiveDays: 28 },
  "auphonic-temp":         { activeDays: 7,   inactiveDays: 7, forceDays: 7 },
};

const PROTECTED = new Set(["purchase-certificates", "documents", "blog-images", "cleanup-trash"]);
const TRASH_BUCKET = "cleanup-trash";
const TRASH_PURGE_DAYS = 14;
const NOTIFY_GAP_DAYS = 7; // between warn -> final -> move

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function log(...args: unknown[]) {
  console.log("[cleanup-storage-assets]", ...args);
}

async function listAllObjects(supabase: any, bucket: string) {
  // Recursive list — Supabase storage.list is not recursive, so we walk folders
  const all: Array<{ path: string; name: string; created_at?: string; updated_at?: string; metadata?: any }> = [];
  async function walk(prefix: string) {
    let offset = 0;
    const LIMIT = 1000;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: LIMIT, offset, sortBy: { column: "name", order: "asc" } });
      if (error) { log("list error", bucket, prefix, error.message); return; }
      if (!data || data.length === 0) break;
      for (const item of data) {
        // A "folder" has no metadata / no id
        if (item.id === null || (!item.metadata && !item.updated_at)) {
          await walk(prefix ? `${prefix}/${item.name}` : item.name);
        } else {
          all.push({
            path: prefix ? `${prefix}/${item.name}` : item.name,
            name: item.name,
            created_at: item.created_at,
            updated_at: item.updated_at,
            metadata: item.metadata,
          });
        }
      }
      if (data.length < LIMIT) break;
      offset += LIMIT;
    }
  }
  await walk("");
  return all;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const authed = (cronSecret && cronHeader === cronSecret) || (serviceKey && authHeader === `Bearer ${serviceKey}`);
  if (!authed) return json({ error: "Unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* GET/empty */ }
  const mode: Mode = (body?.mode as Mode) || "dry_run";
  if (!["dry_run", "notify", "purge"].includes(mode)) return json({ error: "invalid_mode" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  // Load exceptions
  const { data: excRows } = await supabase.from("asset_cleanup_exceptions").select("user_id");
  const exceptions = new Set<string>((excRows || []).map((r: any) => r.user_id));

  // Load active subscribers (Annual/Monthly plan OR active subscription row OR past_due grace)
  const activeUsers = new Set<string>();
  {
    const { data: prof } = await supabase.from("profiles").select("user_id").in("subscription_plan", ["Annual", "Monthly"]);
    (prof || []).forEach((r: any) => activeUsers.add(r.user_id));
    const { data: subs } = await supabase.from("subscriptions").select("user_id, status").in("status", ["active", "past_due"]);
    (subs || []).forEach((r: any) => activeUsers.add(r.user_id));
  }

  // Load user emails/names/lang for notification (only when needed)
  const userInfoCache = new Map<string, { email: string; name: string; lang: string }>();
  async function getUserInfo(userId: string) {
    if (userInfoCache.has(userId)) return userInfoCache.get(userId)!;
    const { data: prof } = await supabase.from("profiles").select("display_name, language").eq("user_id", userId).maybeSingle();
    const { data: emailRows } = await supabase.rpc("get_emails_by_user_ids", { p_ids: [userId] });
    const email = (emailRows && emailRows[0]?.email) || "";
    const info = { email, name: prof?.display_name || email.split("@")[0] || "", lang: prof?.language || "es" };
    userInfoCache.set(userId, info);
    return info;
  }

  const now = Date.now();
  const summary: any = { runId, mode, buckets: {} as Record<string, any>, notifications: { warn: 0, final: 0, moved: 0, purged: 0 }, skippedExceptions: 0 };

  const logRows: any[] = [];
  function pushLog(row: any) {
    logRows.push({ ...row, run_id: runId, mode });
    if (logRows.length >= 500) flushLog();
  }
  async function flushLog() {
    if (logRows.length === 0) return;
    const batch = logRows.splice(0, logRows.length);
    const { error } = await supabase.from("asset_cleanup_log").insert(batch);
    if (error) log("log insert error", error.message);
  }

  // ── Phase 1: scan each bucket ─────────────────────────────────────────
  // Group candidate files by user, per bucket, then decide action per user based on log history.
  type Candidate = { bucket: string; path: string; size: number; created: number };
  const candidatesByUser = new Map<string, Candidate[]>();

  for (const [bucket, rule] of Object.entries(RULES)) {
    if (PROTECTED.has(bucket)) continue;
    const objects = await listAllObjects(supabase, bucket);
    let bucketCount = 0, bucketSize = 0, bucketCandidates = 0;

    for (const obj of objects) {
      const ts = new Date(obj.created_at || obj.updated_at || 0).getTime();
      const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
      const size = Number(obj.metadata?.size || 0);
      bucketCount++; bucketSize += size;

      const firstSeg = obj.path.split("/")[0];
      const userId = UUID_RE.test(firstSeg) ? firstSeg : null;

      // auphonic-temp: purge directly by age regardless of user
      if (rule.forceDays && ageDays > rule.forceDays) {
        bucketCandidates++;
        pushLog({ user_id: userId, bucket, path: obj.path, size_bytes: size, action: mode === "dry_run" ? "skipped_active" : "purged", reason: `force_days_${rule.forceDays}` });
        if (mode !== "dry_run") {
          await supabase.storage.from(bucket).remove([obj.path]);
        }
        continue;
      }

      if (!userId) continue; // no user attribution → skip
      if (exceptions.has(userId)) { summary.skippedExceptions++; pushLog({ user_id: userId, bucket, path: obj.path, size_bytes: size, action: "skipped_exception", reason: "whitelisted" }); continue; }

      const isActive = activeUsers.has(userId);
      const threshold = isActive ? rule.activeDays : rule.inactiveDays;
      if (threshold == null || ageDays <= threshold) continue;

      bucketCandidates++;
      const arr = candidatesByUser.get(userId) || [];
      arr.push({ bucket, path: obj.path, size, created: ts });
      candidatesByUser.set(userId, arr);
    }

    summary.buckets[bucket] = { total_files: bucketCount, total_size_bytes: bucketSize, candidates: bucketCandidates };
  }

  await flushLog();

  // ── Phase 2: per-user decision (notify/final/move) ───────────────────
  for (const [userId, files] of candidatesByUser) {
    const totalSize = files.reduce((s, f) => s + f.size, 0);

    // Last notification for this user (any bucket)
    const { data: lastLog } = await supabase
      .from("asset_cleanup_log")
      .select("action, executed_at")
      .eq("user_id", userId)
      .in("action", ["notified_14d", "notified_final", "moved_to_trash"])
      .order("executed_at", { ascending: false })
      .limit(1);
    const last = lastLog?.[0];
    const lastAction = last?.action as string | undefined;
    const lastDays = last ? (now - new Date(last.executed_at).getTime()) / (1000 * 60 * 60 * 24) : Infinity;

    let nextPhase: "warn" | "final" | "move" | null = null;
    if (!lastAction) nextPhase = "warn";
    else if (lastAction === "notified_14d" && lastDays >= NOTIFY_GAP_DAYS) nextPhase = "final";
    else if (lastAction === "notified_final" && lastDays >= NOTIFY_GAP_DAYS) nextPhase = "move";
    // else: waiting cool-down or already moved recently → skip

    if (!nextPhase) continue;

    const info = await getUserInfo(userId);
    if (!info.email && nextPhase !== "move") continue; // can't warn without email

    if (mode === "dry_run") {
      pushLog({ user_id: userId, bucket: "-", path: `${files.length} files`, size_bytes: totalSize, action: `would_${nextPhase}`, reason: "dry_run" });
      continue;
    }

    if (nextPhase === "warn" || nextPhase === "final") {
      // send email
      if (resendKey && info.email) {
        const hasWorksFiles = files.some((f) => f.bucket === "works-files");
        const tpl = storageCleanupEmail({
          name: info.name, phase: nextPhase === "warn" ? "warn" : "final",
          fileCount: files.length, sizeBytes: totalSize,
          daysUntilDeletion: nextPhase === "warn" ? 14 : 7,
          lang: info.lang,
          variant: hasWorksFiles ? "works-files" : "generic",
        });
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "MusicDibs <noreply@notify.musicdibs.com>",
              to: [info.email], subject: tpl.subject, html: tpl.html, text: tpl.text,
            }),
          });
          if (!r.ok) log("resend fail", info.email, await r.text());
        } catch (e) { log("resend exception", (e as Error).message); }
      }
      const action = nextPhase === "warn" ? "notified_14d" : "notified_final";
      // Log once per file so we can track set at each phase
      for (const f of files) pushLog({ user_id: userId, bucket: f.bucket, path: f.path, size_bytes: f.size, action, reason: `email_sent_${info.email || "no_email"}` });
      if (nextPhase === "warn") summary.notifications.warn++; else summary.notifications.final++;
    } else if (nextPhase === "move") {
      // Move files to cleanup-trash
      for (const f of files) {
        const trashPath = `${userId}/${f.bucket}/${Date.now()}-${f.path.replace(/\//g, "__")}`;
        // Download → upload → remove (Supabase has no server-side copy across buckets by default)
        try {
          const { data: dl, error: dlErr } = await supabase.storage.from(f.bucket).download(f.path);
          if (dlErr || !dl) { log("download fail", f.bucket, f.path, dlErr?.message); continue; }
          const { error: upErr } = await supabase.storage.from(TRASH_BUCKET).upload(trashPath, dl, { contentType: (dl as Blob).type || "application/octet-stream", upsert: true });
          if (upErr) { log("upload trash fail", trashPath, upErr.message); continue; }
          const { error: rmErr } = await supabase.storage.from(f.bucket).remove([f.path]);
          if (rmErr) { log("remove fail", f.bucket, f.path, rmErr.message); continue; }
          pushLog({ user_id: userId, bucket: f.bucket, path: f.path, size_bytes: f.size, action: "moved_to_trash", reason: `trash_path=${trashPath}` });
          summary.notifications.moved++;
        } catch (e) { log("move exception", (e as Error).message); }
      }
      // Also send a "deleted" email so the user knows
      if (resendKey && info.email) {
        const tpl = storageCleanupEmail({ name: info.name, phase: "deleted", fileCount: files.length, sizeBytes: totalSize, lang: info.lang });
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "MusicDibs <noreply@notify.musicdibs.com>",
              to: [info.email], subject: tpl.subject, html: tpl.html, text: tpl.text,
            }),
          });
        } catch { /* ignore */ }
      }
    }
  }

  await flushLog();

  // ── Phase 3: purge trash older than 14 days (only in purge mode) ─────
  if (mode === "purge") {
    const trashObjects = await listAllObjects(supabase, TRASH_BUCKET);
    for (const obj of trashObjects) {
      const ts = new Date(obj.created_at || obj.updated_at || 0).getTime();
      const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
      if (ageDays > TRASH_PURGE_DAYS) {
        const size = Number(obj.metadata?.size || 0);
        await supabase.storage.from(TRASH_BUCKET).remove([obj.path]);
        const firstSeg = obj.path.split("/")[0];
        pushLog({ user_id: UUID_RE.test(firstSeg) ? firstSeg : null, bucket: TRASH_BUCKET, path: obj.path, size_bytes: size, action: "purged", reason: `trash_age_${ageDays.toFixed(0)}d` });
        summary.notifications.purged++;
      }
    }
    await flushLog();
  }

  // ── Admin summary email ───────────────────────────────────────────────
  const durationMs = Date.now() - startedAt;
  const totalCandidates = Array.from(candidatesByUser.values()).reduce((s, arr) => s + arr.length, 0);
  const totalUsers = candidatesByUser.size;
  const bucketsTable = Object.entries(summary.buckets).map(([b, s]: any) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #333;">${b}</td><td style="padding:6px 10px;border-bottom:1px solid #333;">${s.total_files}</td><td style="padding:6px 10px;border-bottom:1px solid #333;">${(s.total_size_bytes/(1024*1024)).toFixed(1)} MB</td><td style="padding:6px 10px;border-bottom:1px solid #333;">${s.candidates}</td></tr>`).join("");
  const adminHtml = `<div style="font-family:Arial,sans-serif;max-width:640px;">
    <h2>Storage cleanup — modo <code>${mode}</code></h2>
    <p><strong>Run:</strong> ${runId}<br/><strong>Duración:</strong> ${(durationMs/1000).toFixed(1)}s<br/><strong>Usuarios afectados:</strong> ${totalUsers}<br/><strong>Archivos candidatos:</strong> ${totalCandidates}<br/><strong>Emails enviados:</strong> ${summary.notifications.warn} warn · ${summary.notifications.final} final · ${summary.notifications.moved} movidos · ${summary.notifications.purged} purgados<br/><strong>Excepciones (whitelist):</strong> ${summary.skippedExceptions}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th align="left" style="padding:6px 10px;border-bottom:2px solid #666;">Bucket</th><th align="left" style="padding:6px 10px;border-bottom:2px solid #666;">Total</th><th align="left" style="padding:6px 10px;border-bottom:2px solid #666;">Tamaño</th><th align="left" style="padding:6px 10px;border-bottom:2px solid #666;">Candidatos</th></tr></thead><tbody>${bucketsTable}</tbody></table>
  </div>`;
  try {
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MusicDibs Ops <noreply@notify.musicdibs.com>",
          to: ["info@musicdibs.com"],
          subject: `[MusicDibs] Storage cleanup ${mode} — ${totalCandidates} candidatos, ${totalUsers} usuarios`,
          html: adminHtml,
        }),
      });
    }
  } catch (e) { log("admin summary email failed", (e as Error).message); }

  return json({ ok: true, ...summary, totalCandidates, totalUsers, durationMs });
});
