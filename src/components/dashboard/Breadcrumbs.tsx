import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';
import { useMemo } from 'react';

// Map of full sub-path (relative to /dashboard) → i18n key or literal label.
// Only listed sub-paths render a label; unknown segments fall back to the
// raw slug (title-cased) so dynamic ids still show something readable.
type Entry = { key?: string; label?: string; hidden?: boolean };

const MAP: Record<string, Entry> = {
  launch: { key: 'dashboard.sidebar.launchHit' },
  register: { key: 'dashboard.sidebar.registerWork' },
  verify: { key: 'dashboard.sidebar.verifyRegistration' },
  'verify-identity': { key: 'dashboard.sidebar.verifyIdentity' },
  promote: { key: 'dashboard.sidebar.promotion' },
  promotion: { key: 'dashboard.sidebar.promotion' },
  'premium-promotion': { key: 'dashboard.sidebar.premiumPromotion' },
  press: { key: 'dashboard.sidebar.promoMaterial' },
  credits: { key: 'dashboard.sidebar.plansCredits' },
  profile: { key: 'dashboard.sidebar.profile' },
  billing: { key: 'dashboard.sidebar.billing' },
  support: { key: 'dashboard.sidebar.support' },
  'youtube-services': { label: 'YouTube Services' },
  'artist-profiles': { key: 'dashboard.sidebar.artistProfiles' },
  'media-library': { key: 'dashboard.sidebar.mediaLibrary' },
  certificate: { label: 'Certificate' },

  admin: { key: 'dashboard.sidebar.admin' },
  'admin/users': { key: 'dashboard.sidebar.users' },
  'admin/credits': { key: 'dashboard.sidebar.credits' },
  'admin/works': { key: 'dashboard.sidebar.works' },
  'admin/metrics': { key: 'dashboard.sidebar.metrics' },
  'admin/campaigns': { key: 'dashboard.sidebar.campaigns' },
  'admin/system': { key: 'dashboard.sidebar.system' },
  'admin/premium-promos': { key: 'dashboard.sidebar.premiumPromos' },
  'admin/youtube-services': { label: 'YouTube Services' },
  'admin/feature-costs': { key: 'dashboard.sidebar.featureCosts' },
  'admin/api-costs': { key: 'dashboard.sidebar.apiProfitability' },
  'admin/product-metrics': { key: 'dashboard.sidebar.productMetrics' },
  'admin/churn': { key: 'dashboard.sidebar.userChurn' },
  'admin/alerts': { label: 'Alerts' },
  'admin/ai-models': { label: 'AI Models' },
  'admin/credit-coupons': { label: 'Credit Coupons' },
  'admin/seo-dashboard': { label: 'SEO Dashboard' },
  'admin/managers': { label: 'Managers' },
  'admin/blog': { label: 'Blog' },
  'admin/ab-tests': { label: 'A/B Tests' },

  manager: { key: 'dashboard.sidebar.managerPanel' },
  'manager/artists': { key: 'dashboard.sidebar.myArtists' },
  'manager/artists/new': { label: 'Nuevo artista' },
  'manager/works': { key: 'dashboard.sidebar.registeredWorks' },
  'manager/register': { key: 'dashboard.sidebar.registerWorkNav' },
};

function titleCase(slug: string) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  const crumbs = useMemo(() => {
    if (!pathname.startsWith('/dashboard')) return [];
    const rest = pathname.replace(/^\/dashboard\/?/, '').replace(/\/$/, '');
    if (!rest) return []; // hide on /dashboard root
    const parts = rest.split('/');
    const out: Array<{ href: string; label: string; isLast: boolean }> = [];
    for (let i = 0; i < parts.length; i++) {
      const subPath = parts.slice(0, i + 1).join('/');
      const entry = MAP[subPath];
      let label: string | null = null;
      if (entry?.key) label = t(entry.key, { defaultValue: entry.label ?? titleCase(parts[i]) });
      else if (entry?.label) label = entry.label;
      else {
        // dynamic segment: skip if it looks like a UUID/id and prev segment already has a crumb
        const isDynamic = /^[0-9a-f-]{8,}$/i.test(parts[i]);
        if (isDynamic) continue;
        label = titleCase(parts[i]);
      }
      out.push({
        href: `/dashboard/${subPath}`,
        label,
        isLast: i === parts.length - 1,
      });
    }
    return out;
  }, [pathname, i18n.language, t]);

  if (crumbs.length === 0) return null;

  const homeLabel = t('dashboard.sidebar.controlPanel', { defaultValue: 'Panel' });

  return (
    <nav aria-label="Breadcrumb" className="border-b border-border/40 bg-background/60 px-4 py-2">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
        <li className="flex items-center gap-1.5">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label={homeLabel}
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{homeLabel}</span>
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
            {c.isLast ? (
              <span className="text-foreground font-medium" aria-current="page">
                {c.label}
              </span>
            ) : (
              <Link to={c.href} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
