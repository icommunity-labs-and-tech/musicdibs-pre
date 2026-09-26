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
 * still mounts with createRoot on top.
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

// Keep committed React snapshots as the main body; the shared offer and
// questions below come from exactly the same translation bundles as React.
const MARKETING_ROUTES = new Set([
  "/features", "/pt/features", "/distribution", "/pt/distribution",
  "/music-distribution", "/registro-musical", "/registro-obras-musicales",
  "/derechos-autor-musica", "/register-a-song", "/copyright-a-song",
  "/certificado-blockchain", "/legal-validity", "/pt/legal-validity",
  "/promocion-musical", "/pt/promocion-musical", "/marketing", "/pt/marketing",
  "/ia-music-studio", "/ai-studio", "/ai-song-generator",
  "/generador-canciones-ia", "/all-in-one-music-platform", "/music-maker",
  "/creador-de-musica", "/faq",
]);

const LOCALE_FILES = { es: "es", en: "en", "pt-BR": "pt-BR" };
const readTranslations = async () => {
  const entries = await Promise.all(Object.entries(LOCALE_FILES).map(async ([locale, file]) => {
    const text = await fs.readFile(path.resolve(__dirname, `../src/locales/generated/${file}.json`), "utf8");
    return [locale, JSON.parse(text)];
  }));
  return Object.fromEntries(entries);
};

const escapeText = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const localeLinks = {
  es: [["/features", "features"], ["/registro-musical", "register"], ["/distribution", "distribution"], ["/faq", "faq"], ["/news", "news"]],
  en: [["/all-in-one-music-platform", "features"], ["/register-a-song", "register"], ["/distribution", "distribution"], ["/faq", "faq"], ["/news", "news"]],
  "pt-BR": [["/pt/features", "features"], ["/pt/legal-validity", "register"], ["/pt/distribution", "distribution"], ["/faq", "faq"], ["/news", "news"]],
};

const buildMarketingOverview = (translation, locale, isHome) => {
  const { hero, why, pricing, faq, nav } = translation;
  const pillars = ["legal", "instant", "distribution", "promo"]
    .map((key) => why.features[key]);
  const plans = [
    [pricing.nameMonthly, "6,90 €", pricing.priceMonthlySuffix, pricing.briefMonthly],
    [pricing.starter.name, "19,90 €", pricing.priceAnnualSuffix, pricing.starter.brief],
    [pricing.nameAnnual, "59,90 €", pricing.priceAnnualSuffix, pricing.briefAnnual],
  ];
  // Select actual questions shown in the React FAQ, not separate SEO-only answers.
  const questions = faq.items.filter((item) =>
    /blockchain|Spotify|crédit|credit|valid|registro|register/i.test(item.q)
  ).slice(0, 3);
  const links = localeLinks[locale].map(([href, key]) =>
    `<a href="${escapeText(href)}">${escapeText(nav[key] || key)}</a>`
  ).join(" · ");

  return `<div class="static-marketing-overview">
    ${isHome ? `<main><p>${escapeText(hero.subtitle_prefix)} ${escapeText(hero.subtitle_strong)}</p>` : ""}
    <section><h2>${escapeText(why.heading)}</h2><p>${escapeText(why.subheading)}</p>
      ${pillars.map((item) => `<article><h3>${escapeText(item.title)}</h3><p>${escapeText(item.desc)}</p></article>`).join("\n")}
    </section>
    <section><h2>${escapeText(pricing.title)}</h2><p>${escapeText(pricing.subtitle)}</p>
      ${plans.map(([name, price, period, description]) => `<article><h3>${escapeText(name)}</h3><p>${price}${escapeText(period)}</p><p>${escapeText(description)}</p></article>`).join("\n")}
    </section>
    <section><h2>${escapeText(faq.title)}</h2>
      ${questions.map((item) => `<article><h3>${escapeText(item.q)}</h3><p>${escapeText(item.a)}</p></article>`).join("\n")}
    </section>${isHome ? "</main>" : ""}
    <footer><nav aria-label="${escapeText(nav.info || "Musicdibs")}"><a href="/">Musicdibs</a> · ${links}</nav></footer>
  </div>`;
};

// Preserve the original LCP shell verbatim (including the LaunchBuff badge).
const extractShell = (html) => {
  const match = html.match(/<div class="app-lcp-shell" aria-hidden="true">[\s\S]*?<\/a><\/div>/i);
  if (!match) throw new Error("Homepage LCP shell or LaunchBuff anchor missing");
  return match[0];
};

