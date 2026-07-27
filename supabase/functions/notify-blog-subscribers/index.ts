// Notify blog subscribers when a post is published.
// Recipient list is sourced from MailerLite groups (per language),
// emails are sent via Resend (batch API) so we don't depend on MailerLite Premium.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILERLITE_BASE = "https://connect.mailerlite.com/api";
const RESEND_BASE = "https://api.resend.com";
const SITE_BASE = "https://www.musicdibs.com";
const FROM = "Musicdibs <no-reply@musicdibs.com>";

const GROUP_NAMES: Record<string, string> = {
  es: "TODOS Musicdibs ES",
  en: "TODOS Musicdibs EN",
  pt: "Todos Musicdibs BR",
};

const SUBJECTS: Record<string, (t: string) => string> = {
  es: (t) => `Nuevo artículo en Musicdibs: ${t}`,
  en: (t) => `New Musicdibs article: ${t}`,
  pt: (t) => `Novo artigo no Musicdibs: ${t}`,
};

const CTA: Record<string, string> = { es: "Leer artículo", en: "Read article", pt: "Ler artigo" };
const INTRO: Record<string, string> = {
  es: "Acabamos de publicar un nuevo artículo que creemos que te va a interesar:",
  en: "We just published a new article we think you'll enjoy:",
  pt: "Acabamos de publicar um novo artigo que achamos que você vai gostar:",
};
const FOOTER: Record<string, string> = {
  es: "Musicdibs — Registra, distribuye y promociona tu música.",
  en: "Musicdibs — Register, distribute and promote your music.",
  pt: "Musicdibs — Registre, distribua e promova sua música.",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildHtml(post: { title: string; excerpt: string | null; image_url: string | null; slug: string; language: string; }) {
  const lang = (post.language || "es").toLowerCase();
  const url = `${SITE_BASE}/news/${post.slug}`;
  const cta = CTA[lang] || CTA.es;
  const intro = INTRO[lang] || INTRO.es;
  const footer = FOOTER[lang] || FOOTER.es;
  const image = post.image_url
    ? `<img src="${post.image_url}" alt="" style="width:100%;max-width:600px;border-radius:12px;display:block;margin:0 auto 24px;">`
    : "";
  const excerpt = post.excerpt
    ? `<p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 24px;">${post.excerpt}</p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px;background:#ffffff;">
    <p style="font-size:14px;color:#64748b;margin:0 0 16px;">${intro}</p>
    <h1 style="font-size:26px;line-height:1.25;margin:0 0 20px;color:#0f172a;">${post.title}</h1>
    ${image}
    ${excerpt}
    <p style="text-align:center;margin:32px 0;">
      <a href="${url}" style="background:linear-gradient(90deg,#db2777,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-weight:600;display:inline-block;">${cta}</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:40px 0 0;">${footer}</p>
  </div>
</body></html>`;
}

async function ml<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MAILERLITE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MailerLite ${path} ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) as T : ({} as T);
}

async function resolveGroupId(name: string, apiKey: string): Promise<string | null> {
  const data = await ml<{ data: Array<{ id: string; name: string }> }>(
    `/groups?filter[name]=${encodeURIComponent(name)}&limit=50`, apiKey,
  );
  const match = data.data?.find((g) => g.name.trim().toLowerCase() === name.toLowerCase());
  return match?.id ?? null;
}

async function fetchGroupSubscribers(groupId: string, apiKey: string): Promise<string[]> {
  const emails: string[] = [];
  let cursor: string | null = null;
  let page = 0;
  while (page < 200) {
    const qs = new URLSearchParams({
      "filter[status]": "active",
      limit: "1000",
    });
    if (cursor) qs.set("cursor", cursor);
    const data = await ml<{ data: Array<{ email: string }>; meta?: { next_cursor?: string | null } }>(
      `/subscribers?filter[group]=${groupId}&${qs.toString()}`,
      apiKey,
    );
    for (const s of data.data || []) if (s.email) emails.push(s.email.toLowerCase());
    cursor = data.meta?.next_cursor || null;
    if (!cursor) break;
    page++;
  }
  return Array.from(new Set(emails));
}

