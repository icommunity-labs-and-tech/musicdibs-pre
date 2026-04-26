import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BlogPost = {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  language: string | null;
  published_at: string | null;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getNextWeekRange() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilNextMonday = ((8 - day) % 7) || 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + daysUntilNextMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { monday, sunday };
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

function buildEmail(posts: BlogPost[], monday: Date, sunday: Date) {
  const rows = posts.map((post) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;"><strong>${post.title}</strong><br><span style="color:#64748b;">${post.excerpt || "Sin extracto"}</span></td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${post.category || "Musicdibs"}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-transform:uppercase;">${post.language || "es"}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${post.published_at ? formatDate(post.published_at) : "Sin fecha"}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;"><a href="https://musicdibs-pre.lovable.app/admin/blog?edit=${post.id}">Editar</a></td>
    </tr>`).join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5;">
      <h1 style="font-size:24px;">Publicaciones planificadas</h1>
      <p>Semana del ${formatDate(monday)} al ${formatDate(sunday)}.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <thead style="background:#f8fafc;">
          <tr>
            <th style="padding:12px;text-align:left;">Artículo</th>
            <th style="padding:12px;text-align:left;">Categoría</th>
            <th style="padding:12px;text-align:left;">Idioma</th>
            <th style="padding:12px;text-align:left;">Fecha</th>
            <th style="padding:12px;text-align:left;">Acción</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#475569;">Los artículos se publicarán automáticamente en la fecha indicada. Si deseas modificar o cancelar alguno, accede al panel antes de la fecha de publicación.</p>
    </div>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Musicdibs <no-reply@musicdibs.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend error ${response.status}: ${details}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const bearer = authHeader.replace("Bearer ", "");
    if (bearer !== serviceRoleKey && (!cronSecret || bearer !== cronSecret)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    const { error: publishError } = await supabase
      .from("blog_posts")
      .update({ published: true, scheduled: false, updated_at: now })
      .eq("published", false)
      .lte("published_at", now);
    if (publishError) throw publishError;

    const { monday, sunday } = getNextWeekRange();
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id,title,excerpt,category,language,published_at")
      .eq("published", false)
      .gte("published_at", monday.toISOString())
      .lte("published_at", sunday.toISOString())
      .order("published_at", { ascending: true });
    if (error) throw error;

    if (!posts || posts.length === 0) {
      return jsonResponse({ sent: false, published_due: true, planned_count: 0 });
    }

    const subject = `📅 Publicaciones planificadas semana del ${formatDate(monday)} al ${formatDate(sunday)}`;
    await sendEmail("marketing@musicdibs.com", subject, buildEmail(posts as BlogPost[], monday, sunday));

    return jsonResponse({ sent: true, planned_count: posts.length });
  } catch (error) {
    console.error("blog-weekly-digest error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
