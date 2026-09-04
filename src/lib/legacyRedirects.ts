/**
 * Legacy URL map for the old WordPress/WooCommerce/Zendesk site.
 *
 * Search Console reported these paths as 404 / Soft 404 / "alternative canonical".
 * Every legacy family that has a reasonable current equivalent is mapped here;
 * the generic language-prefixed article URLs fall back to the news index so the
 * link value is not lost.
 *
 * `public/_redirects` mirrors the same map for hosting layers that honour it;
 * this module is the in-app fallback so the SPA never renders a 404 for them.
 */

type Rule = { prefix: string; exact?: boolean; to: string };

const PRICING = "/#pricing-section";

// Order matters: the first matching rule wins, so specific paths come first.
const RULES: Rule[] = [
  // Old Spanish WordPress landing pages
  { prefix: "/registro-canciones-y-musica", to: "/registro-obras-musicales" },
  { prefix: "/registro-legal-canciones-musica", to: "/registro-obras-musicales" },
  { prefix: "/registro-propiedad-intelectual-musica", to: "/registro-obras-musicales" },
  { prefix: "/registra-musica-copyright", to: "/registro-obras-musicales" },
  { prefix: "/proteger-musica-canciones", to: "/registro-obras-musicales" },
  { prefix: "/evitar-plagio-musical-canciones", to: "/registro-obras-musicales" },
  { prefix: "/alternativa-registro-musica-tradicionales", to: "/registro-obras-musicales" },
  { prefix: "/promocion", to: "/marketing" },
  { prefix: "/certification", exact: true, to: "/legal-validity" },
  { prefix: "/verificar-id", to: "/verify" },
  { prefix: "/faq-items", to: "/faq" },
  { prefix: "/privacy-policy", to: "/privacy" },
  { prefix: "/politica-de-privacidad", to: "/privacy" },
  { prefix: "/terms-and-conditions", to: "/terms" },
  { prefix: "/purchase-terms-and-condition", to: "/terms" },
  { prefix: "/service-level-agreement", to: "/sla" },
  { prefix: "/tech-and-legal", to: "/legal-validity" },
  { prefix: "/legal-and-technical-solidity", to: "/legal-validity" },
  { prefix: "/musicdibs-vs-traditional-records-legal-validity", to: "/legal-validity" },
  { prefix: "/musicdibs-credits", to: PRICING },
  { prefix: "/musicdibs-awards", to: "/news" },
  { prefix: "/support", to: "/faq" },
  { prefix: "/licenses", exact: true, to: "/terms" },
  { prefix: "/hc", to: "/faq" },
  { prefix: "/register", to: "/registro-gratis" },
  { prefix: "/inactive-user", to: "/login" },

  // Old English landings under /en (the live /en/news routes are matched by the
  // router itself, so they never reach this fallback).
  { prefix: "/en/song-and-music-registration", to: "/register-a-song" },
  { prefix: "/en/legal-registration-songs-copyrights", to: "/register-a-song" },
  { prefix: "/en/legal-musical-registration-songs-copyrights", to: "/register-a-song" },
  { prefix: "/en/distribution-music", to: "/distribution" },
  { prefix: "/en/distribution", to: "/distribution" },
  { prefix: "/en/faq-items", to: "/faq" },
  { prefix: "/en/faq", to: "/faq" },
  { prefix: "/en/contact", to: "/contact" },
  { prefix: "/en/partners", to: "/partners" },
  { prefix: "/en/marketing", to: "/marketing" },
  { prefix: "/en/register", to: "/registro-gratis" },
  { prefix: "/en/ai-song-generator", to: "/ai-song-generator" },
  { prefix: "/en/generador-canciones-ia", to: "/ai-song-generator" },
  { prefix: "/en/order-received", to: "/" },

  // Old locale folders from the WordPress multilingual plugin
  { prefix: "/eng/faq", to: "/faq" },
  { prefix: "/eng/support", to: "/faq" },
  { prefix: "/eng/distribution", to: "/distribution" },
  { prefix: "/eng/privacy-policy", to: "/privacy" },
  { prefix: "/eng/terms-and-conditions", to: "/terms" },
  { prefix: "/eng/tech-and-legal", to: "/legal-validity" },
  { prefix: "/esp/faq", to: "/faq" },
  { prefix: "/esp/support", to: "/faq" },
  { prefix: "/esp/distribution", to: "/distribution" },
  { prefix: "/esp/terms-and-conditions", to: "/terms" },
  { prefix: "/esp/tech-and-legal", to: "/legal-validity" },
  { prefix: "/pt-br", to: "/pt/features" },

  // WooCommerce shop funnel
  { prefix: "/finalizar-compra", to: PRICING },
  { prefix: "/carrito", to: PRICING },
  { prefix: "/checkout", to: PRICING },
  { prefix: "/tienda", to: PRICING },
  { prefix: "/producto", to: PRICING },
  { prefix: "/categoria-producto", to: PRICING },
  { prefix: "/mi-cuenta", to: "/dashboard" },
  { prefix: "/wp-content/uploads", to: "/distribution" },
  { prefix: "/wp-content", to: "/" },

  // Blog
  { prefix: "/blog", to: "/news" },

  // Catch-all for the remaining legacy language folders (old article slugs).
  // Valid current routes under /en and /pt are matched by the router first.
  { prefix: "/en", to: "/news" },
  { prefix: "/eng", to: "/" },
  { prefix: "/esp", to: "/" },
  { prefix: "/fr", to: "/" },
  { prefix: "/pt", to: "/pt/features" },
];

/** Returns the target path for a legacy URL, or null when the path is not legacy. */
export function resolveLegacyRedirect(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  for (const rule of RULES) {
    if (clean === rule.prefix) return rule.to;
    if (!rule.exact && clean.startsWith(`${rule.prefix}/`)) return rule.to;
  }
  return null;
}
