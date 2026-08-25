// Proxy público del sitio estático alojado en el bucket `music-dist`.
//
// Motivo: Supabase Storage sirve todos los objetos como `text/plain` con
// `X-Content-Type-Options: nosniff` y `Content-Security-Policy: default-src 'none'; sandbox`.
// Eso hace que el HTML se muestre como texto plano y que el CSS, las imágenes
// y las subpáginas queden bloqueados por el navegador.
//
// Esta función reenvía el objeto solicitado con el Content-Type correcto y sin
// la CSP restrictiva, de forma que las rutas relativas (`assets/style.css`,
// `guia/<seccion>/index.html`) funcionan con normalidad.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const BUCKET = "music-dist";
const FUNCTION_PREFIX = "/music-dist";

const MIME_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  pdf: "application/pdf",
};

const contentTypeFor = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  let path = url.pathname;

  // Quita el prefijo de la función (/functions/v1/music-dist o /music-dist).
  const idx = path.indexOf(FUNCTION_PREFIX);
  if (idx !== -1) path = path.slice(idx + FUNCTION_PREFIX.length);
  path = path.replace(/^\/+/, "");

  // Rutas tipo directorio -> index.html
  if (path === "" || path.endsWith("/")) path = `${path}index.html`;

  // Evita traversal fuera del bucket.
  if (path.split("/").some((segment) => segment === "..")) {
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }

  const objectUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  const upstream = await fetch(objectUrl, { method: "GET" });

  if (!upstream.ok) {
    return new Response("Not found", {
      status: upstream.status === 400 ? 404 : upstream.status,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const body = await upstream.arrayBuffer();

  return new Response(req.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": contentTypeFor(path),
      "Cache-Control": "public, max-age=300",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
});
