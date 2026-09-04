#!/usr/bin/env node
/**
 * Postbuild SEO prerenderer.
 *
 * Vite builds an SPA where every route ships the same `index.html`, so social
 * crawlers (Facebook, Instagram, TikTok, LinkedIn, WhatsApp) — which do NOT
 * execute JavaScript — only ever see the generic homepage meta tags.
 *
 * This script copies `dist/index.html` for each SEO-critical route and rewrites
 * the head meta (title, description, canonical, og:*, twitter:*, JSON-LD) with
 * route-specific values. The result lives at e.g. `dist/distribution/index.html`
 * and the hosting layer serves it for direct hits to that path. The React app
 * still hydrates normally on top.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const BASE_URL = "https://musicdibs.com";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/27fdd7c8-3e07-4d0d-886d-53859f68e5de";

const LOCALE_MAP = {
  es: "es_ES",
  en: "en_US",
  "pt-BR": "pt_BR",
};

/**
 * Each route gets a full set of meta.
 * Add new SEO landings here — keep sorted by priority desc, then alpha.
 */
import { ROUTES, snapshotFileName } from "./prerender-routes.mjs";

// ── HTML manipulation helpers ─────────────────────────────────────────────────

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const replaceOrInsertMeta = (html, attr, value, content) => {
  const safeContent = escapeAttr(content);
  const re = new RegExp(`<meta\\s+${attr}=["']${value}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${value}" content="${safeContent}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `    ${tag}\n</head>`);
};

const replaceTitle = (html, title) => {
  const safe = escapeAttr(title);
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safe}</title>`);
};

const replaceOrInsertCanonical = (html, url) => {
  const safe = escapeAttr(url);
  const tag = `<link rel="canonical" href="${safe}" />`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, tag);
  }
  return html.replace("</head>", `    ${tag}\n</head>`);
};

const injectJsonLd = (html, schema) => {
  const tag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  return html.replace("</head>", `    ${tag}\n</head>`);
};

// ── Per-route builder ─────────────────────────────────────────────────────────

const buildHtmlForRoute = (template, route) => {
  const url = `${BASE_URL}${route.path}`;
  const ogLocale = LOCALE_MAP[route.locale] || "es_ES";

  let html = template;
  html = replaceTitle(html, route.title);
  html = replaceOrInsertMeta(html, "name", "description", route.description);
  html = replaceOrInsertCanonical(html, url);

  // Real document language for crawlers without JS.
  html = html.replace(/<html([^>]*)\slang=["'][^"']*["']/i, `<html$1 lang="${route.locale}"`);

  // Open Graph
  html = replaceOrInsertMeta(html, "property", "og:title", route.title);
  html = replaceOrInsertMeta(html, "property", "og:description", route.description);
  html = replaceOrInsertMeta(html, "property", "og:url", url);
  html = replaceOrInsertMeta(html, "property", "og:type", "website");
  html = replaceOrInsertMeta(html, "property", "og:image", DEFAULT_OG_IMAGE);
  html = replaceOrInsertMeta(html, "property", "og:locale", ogLocale);

  // Twitter
  html = replaceOrInsertMeta(html, "name", "twitter:title", route.title);
  html = replaceOrInsertMeta(html, "name", "twitter:description", route.description);
  html = replaceOrInsertMeta(html, "name", "twitter:url", url);

  // hreflang canonical for this specific route
  const langPrefix = route.locale === "en" ? "/en" : route.locale === "pt-BR" ? "/pt-BR" : "";
  html = html.replace(
    /<link rel="alternate" hrefLang="x-default"[^>]*>/i,
    `<link rel="alternate" hrefLang="x-default" href="${escapeAttr(BASE_URL + route.path)}" />`
  );

  // Route-specific JSON-LD (injected after the base Organization schema)
  if (route.jsonLd) {
    html = injectJsonLd(html, route.jsonLd);
  }

  // Real rendered body for crawlers (fixes Soft 404 — see injectBody below)
  if (route.bodyHtml) {
    html = injectBody(html, route.bodyHtml);
  }

  return html;
};

// ── Body injection ────────────────────────────────────────────────────────────
//
// Googlebot only renders JavaScript opportunistically. Serving an empty
// `<div id="root">` with an aria-hidden loading shell made Google classify
// these routes as Soft 404 ("page has no substantial content"). We replace the
// shell with the real rendered markup so a crawler without JS sees the page.
//
// React still mounts with `createRoot(...)`, which clears the container and
// renders from scratch, so real users are unaffected — there is no hydration
// mismatch, only a repaint of content the crawler already saw.