async function resendBatch(emails: string[], subject: string, html: string, resendKey: string): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0, failed = 0;
  const errors: string[] = [];
  // Resend batch endpoint accepts up to 100 messages per call.
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100).map((to) => ({ from: FROM, to: [to], subject, html }));
    const res = await fetch(`${RESEND_BASE}/emails/batch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    const text = await res.text();
    if (!res.ok) {
      failed += chunk.length;
      errors.push(`batch ${i}: ${res.status} ${text.slice(0, 300)}`);
    } else {
      sent += chunk.length;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { sent, failed, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const triggerSecret = Deno.env.get("NOTIFY_BLOG_TRIGGER_SECRET");
    const mlKey = Deno.env.get("MAILERLITE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!mlKey) return json({ error: "MAILERLITE_API_KEY missing" }, 500);
    if (!resendKey) return json({ error: "RESEND_API_KEY missing" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const xCron = req.headers.get("x-cron-secret") || "";
    const bearer = authHeader.replace("Bearer ", "");
    let authorized =
      bearer === serviceRoleKey ||
      (cronSecret && (bearer === cronSecret || xCron === cronSecret)) ||
      (triggerSecret && (bearer === triggerSecret || xCron === triggerSecret));

    if (!authorized && bearer) {
      try {
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${bearer}` },
        });
        if (userRes.ok) {
          const user = await userRes.json();
          if (user?.id) {
            const roleRes = await fetch(
              `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
              { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
            );
            const roles = await roleRes.json();
            if (Array.isArray(roles) && roles.length > 0) authorized = true;
          }
        }
      } catch (_) { /* ignore */ }
    }

    if (!authorized) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const postId: string | undefined = body.post_id || body.postId;
    const force: boolean = body.force === true;
    if (!postId) return json({ error: "post_id required" }, 400);

    const postRes = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?id=eq.${postId}&select=id,title,excerpt,image_url,slug,language,published,subscribers_notified_at`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    const posts = await postRes.json();
    const post = Array.isArray(posts) ? posts[0] : null;
    if (!post) return json({ error: "post_not_found" }, 404);
    if (!post.published) return json({ skipped: "not_published" });
    if (post.subscribers_notified_at && !force) return json({ skipped: "already_notified" });

    const lang = (post.language || "es").toLowerCase();
    const groupName = GROUP_NAMES[lang];
    if (!groupName) return json({ skipped: `unsupported_language_${lang}` });

    const groupId = await resolveGroupId(groupName, mlKey);
    if (!groupId) return json({ error: `group_not_found: ${groupName}` }, 404);

    const emails = await fetchGroupSubscribers(groupId, mlKey);
    if (emails.length === 0) return json({ skipped: "no_subscribers", group: groupName });

    // Filter out suppressed emails (bounces/complaints/unsubscribes)
    const suppRes = await fetch(
      `${supabaseUrl}/rest/v1/suppressed_emails?select=email`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    const suppressed = new Set<string>();
    if (suppRes.ok) {
      const rows = await suppRes.json();
      if (Array.isArray(rows)) for (const r of rows) if (r?.email) suppressed.add(String(r.email).toLowerCase());
    }
    const finalEmails = emails.filter((e) => !suppressed.has(e));

    const subject = (SUBJECTS[lang] || SUBJECTS.es)(post.title);
    const html = buildHtml(post);

    const result = await resendBatch(finalEmails, subject, html, resendKey);

    await fetch(`${supabaseUrl}/rest/v1/blog_posts?id=eq.${postId}`, {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ subscribers_notified_at: new Date().toISOString() }),
    });

    return json({
      sent: result.sent,
      failed: result.failed,
      total_recipients: finalEmails.length,
      suppressed_skipped: emails.length - finalEmails.length,
      group: groupName,
      errors: result.errors.slice(0, 5),
    });
  } catch (err) {
    console.error("notify-blog-subscribers error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
