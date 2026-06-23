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
const BASE_URL = "https://www.musicdibs.com";
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
const ROUTES = [

  // ── REGISTRO / IP PROTECTION ────────────────────────────────────────────────
  {
    path: "/registro-obras-musicales",
    locale: "es",
    title: "Registro de Obras Musicales en Blockchain | Musicdibs",
    description: "Registra tus canciones con certificación blockchain en minutos. Prueba legal de autoría válida en España y +175 países. Desde €6,90/mes.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Registro de Obras Musicales en Blockchain",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Certificación blockchain de obras musicales con validez legal internacional según Convenio de Berna y eIDAS.",
      areaServed: "Worldwide",
      serviceType: "Intellectual Property Registration",
    },
  },
  {
    path: "/derechos-autor-musica",
    locale: "es",
    title: "Derechos de Autor en Música: Guía Completa 2026 | Musicdibs",
    description: "Cómo proteger los derechos de autor de tu música paso a paso. Registro tradicional vs blockchain, costes, validez legal y plazos en 2026.",
  },
  {
    path: "/registro-musical",
    locale: "es",
    title: "Registro Musical Online con Blockchain | Musicdibs",
    description: "Registra tu música online con tecnología blockchain. Certificado digital inmutable, timestamp criptográfico y validez legal en más de 175 países. Rápido, asequible y sin burocracia.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Registro Musical Online",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Registro de obras musicales con certificado blockchain y validez legal internacional.",
      serviceType: "Music Copyright Registration",
    },
  },
  {
    path: "/register-a-song",
    locale: "en",
    title: "Register a Song Online: Blockchain Copyright in Minutes | Musicdibs",
    description: "Register a song online with blockchain-certified proof of authorship. Legally valid in 175+ countries. From €6.90/month, instant certificate, no paperwork.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Register a Song Online",
      description: "Step-by-step guide to register a song with blockchain certification on Musicdibs.",
      step: [
        { "@type": "HowToStep", text: "Upload your audio file or music project to Musicdibs." },
        { "@type": "HowToStep", text: "Your file is hashed and timestamped on the blockchain." },
        { "@type": "HowToStep", text: "Download your legally-valid certificate of authorship." },
      ],
    },
  },
  {
    path: "/copyright-a-song",
    locale: "en",
    title: "How to Copyright a Song in 2026: Blockchain vs USCO | Musicdibs",
    description: "Step-by-step guide to copyright a song in 2026. Compare US Copyright Office vs blockchain timestamping: cost, speed, global validity and legal weight.",
  },

  // ── DISTRIBUCIÓN ────────────────────────────────────────────────────────────
  {
    path: "/distribution",
    locale: "en",
    title: "Music Distribution to 220+ Platforms — Keep 95% Royalties | Musicdibs",
    description: "Distribute your music to Spotify, Apple Music, TikTok and 220+ platforms. Keep 95% of royalties. Live in 24–48h. No lock-in. YouTube Content ID available. Real-time analytics.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Music Distribution",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Global music distribution to 220+ streaming platforms with 95% royalty retention.",
      serviceType: "Music Distribution",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
        description: "Monthly plan including distribution, registration and AI tools",
      },
    },
  },
  {
    path: "/promocion-musical",
    locale: "es",
    title: "Promoción Musical con IA: Portadas, Vídeos y Redes Sociales | Musicdibs",
    description: "Genera portadas, posts, flyers y vídeos para redes sociales con IA. Promociona tu música en TikTok (245k) e Instagram (100k) de Musicdibs. Todo integrado.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Promoción Musical con IA",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Generación de contenido promocional musical con inteligencia artificial: portadas, vídeos, posts y flyers.",
      serviceType: "Music Marketing",
    },
  },

  // ── AI STUDIO ───────────────────────────────────────────────────────────────
  {
    path: "/ia-music-studio",
    locale: "es",
    title: "AI Music Studio: Crea Canciones Completas con IA | Musicdibs",
    description: "Genera canciones profesionales con IA desde una descripción o tu propia voz. Instrumentación, arreglos, mezcla y masterización automática. Exporta listo para streaming.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs AI Music Studio",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      description: "Herramienta de generación musical con IA: crea canciones completas a partir de texto o voz.",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      },
    },
  },
  {
    path: "/ai-studio",
    locale: "es",
    title: "AI Studio: Herramientas de IA para Músicos y Creadores | Musicdibs",
    description: "Suite completa de herramientas de IA para música: crea canciones, genera letras, masteriza tracks, diseña portadas y produce vídeos. Todo en un solo lugar.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs AI Studio",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      description: "Suite de inteligencia artificial para la creación, producción y promoción musical.",
    },
  },
  {
    path: "/ai-studio/create",
    locale: "es",
    title: "Genera Canciones Completas con IA desde Cero | Musicdibs AI Studio",
    description: "Crea canciones originales con IA: define el género, estilo y mood. La IA genera la melodía, instrumentación, arreglos y mezcla completa en minutos.",
  },
  {
    path: "/ai-studio/vocal",
    locale: "es",
    title: "Sube tu Voz y Genera una Canción Profesional | Musicdibs AI Studio",
    description: "Sube tu voz a capella y nuestra IA construye toda la producción: afinación, instrumentación y mezcla profesional. Tú pones la semilla, la IA hace la magia.",
  },
  {
    path: "/ai-studio/edit",
    locale: "es",
    title: "Edita y Mejora tu Música con IA | Musicdibs AI Studio",
    description: "Edita, remasteriza y perfecciona tus producciones musicales con herramientas de IA. Mejora stems, ajusta mezclas y exporta con calidad profesional.",
  },
  {
    path: "/ai-studio/inspire",
    locale: "es",
    title: "Inspiración Musical con IA: Ideas y Estructuras de Canciones | Musicdibs",
    description: "Supera el bloqueo creativo con IA. Genera ideas de canciones, progresiones de acordes, estructuras y letras para tu próximo hit en segundos.",
  },
  {
    path: "/ai-studio/enhance",
    locale: "es",
    title: "AI Mastering: Masteriza tu Música con IA para Streaming | Musicdibs",
    description: "Masterización automática con IA lista para Spotify, Apple Music y todas las plataformas. Mejora volumen, claridad y potencia de tus canciones en segundos.",
  },
  {
    path: "/ai-studio/video",
    locale: "es",
    title: "Genera Vídeos Musicales con IA en Minutos | Musicdibs AI Studio",
    description: "Crea vídeos cortos y clips musicales con IA para TikTok, Instagram Reels y YouTube Shorts. Animaciones sincronizadas con tu música. Sin software de edición.",
  },
  {
    path: "/ai-studio/covers",
    locale: "es",
    title: "Portadas de Álbumes con IA: Diseños Profesionales al Instante | Musicdibs",
    description: "Genera portadas profesionales para tus lanzamientos con IA. Estilos personalizados, listos para Spotify, Apple Music y todas las plataformas en segundos.",
  },
  {
    path: "/ai-studio/promo-material",
    locale: "es",
    title: "Material Promocional Musical con IA: Posts, Flyers y Stories | Musicdibs",
    description: "Genera posts, stories, flyers y material promocional para tu música con IA. Formatos listos para Instagram, TikTok y todas las redes sociales.",
  },

  // ── GENERADORES SEO LANDING PAGES ──────────────────────────────────────────
  {
    path: "/ai-song-generator",
    locale: "en",
    title: "AI Song Generator: Create & Distribute Music with AI | Musicdibs",
    description: "Create complete songs with AI from a description or your own voice. Professional instrumentation, mixing and mastering. Register and distribute to 220+ platforms from one place.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs AI Song Generator",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      description: "AI-powered music generation tool: create complete songs from text prompts or voice recordings.",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      },
    },
  },
  {
    path: "/generador-canciones-ia",
    locale: "es",
    title: "Generador de Canciones con IA: Crea, Registra y Distribuye | Musicdibs",
    description: "Genera canciones completas con IA desde una descripción o tu voz. Instrumentación profesional, mezcla y masterización automática. Registra y distribuye en 220+ plataformas.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs Generador de Canciones con IA",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      description: "Generador de música con inteligencia artificial: crea canciones completas desde texto o voz.",
    },
  },

  // ── INFO / SOPORTE ──────────────────────────────────────────────────────────
  {
    path: "/faq",
    locale: "es",
    title: "Preguntas Frecuentes sobre Registro, Distribución e IA | Musicdibs",
    description: "Respuestas a las dudas más comunes sobre registro blockchain de música, distribución a Spotify, créditos y AI Studio en Musicdibs.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Cuánto tiempo tarda el registro blockchain?",
          acceptedAnswer: { "@type": "Answer", text: "El registro en blockchain es instantáneo, menos de 15 segundos. Recibes el certificado digital inmediatamente." },
        },
        {
          "@type": "Question",
          name: "¿Tiene validez legal el certificado de Musicdibs?",
          acceptedAnswer: { "@type": "Answer", text: "Sí. El certificado tiene validez legal en más de 175 países bajo el Convenio de Berna, el Tratado OMPI y el reglamento eIDAS en la UE." },
        },
        {
          "@type": "Question",
          name: "¿Puedo distribuir mi música en Spotify con Musicdibs?",
          acceptedAnswer: { "@type": "Answer", text: "Sí. Musicdibs distribuye a 220+ plataformas incluyendo Spotify, Apple Music, TikTok y YouTube Music, conservando el 95% de tus royalties." },
        },
      ],
    },
  },
  {
    path: "/legal-validity",
    locale: "es",
    title: "Validez Legal del Registro Blockchain de Música | Musicdibs",
    description: "Marco legal del registro de obras musicales en blockchain: eIDAS, Convenio de Berna, OMPI y admisibilidad como prueba en procedimientos judiciales.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Validez Legal del Registro Blockchain de Música",
      author: { "@type": "Organization", name: "Musicdibs" },
      publisher: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Análisis del marco legal que respalda el registro blockchain como prueba de autoría musical.",
    },
  },
  {
    path: "/marketing",
    locale: "es",
    title: "Marketing Musical Profesional: Portadas, Vídeos y Promoción | Musicdibs",
    description: "Servicios profesionales de marketing musical: diseño de portadas, vídeos promocionales y gestión de redes sociales. Impulsa tu carrera artística con Musicdibs.",
  },
  {
    path: "/partners",
    locale: "es",
    title: "Partners y Colaboraciones | Musicdibs",
    description: "Programa de partners de Musicdibs: sellos, academias de música, estudios y profesionales del sector. Soluciones white-label y licencias personalizadas.",
  },
  {
    path: "/contact",
    locale: "es",
    title: "Contacto | Musicdibs",
    description: "Contacta con el equipo de Musicdibs para soporte, consultas de distribución, presupuestos enterprise o colaboraciones. Respuesta en menos de 24h.",
  },
  {
    path: "/verify",
    locale: "es",
    title: "Verificar Certificado Blockchain de Obra Musical | Musicdibs",
    description: "Verifica la autenticidad de cualquier certificado Musicdibs. Comprueba el hash blockchain, el timestamp y la identidad del autor registrado.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Verificador de Certificados Musicdibs",
      description: "Herramienta para verificar la autenticidad de certificados blockchain de obras musicales.",
      applicationCategory: "UtilityApplication",
    },
  },
];

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

  return html;
};

// ── Write one route ───────────────────────────────────────────────────────────

const writeRoute = async (template, route) => {
  const html = buildHtmlForRoute(template, route);
  const dir = path.join(DIST, route.path.replace(/^\//, ""));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
  console.log(`  ✓ ${route.path}/index.html`);
};

// ── Entry point ───────────────────────────────────────────────────────────────

const main = async () => {
  const indexPath = path.join(DIST, "index.html");
  let template;
  try {
    template = await fs.readFile(indexPath, "utf8");
  } catch {
    console.warn(`[prerender-seo] dist/index.html not found — skipping (run vite build first)`);
    return;
  }
  console.log(`[prerender-seo] generating static SEO HTML for ${ROUTES.length} routes:`);
  await Promise.all(ROUTES.map((r) => writeRoute(template, r)));
  console.log(`[prerender-seo] done ✓`);
};

main().catch((err) => {
  console.error("[prerender-seo] FAILED:", err);
  process.exit(1);
});