const injectBody = (html, bodyHtml) => {
  const rootRe = /<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body>)/i;
  const replacement = `<div id="root">${bodyHtml}</div>\n    `;
  if (rootRe.test(html)) return html.replace(rootRe, replacement);
  // Fallback: empty root element on a single line.
  return html.replace(/<div id="root">\s*<\/div>/i, replacement);
};

// ── Write one route ───────────────────────────────────────────────────────────

const SNAPSHOT_DIR = path.resolve(__dirname, "..", "prerender-bodies");

/** Read the committed body snapshot for a static landing route, if any. */
const readSnapshot = async (routePath) => {
  try {
    const html = await fs.readFile(path.join(SNAPSHOT_DIR, snapshotFileName(routePath)), "utf8");
    return html.trim().length > 500 ? html : null;
  } catch {
    return null;
  }
};

const writeRoute = async (template, route) => {
  const html = buildHtmlForRoute(template, route);
  const dir = path.join(DIST, route.path.replace(/^\//, ""));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
  console.log(`  ✓ ${route.path}/index.html${route.bodyHtml ? " (+body)" : ""}`);
};


// ── Entry point ───────────────────────────────────────────────────────────────

// ── Fetch blog posts for per-article prerender ────────────────────────────────

// Hardcoded anon-key fallback so the postbuild prerender still runs when the
// build environment doesn't inject VITE_SUPABASE_* (Lovable's build step
// sometimes does not). This is the same publishable anon key shipped in the
// client bundle — safe to embed.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://kmwehyixenybegwhqljx.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttd2VoeWl4ZW55YmVnd2hxbGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDEwMzQsImV4cCI6MjA5MDAxNzAzNH0.DZ2gEjz_DAkHfEetYo72NAUbdhq2lui9rIrMysWJUNo";

/**
 * Static article markup served to crawlers.
 *
 * Blog content is stored as HTML, so no browser is needed here — we only strip
 * anything a static document must not carry (scripts, event handlers, iframes).
 */
const stripUnsafe = (html) =>
  String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildArticleBody = (post, desc) => {
  const content = stripUnsafe(post.content);
  if (!content || content.replace(/<[^>]+>/g, "").trim().length < 300) return null;
  const date = post.published_at ? String(post.published_at).slice(0, 10) : "";
  const image = post.image_url
    ? `<img src="${escapeAttr(post.image_url)}" alt="${escapeAttr(post.title || "")}" width="1200" height="630" loading="eager" />`
    : "";
  return [
    `<main>`,
    `<article>`,
    `<h1>${escapeHtml(post.title || post.slug)}</h1>`,
    date ? `<p><time datetime="${escapeAttr(date)}">${escapeHtml(date)}</time></p>` : "",
    `<p>${escapeHtml(desc)}</p>`,
    image,
    `<div class="article-content">${content}</div>`,
    `</article>`,
    `<nav><a href="/news">Musicdibs Blog</a> · <a href="/registro-musical">Registrar una canción</a> · <a href="/musicdibs-vs-udio">Musicdibs vs Udio</a></nav>`,
    `</main>`,
  ]
    .filter(Boolean)
    .join("\n");
};

const fetchBlogRoutes = async () => {
  if (!SUPABASE_KEY) {
    console.warn("[prerender-seo] no VITE_SUPABASE_PUBLISHABLE_KEY — skipping blog prerender");
    return [];
  }
  try {
    const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,title,excerpt,content,language,image_url,published_at,updated_at,tags&published=eq.true`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[prerender-seo] blog fetch failed: ${res.status}`);
      return [];
    }
    const posts = await res.json();
    return posts
      .filter((p) => p.slug)
      .map((p) => {
        const locale = p.language === "en" ? "en" : p.language === "pt-BR" || p.language === "pt" ? "pt-BR" : "es";
        const rawTitle = (p.title || p.slug).slice(0, 70);
        // Build a robust, unique description: excerpt → title+slug hint → slug words.
        // Never rely on a shared fallback string (that would create duplicates across posts).
        const slugWords = String(p.slug).replace(/[-_]+/g, " ").trim();
        const baseDesc = (p.excerpt && p.excerpt.trim())
          || (p.title ? `${p.title} — ${slugWords}` : slugWords)
          || `Musicdibs · ${p.slug}`;
        const desc = baseDesc.slice(0, 155);
        return {
          path: `/news/${p.slug}`,
          locale,
          title: `${rawTitle} | Musicdibs`,
          description: desc,
          // Crawler-visible article markup. The stored content is already HTML
          // (the app renders it with dangerouslySetInnerHTML after sanitising),
          // so we can serve the same markup statically without a browser.
          bodyHtml: buildArticleBody(p, desc),
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.title,
            description: desc,
            image: p.image_url || DEFAULT_OG_IMAGE,
            datePublished: p.published_at || undefined,
            dateModified: p.updated_at || p.published_at || undefined,
            author: { "@type": "Organization", name: "Musicdibs" },
            publisher: {
              "@type": "Organization",
              name: "Musicdibs",
              logo: { "@type": "ImageObject", url: `${BASE_URL}/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png` },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/news/${p.slug}` },
            ...(p.tags && p.tags.length ? { keywords: p.tags.join(", ") } : {}),
          },
        };
      });
  } catch (err) {
    console.warn(`[prerender-seo] blog fetch error: ${err?.message || err}`);
    return [];
  }
};

// ── Canonicalization: guarantee unique meta descriptions ─────────────────────
//
// Semrush/Google flag any two indexable pages that ship the same
// <meta name="description">. We normalise + dedupe every description across
// the full route set (ROUTES + blog posts) before writing HTML. When a
// collision is detected we append a stable, page-specific suffix derived from
// the route path so each page keeps its own self-referential canonical + a
// unique description without needing manual copy edits.

const LOCALE_LABEL = { es: "ES", en: "EN", "pt-BR": "PT" };

const buildSuffix = (route) => {
  const seg = route.path.split("/").filter(Boolean).pop() || "home";
  const words = seg.replace(/[-_]+/g, " ").trim();
  const loc = LOCALE_LABEL[route.locale] || "ES";
  return ` · ${words} (${loc})`;
};

const dedupeDescriptions = (routes) => {
  const seen = new Map(); // normalizedDesc -> count
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  let touched = 0;
  for (const r of routes) {
    let desc = (r.description || "").trim();
    let key = norm(desc);
    if (seen.has(key)) {
      const suffix = buildSuffix(r);
      // Truncate to keep total ≤ 158 chars while preserving the suffix.
      const maxBase = Math.max(20, 158 - suffix.length);
      desc = desc.slice(0, maxBase).replace(/\s+\S*$/, "") + suffix;
      key = norm(desc);
      // If somehow still colliding, append an index disambiguator.
      let i = 2;
      while (seen.has(key)) {
        desc = `${desc} #${i++}`;
        key = norm(desc);
      }
      r.description = desc;
      touched++;
    }
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  if (touched) {
    console.log(`[prerender-seo] deduped ${touched} duplicate meta description(s) via canonicalization suffix`);
  }
  return routes;
};

const main = async () => {
  const indexPath = path.join(DIST, "index.html");
  let template;
  try {
    template = await fs.readFile(indexPath, "utf8");
  } catch {
    console.warn(`[prerender-seo] dist/index.html not found — skipping (run vite build first)`);
    return;
  }
  const blogRoutes = await fetchBlogRoutes();
  // Attach the committed body snapshots (captured by
  // scripts/capture-prerender-bodies.mjs) to the static landing routes.
  const staticRoutes = await Promise.all(
    ROUTES.map(async (r) => ({ ...r, bodyHtml: r.bodyHtml || (await readSnapshot(r.path)) })),
  );
  const missing = staticRoutes.filter((r) => !r.bodyHtml).map((r) => r.path);
  if (missing.length) {
    console.warn(
      `[prerender-seo] ${missing.length} route(s) without body snapshot (Google may treat them as Soft 404): ${missing.join(", ")}`,
    );
  }
  const allRoutes = dedupeDescriptions([...staticRoutes, ...blogRoutes]);
  console.log(`[prerender-seo] generating static SEO HTML for ${allRoutes.length} routes (${blogRoutes.length} blog posts):`);
  await Promise.all(allRoutes.map((r) => writeRoute(template, r)));
  console.log(`[prerender-seo] done ✓`);
};

main().catch((err) => {
  console.error("[prerender-seo] FAILED:", err);
  process.exit(1);
});
