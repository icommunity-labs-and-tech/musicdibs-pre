import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Temporal: utilidades de inspección/creación en MailerLite.
serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("t") !== "z7Qm4vXp1LbT9sKd") {
    return new Response("unauthorized", { status: 401 });
  }
  const ML_KEY = Deno.env.get("MAILERLITE_API_KEY")!;
  const auth = { Authorization: `Bearer ${ML_KEY}`, "Content-Type": "application/json", Accept: "application/json" };
  const body = await req.json() as { emails?: string[]; createGroups?: string[]; createFields?: string[] };

  if (body.createGroups?.length || body.createFields?.length) {
    const out: Record<string, unknown> = {};
    for (const name of body.createGroups || []) {
      const res = await fetch("https://connect.mailerlite.com/api/groups", {
        method: "POST", headers: auth, body: JSON.stringify({ name }),
      });
      const d = await res.json();
      out[`group:${name}`] = res.ok ? d.data?.id : { status: res.status, d };
    }
    for (const name of body.createFields || []) {
      const res = await fetch("https://connect.mailerlite.com/api/fields", {
        method: "POST", headers: auth, body: JSON.stringify({ name, type: "text" }),
      });
      const d = await res.json();
      out[`field:${name}`] = res.ok ? d.data?.key : { status: res.status, d };
    }
    return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
  }

  const emails = body.emails || [];
  if (!emails.length) {
    const g = await fetch("https://connect.mailerlite.com/api/groups?limit=200", { headers: auth });
    const gd = await g.json();
    const f = await fetch("https://connect.mailerlite.com/api/fields?limit=200", { headers: auth });
    const fd = await f.json();
    return new Response(JSON.stringify({
      groups: (gd.data || []).map((x: { id: string; name: string }) => `${x.id}:${x.name}`),
      fields: (fd.data || []).map((x: { key: string; type: string }) => `${x.key}:${x.type}`),
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  }

  const out: Record<string, unknown> = {};
  for (const email of emails) {
    const res = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      { headers: auth },
    );
    if (!res.ok) { out[email] = { status: res.status }; continue; }
    const data = await res.json();
    out[email] = {
      status: 200,
      groups: (data.data?.groups || []).map((g: { id: string; name: string }) => `${g.id}:${g.name}`),
      fields_origen: data.data?.fields?.origen ?? null,
      created_at: data.data?.created_at,
    };
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
