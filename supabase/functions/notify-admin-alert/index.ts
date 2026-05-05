import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id, source, severity, message, context } = await req.json();
    if (!source || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sev = String(severity || "warn").toUpperCase();
    const subject = `[MusicDibs ${sev}] ${source}: ${String(message).slice(0, 100)}`;
    const ctxJson = context ? JSON.stringify(context, null, 2) : "(sin contexto)";
    const adminUrl = "https://musicdibs.com/admin/alerts";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color:${sev === "CRITICAL" ? "#b91c1c" : sev === "ERROR" ? "#dc2626" : "#d97706"};">
          ⚠️ Alerta ${sev} — ${escapeHtml(source)}
        </h2>
        <p><strong>Mensaje:</strong> ${escapeHtml(message)}</p>
        ${id ? `<p><strong>ID:</strong> <code>${escapeHtml(id)}</code></p>` : ""}
        <p><strong>Contexto:</strong></p>
        <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;">${escapeHtml(ctxJson)}</pre>
        <p><a href="${adminUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Ver panel de alertas</a></p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">Email automático del sistema de monitorización de MusicDibs.</p>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MusicDibs Alerts <noreply@notify.musicdibs.com>",
        to: ["info@musicdibs.com"],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[notify-admin-alert] Resend failed:", errText);
      return new Response(JSON.stringify({ error: "resend_failed", detail: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[notify-admin-alert] Fatal:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
