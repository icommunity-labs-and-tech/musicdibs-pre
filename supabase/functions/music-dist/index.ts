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
//
// Además soporta `?lang=en|pt` para servir el HTML traducido (OpenAI gpt-5.4),
// con caché persistente en el propio bucket bajo `_i18n/<lang>/<ruta>`.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const BUCKET = "music-dist";
const FUNCTION_PREFIX = "/music-dist";

const LANGUAGES: Record<string, string> = {
  en: "British English",
  pt: "Brazilian Portuguese",
};

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

const fetchObject = async (path: string) =>
  await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`, { method: "GET" });

const cacheObject = async (path: string, html: string) => {
  if (!SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "text/html; charset=utf-8",
        "x-upsert": "true",
      },
      body: html,
    });
  } catch (error) {
    console.error("cache_upload_failed", path, error);
  }
};

const translateHtmlWithOpenAI = async (html: string, lang: string) => {
  if (!OPENAI_API_KEY) throw new Error("missing_openai_key");

  const prompt =
    `Translate the visible text of this HTML document from Spanish to ${LANGUAGES[lang]}.\n` +
    "Rules: keep the markup, attributes, classes, hrefs, src and inline SVG exactly as they are; " +
    `only translate text nodes, the <title>, meta description and alt/title attributes; set lang="${lang}" on <html>; ` +
    "do not add explanations. Return ONLY the resulting HTML document.\n\n" +
    html;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 32768,
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200).replace(/[\r\n]+/g, " ");
    throw new Error(`openai_${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  if (!cleaned.toLowerCase().includes("<body")) throw new Error("translation_invalid");
  return { html: cleaned, provider: "openai" as const };
};

const translateHtmlWithGemini = async (html: string, lang: string) => {
  if (!GEMINI_API_KEY) throw new Error("missing_gemini_key");

  const prompt =
    `Translate the visible text of this HTML document from Spanish to ${LANGUAGES[lang]}.\n` +
    "Rules: keep the markup, attributes, classes, hrefs, src and inline SVG exactly as they are; " +
    `only translate text nodes, the <title>, meta description and alt/title attributes; set lang="${lang}" on <html>; ` +
    "do not add explanations. Return ONLY the resulting HTML document.\n\n" +
    html;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 32768 },
      }),
    },
  );

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200).replace(/[\r\n]+/g, " ");
    throw new Error(`gemini_${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part?.text ?? "")
    .join("");
  const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  if (!cleaned.toLowerCase().includes("<body")) throw new Error("translation_invalid");
  return { html: cleaned, provider: "gemini" as const };
};

// Prioriza el proveedor más barato (Gemini 1.5 Flash) y deja OpenAI como fallback.
const translateHtml = async (html: string, lang: string) => {
  if (GEMINI_API_KEY) {
    try {
      return await translateHtmlWithGemini(html, lang);
    } catch (error) {
      console.error("gemini_translation_failed", error);
      if (OPENAI_API_KEY) {
        console.log("falling_back_to_openai");
        return await translateHtmlWithOpenAI(html, lang);
      }
      throw error;
    }
  }
  return await translateHtmlWithOpenAI(html, lang);
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

  const lang = (url.searchParams.get("lang") ?? "").toLowerCase();
  const isHtml = /\.html?$/i.test(path);
  const wantsTranslation = isHtml && Boolean(LANGUAGES[lang]);

  if (wantsTranslation) {
    for (const provider of ["gemini", "openai"] as const) {
      const cached = await fetchObject(`_i18n/${provider}/${lang}/${path}`);
      if (cached.ok) {
        const cachedHtml = await cached.text();
        return new Response(req.method === "HEAD" ? null : cachedHtml, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": MIME_TYPES.html,
            "Cache-Control": "public, max-age=300",
            "X-Frame-Options": "SAMEORIGIN",
            "X-Translation-Provider": `${provider} (cached)`,
          },
        });
      }
    }
  }

  const upstream = await fetchObject(path);

  if (!upstream.ok) {
    return new Response("Not found", {
      status: upstream.status === 400 ? 404 : upstream.status,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (wantsTranslation) {
    const source = await upstream.text();
    try {
      const { html: translated, provider } = await translateHtml(source, lang);
      await cacheObject(`_i18n/${provider}/${lang}/${path}`, translated);
      return new Response(req.method === "HEAD" ? null : translated, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": MIME_TYPES.html,
          "Cache-Control": "public, max-age=300",
          "X-Frame-Options": "SAMEORIGIN",
          "X-Translation-Provider": provider,
        },
      });
    } catch (error) {
      console.error("translation_failed", path, lang, error);
      const reason = error instanceof Error ? error.message : "unknown";
      // Fallback: devuelve el original en español.
      return new Response(req.method === "HEAD" ? null : source, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": MIME_TYPES.html,
          "Cache-Control": "public, max-age=60",
          "X-Translation-Error": reason,
          "X-Frame-Options": "SAMEORIGIN",
        },
      });
    }
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
