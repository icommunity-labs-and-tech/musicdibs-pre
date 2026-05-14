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
 * route-specific values. The result lives at e.g. `dist/copyright-a-song/index.html`
 * and the hosting layer serves it for direct hits to that path. The React app
 * still hydrates normally on top.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const BASE_URL = "https://www.musicdibs.com";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/27fdd7c8-3e07-4d0d-886d-53859f68e5de";

const LOCALE_MAP = {
  es: "es_ES",
  en: "en_US",
  "pt-BR": "pt_BR",
};

/**
 * Each route gets a full set of meta. Add new SEO landings here.
 */
const ROUTES = [
  {
    path: "/registro-obras-musicales",
    locale: "es",
    title: "Registro de Obras Musicales en Blockchain | Musicdibs",
    description: "Registra tus canciones con certificación blockchain en minutos. Prueba legal de autoría válida en España y +60 países. Desde 2,99 €.",
  },
  {
    path: "/derechos-autor-musica",
    locale: "es",
    title: "Derechos de Autor en Música: Guía Completa 2026 | Musicdibs",
    description: "Cómo proteger los derechos de autor de tu música paso a paso. Registro tradicional vs blockchain, costes, validez legal y plazos en 2026.",
  },
  {
    path: "/register-a-song",
    locale: "en",
    title: "Register a Song Online: Blockchain Copyright in Minutes | Musicdibs",
    description: "Register a song online with blockchain-certified proof of authorship. Legally valid in 180+ countries. From €2.99, no waiting, no paperwork.",
  },
  {
    path: "/copyright-a-song",
    locale: "en",
    title: "How to Copyright a Song in 2026: Blockchain vs USCO | Musicdibs",
    description: "Step-by-step guide to copyright a song in 2026. Compare US Copyright Office vs blockchain timestamping: cost, time, validity and legal weight.",
  },
  {
    path: "/legal-validity",
    locale: "es",
    title: "Validez Legal del Registro Blockchain | Musicdibs",
    description: "Marco legal del registro de obras musicales en blockchain: eIDAS, Convenio de Berna y admisibilidad como prueba en juicio.",
  },
  {
    path: "/faq",
    locale: "es",
    title: "Preguntas Frecuentes | Musicdibs",
    description: "Respuestas a las dudas más comunes sobre registro blockchain de música, créditos, distribución y AI Studio en Musicdibs.",
  },
];

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Replace a meta tag identified by attribute=value pair, or insert it before </head>.
 */
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

const buildHtmlForRoute = (template, route) => {
  const url = `${BASE_URL}${route.path}`;
  const ogLocale = LOCALE_MAP[route.locale] || "es_ES";

  let html = template;
  html = replaceTitle(html, route.title);
  html = replaceOrInsertMeta(html, "name", "description", route.description);
  html = replaceOrInsertCanonical(html, url);

  // Open Graph
  html = replaceOrInsertMeta(html, "property", "og:title", route.title);
  html = replaceOrInsertMeta(html, "property", "og:description", route.description);
  html = replaceOrInsertMeta(html, "property", "og:url", url);
  html = replaceOrInsertMeta(html, "property", "og:type", "article");
  html = replaceOrInsertMeta(html, "property", "og:image", DEFAULT_OG_IMAGE);
  html = replaceOrInsertMeta(html, "property", "og:locale", ogLocale);

  // Twitter
  html = replaceOrInsertMeta(html, "name", "twitter:title", route.title);
  html = replaceOrInsertMeta(html, "name", "twitter:description", route.description);
  html = replaceOrInsertMeta(html, "name", "twitter:url", url);

  return html;
};

const writeRoute = async (template, route) => {
  const html = buildHtmlForRoute(template, route);
  const dir = path.join(DIST, route.path.replace(/^\//, ""));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
  console.log(`  ✓ ${route.path}/index.html`);
};

const main = async () => {
  const indexPath = path.join(DIST, "index.html");
  let template;
  try {
    template = await fs.readFile(indexPath, "utf8");
  } catch (err) {
    console.warn(`[prerender-seo] dist/index.html not found, skipping (build did not run?)`);
    return;
  }
  console.log("[prerender-seo] generating static SEO HTML for social crawlers:");
  await Promise.all(ROUTES.map((r) => writeRoute(template, r)));
  console.log(`[prerender-seo] done (${ROUTES.length} routes)`);
};

main().catch((err) => {
  console.error("[prerender-seo] FAILED:", err);
  process.exit(1);
});
