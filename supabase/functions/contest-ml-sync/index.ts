/**
 * contest-ml-sync — Supabase Edge Function
 *
 * Recibe el email (y nombre opcional) de un participante en un concurso/reto
 * de concurso.musicdibs.com y lo añade al grupo de MailerLite
 * "Concursos y sorteos", disparando automáticamente la automatización
 * "Remarketing concursos y sorteos".
 *
 * Configuración (secrets en Supabase Dashboard → Edge Functions → Secrets):
 *   ML_API_KEY      → MailerLite API key
 *   CONTEST_SECRET  → Token secreto para autenticar llamadas del frontend
 *
 * Llamada desde el frontend del concurso:
 *   POST https://<project>.supabase.co/functions/v1/contest-ml-sync
 *   Headers:
 *     Content-Type: application/json
 *     x-contest-secret: <CONTEST_SECRET>
 *   Body:
 *     { "email": "user@example.com", "name": "Nombre Apellido", "contest": "nombre-del-concurso" }
 */

const ML_BASE = 'https://connect.mailerlite.com/api';
const ML_GROUP_CONCURSOS = '188529232592241973'; // "Concursos y sorteos"

async function mlRequest(path: string, method: string, body?: unknown) {
  const ML_API_KEY = Deno.env.get('ML_API_KEY') ?? Deno.env.get('MAILERLITE_API_KEY');
  if (!ML_API_KEY) {
    throw new Error('ML_API_KEY no configurada');
  }
  const res = await fetch(`${ML_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${ML_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function addToContestGroup(email: string, name: string, contest: string, instagram: string) {
  return mlRequest('/subscribers', 'POST', {
    email,
    fields: {
      name,
      ...(contest ? { last_name: contest } : {}),
      ...(instagram ? { company: instagram } : {}),
    },
    groups: [ML_GROUP_CONCURSOS],
    resubscribe: true,
    autoresponders: true,
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function corsHeaders(_origin: string) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-contest-secret',
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const CONTEST_SECRET = Deno.env.get('CONTEST_SECRET');
  const incomingSecret = req.headers.get('x-contest-secret');

  if (CONTEST_SECRET && incomingSecret !== CONTEST_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  let email: string;
  let name: string;
  let contest: string;
  let mode: string;
  let instagram: string;
  let body: { email?: string; name?: string; contest?: string; mode?: string; instagram?: string };

  try {
    body = await req.json();
    email     = (body.email     ?? '').trim().toLowerCase();
    name      = (body.name      ?? '').trim();
    contest   = (body.contest   ?? '').trim();
    mode      = (body.mode      ?? 'sync').trim();
    instagram = (body.instagram ?? '').trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Email inválido o ausente' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  if (mode === 'check') {
    try {
      const ML_API_KEY = Deno.env.get('ML_API_KEY') ?? Deno.env.get('MAILERLITE_API_KEY');
      if (!ML_API_KEY) {
        return new Response(JSON.stringify({ error: 'ML_API_KEY no configurada' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
      const res = await fetch(`${ML_BASE}/subscribers/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${ML_API_KEY}`,
        },
      });

      if (res.status === 404) {
        return new Response(JSON.stringify({ alreadyParticipated: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ML GET /subscribers/${email} → ${res.status}: ${text}`);
      }

      const json = await res.json();
      const groups = json?.data?.groups ?? [];
      const inGroup = Array.isArray(groups) && groups.some((g: { id?: string }) => String(g?.id) === ML_GROUP_CONCURSOS);

      return new Response(JSON.stringify({ alreadyParticipated: inGroup }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    } catch (err) {
      console.error(`Error ML check para ${email}:`, err);
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  }

  try {
    await addToContestGroup(email, name, contest);
    console.log(`✅  ${email} añadido al grupo "Concursos y sorteos" [${contest}]`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  } catch (err) {
    console.error(`Error ML sync para ${email}:`, err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }
});
