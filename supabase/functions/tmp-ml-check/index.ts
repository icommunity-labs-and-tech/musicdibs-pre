import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Temporal: comprueba si unos emails existen como suscriptores en MailerLite.
serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("t") !== "z7Qm4vXp1LbT9sKd") {
    return new Response("unauthorized", { status: 401 });
  }
  const ML_KEY = Deno.env.get("MAILERLITE_API_KEY")!;
  const { emails } = await req.json() as { emails: string[] };
  const out: Record<string, unknown> = {};
  for (const email of emails) {
    const res = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${ML_KEY}`, Accept: "application/json" } },
    );
    if (!res.ok) {
      out[email] = { status: res.status };
      continue;
    }
    const data = await res.json();
    out[email] = {
      status: 200,
      groups: (data.data?.groups || []).map((g: { id: string; name: string }) => `${g.id}:${g.name}`),
      fields_origen: data.data?.fields?.origen ?? null,
      created_at: data.data?.created_at,
    };
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
