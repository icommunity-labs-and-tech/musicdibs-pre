// Notify MailerLite subscribers when a blog post is published.
// Triggered by a Postgres trigger on public.blog_posts when `published` becomes true.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILERLITE_BASE = "https://connect.mailerlite.com/api";
const SITE_BASE = "https://www.musicdibs.com";

const GROUP_NAMES: Record<string, string> = {
  es: "TODOS Musicdibs ES",
  en: "TODOS Musicdibs EN",
  pt: "TODOS Musicdibs PT",
};

const SUBJECTS: Record<string, (t: string) => string> = {
  es: (t) => `Nuevo artículo en Musicdibs: ${t}`,
  en: (t) => `New Musicdibs article: ${t}`,
  pt: (t) => `Novo artigo no Musicdibs: ${t}`,
};

const CTA: Record<string, string> = {
  es: "Leer artículo",
  en: "Read article",
  pt: "Ler artigo",
};

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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildHtml(post: {
  title: string;
  excerpt: string | null;
  image_url: string | null;
  slug: string;
  language: string;
}) {
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
  if (!res.ok) {
    throw new Error(`MailerLite ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) as T : ({} as T);
}

async function resolveGroupId(name: string, apiKey: string): Promise<string | null> {
  const data = await ml<{ data: Array<{ id: string; name: string }> }>(
    `/groups?filter[name]=${encodeURIComponent(name)}&limit=50`,
    apiKey,
  );
  const match = data.data?.find((g) => g.name.trim().toLowerCase() === name.toLowerCase());
  return match?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const triggerSecret = Deno.env.get("NOTIFY_BLOG_TRIGGER_SECRET");
    const mlKey = Deno.env.get("MAILERLITE_API_KEY");

    if (!mlKey) return jsonResponse({ error: "MAILERLITE_API_KEY missing" }, 500);

    // Auth: allow service role, CRON_SECRET, matching x-cron-secret, or admin user JWT
    const authHeader = req.headers.get("Authorization") || "";
    const xCron = req.headers.get("x-cron-secret") || "";
    const bearer = authHeader.replace("Bearer ", "");
    let authorized =
      bearer === serviceRoleKey ||
      (cronSecret && (bearer === cronSecret || xCron === cronSecret)) ||
      (triggerSecret && (bearer === triggerSecret || xCron === triggerSecret));

    if (!authorized && bearer) {
      // Fallback: verify caller is an authenticated admin
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

    if (!authorized) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const postId: string | undefined = body.post_id || body.postId;
    if (!postId) return jsonResponse({ error: "post_id required" }, 400);

    // Fetch post via PostgREST with service role
    const postRes = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?id=eq.${postId}&select=id,title,excerpt,image_url,slug,language,published,subscribers_notified_at`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    const posts = await postRes.json();
    const post = Array.isArray(posts) ? posts[0] : null;
    if (!post) return jsonResponse({ error: "post_not_found" }, 404);
    if (!post.published) return jsonResponse({ skipped: "not_published" });
    if (post.subscribers_notified_at) return jsonResponse({ skipped: "already_notified" });

    const lang = (post.language || "es").toLowerCase();
    const groupName = GROUP_NAMES[lang];
    if (!groupName) return jsonResponse({ skipped: `unsupported_language_${lang}` });

    const groupId = await resolveGroupId(groupName, mlKey);
    if (!groupId) return jsonResponse({ error: `group_not_found: ${groupName}` }, 404);

    const subject = (SUBJECTS[lang] || SUBJECTS.es)(post.title);
    const html = buildHtml(post);

    // 1) Create draft campaign
    const created = await ml<{ data: { id: string } }>("/campaigns", mlKey, {
      method: "POST",
      body: JSON.stringify({
        name: `Blog · ${post.title}`.slice(0, 120),
        language_id: undefined,
        type: "regular",
        emails: [
          {
            subject,
            from_name: "Musicdibs",
            from: "no-reply@musicdibs.com",
            content: html,
          },
        ],
        groups: [groupId],
      }),
    });
    const campaignId = created.data?.id;
    if (!campaignId) throw new Error("campaign_id missing in MailerLite response");

    // 2) Schedule immediately
    await ml(`/campaigns/${campaignId}/schedule`, mlKey, {
      method: "POST",
      body: JSON.stringify({ delivery: "instant" }),
    });

    // 3) Mark as notified
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

    return jsonResponse({ sent: true, campaign_id: campaignId, group: groupName });
  } catch (err) {
    console.error("notify-blog-subscribers error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