// Snapshot navigation can have z-40. Put the opaque shell above it until
// createRoot replaces #root; never hide the indexable content with display:none.
const coverStaticBody = (html) => html.replace("</head>",
  "<style>.app-lcp-shell{z-index:2147483647}.static-marketing-overview{position:relative;z-index:-1}</style>\n</head>");

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

  // Drop the homepage VideoObject inherited from index.html: only the page
  // that actually embeds a video may declare one.
  html = html.replace(
    /<script type="application\/ld\+json">\s*\{[^<]*"@type":\s*"VideoObject"[\s\S]*?<\/script>/gi,
    ""
  );

  // VideoObject JSON-LD so the page qualifies as a video watch page
  if (route.videoJsonLd) {
    for (const video of [].concat(route.videoJsonLd)) {
      html = injectJsonLd(html, video);
    }
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


// ── Internal linking for blog articles ───────────────────────────────────────
//
// Search Console reported ~156 "Discovered – currently not indexed" article
// URLs: Google knew them from the sitemap but never crawled them. The static
// /news listing only exposes the 9 most recent posts and every article ended
// with the same 3 generic links, so the rest of the archive had no internal
// link pointing at it. Sitemap-only URLs get the lowest crawl priority.
//
// These helpers add real crawlable links: the full archive under /news, and a
// rotating set of same-language siblings at the end of every article.

const cleanTitle = (title) => String(title || "").replace(/\s*\|\s*Musicdibs\s*$/i, "").trim();

const linkList = (routes) =>
  routes
    .map((r) => `<li><a href="${escapeAttr(r.path)}">${escapeHtml(cleanTitle(r.title))}</a></li>`)
    .join("");

const NAV_HEADING = {
  es: "Todos los artículos del blog",
  en: "All blog articles",
  "pt-BR": "Todos os artigos do blog",
};
const RELATED_HEADING = {
  es: "Sigue leyendo en el blog de Musicdibs",
  en: "Keep reading on the Musicdibs blog",
  "pt-BR": "Continue lendo no blog da Musicdibs",
};

/** Full crawlable archive appended to the static /news body. */
const buildArchiveNav = (blogRoutes) => {
  if (!blogRoutes.length) return "";
  const byLocale = { es: [], en: [], "pt-BR": [] };
  for (const r of blogRoutes) (byLocale[r.locale] || byLocale.es).push(r);
  const sections = Object.entries(byLocale)
    .filter(([, list]) => list.length)
    .map(
      ([locale, list]) =>
        `<h2>${escapeHtml(NAV_HEADING[locale] || NAV_HEADING.es)}</h2><ul>${linkList(list)}</ul>`,
    )
    .join("");
  return `<nav aria-label="Blog archive" class="blog-archive-links">${sections}</nav>`;
};

/**
 * Related links for one article: same-language siblings, picked from a window
 * that rotates with the article's index so every post in the archive receives
 * inbound links instead of the newest ones absorbing them all.
 */
const buildRelatedNav = (route, siblings, index) => {
  const pool = siblings.filter((r) => r.path !== route.path);
  if (!pool.length) return "";
  const take = Math.min(12, pool.length);
  const picked = [];
  for (let i = 0; i < take; i++) picked.push(pool[(index * 7 + i * 3) % pool.length]);
  const unique = [...new Map(picked.map((r) => [r.path, r])).values()];
  const heading = RELATED_HEADING[route.locale] || RELATED_HEADING.es;
  return `<nav aria-label="Related articles"><h2>${escapeHtml(heading)}</h2><ul>${linkList(unique)}</ul></nav>`;
};

/** Appends the related-articles nav to every prerendered article body. */
const addInternalLinks = (blogRoutes) => {
  const byLocale = new Map();
  for (const r of blogRoutes) {
    if (!byLocale.has(r.locale)) byLocale.set(r.locale, []);
    byLocale.get(r.locale).push(r);
  }
  blogRoutes.forEach((r, i) => {
    if (!r.bodyHtml) return;
    const nav = buildRelatedNav(r, byLocale.get(r.locale) || [], i);
    if (nav) r.bodyHtml = `${r.bodyHtml}\n${nav}`;
  });
  return blogRoutes;
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
  const translations = await readTranslations();
  // dist/index.html doubles as the fallback for private SPA routes. Keep its
  // shell lightweight and put the indexable homepage at dist/index.html too;
  // the fixed shell covers the added content until React mounts, without hiding
  // it from non-JS readers. Do not inject a second copy of the badge.
  const homeBody = `${extractShell(template)}\n${buildMarketingOverview(translations.es, "es", true)}`;
  template = injectBody(template, homeBody);
  template = coverStaticBody(template);
  await fs.writeFile(indexPath, template, "utf8");
  const blogRoutes = await fetchBlogRoutes();
  // Attach the committed body snapshots (captured by
  // scripts/capture-prerender-bodies.mjs) to the static landing routes.
  const staticRoutes = await Promise.all(
    ROUTES.map(async (r) => {
      const snapshot = r.bodyHtml || (await readSnapshot(r.path));
      const overview = MARKETING_ROUTES.has(r.path)
        ? buildMarketingOverview(translations[r.locale] || translations.es, r.locale, false)
        : "";
      const shell = MARKETING_ROUTES.has(r.path)
        ? `<div class="app-lcp-shell" aria-hidden="true"><h1>${escapeText(r.title.replace(/\s*\|\s*Musicdibs.*$/i, ""))}</h1></div>`
        : "";
      return { ...r, bodyHtml: snapshot ? `${shell}${snapshot}\n${overview}` : (overview ? `${shell}<main><h1>${escapeText(r.title)}</h1><p>${escapeText(r.description)}</p>${overview}</main>` : null) };
    }),
  );
  const missing = staticRoutes.filter((r) => !r.bodyHtml).map((r) => r.path);
  if (missing.length) {
    console.warn(
      `[prerender-seo] ${missing.length} route(s) without body snapshot (Google may treat them as Soft 404): ${missing.join(", ")}`,
    );
  }
  addInternalLinks(blogRoutes);
  // Expose the whole archive from /news so no article is sitemap-only.
  const archiveNav = buildArchiveNav(blogRoutes);
  const newsRoute = staticRoutes.find((r) => r.path === "/news");
  if (newsRoute && archiveNav) {
    newsRoute.bodyHtml = `${newsRoute.bodyHtml || ""}\n${archiveNav}`;
    console.log(`[prerender-seo] /news archive nav: ${blogRoutes.length} article links`);
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
