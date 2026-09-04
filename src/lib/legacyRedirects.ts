/**
 * Legacy URL map for the old WordPress/WooCommerce/Zendesk site.
 *
 * Search Console reported these paths as 404s. Redirecting the ones with a clear
 * current equivalent recovers their link value; every other legacy path is left
 * alone on purpose so Google drops it from the index instead of indexing a
 * generic page.
 *
 * `public/_redirects` carries the same map for hosting-level 301s; this module is
 * the in-app fallback so the SPA never renders a 404 for these URLs.
 */

type Rule = { prefix: string; exact?: boolean; to: string };

const RULES: Rule[] = [
  { prefix: "/support", exact: true, to: "/faq" },
  { prefix: "/licenses", exact: true, to: "/terms" },
  { prefix: "/hc", to: "/faq" },
  { prefix: "/finalizar-compra", to: "/pricing" },
  { prefix: "/en/order-received", to: "/" },
  { prefix: "/carrito", to: "/pricing" },
  { prefix: "/checkout", to: "/pricing" },
  { prefix: "/tienda", to: "/pricing" },
  { prefix: "/producto", to: "/pricing" },
  { prefix: "/categoria-producto", to: "/pricing" },
  { prefix: "/mi-cuenta", to: "/dashboard" },
  { prefix: "/wp-content", to: "/distribution" },
  { prefix: "/blog", to: "/news" },
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
