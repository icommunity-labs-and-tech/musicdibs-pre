import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKycGuard } from '@/hooks/useKycGuard';
import { NotificationsProvider } from '@/hooks/useNotifications';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { NotificationToaster } from '@/components/dashboard/NotificationToaster';
import { CreditBadge } from '@/components/dashboard/CreditBadge';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import { CouponRedeemButton } from '@/components/dashboard/CouponRedeemButton';
import { PastDueBanner } from '@/components/dashboard/PastDueBanner';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { ReferralSourceModal } from '@/components/dashboard/ReferralSourceModal';
import { DashboardThemeToggle } from '@/components/dashboard/DashboardThemeToggle';
import { Breadcrumbs } from '@/components/dashboard/Breadcrumbs';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Search } from 'lucide-react';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { LanguageSelector } from '@/components/LanguageSelector';
import { InlineLanguageSwitcher } from '@/components/dashboard/InlineLanguageSwitcher';
import { useDashboardTheme } from '@/hooks/useDashboardTheme';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';


export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { guardRegister } = useKycGuard();
  const { theme, toggleTheme } = useDashboardTheme();
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  useUsageTracking(); // auto-tracks login_after_purchase on mount

  // Only show the full-page spinner (and unmount <Outlet/>) on the very
  // first auth check. Subsequent loading=true flips (e.g. session
  // re-validation when the tab regains focus) must NOT unmount the page —
  // doing so was wiping in-progress state like the "Registrar obra" wizard
  // (it would reset to its first step), which users reported as the page
  // "reiniciando" when selecting a file on mobile.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  useEffect(() => {
    if (!loading) setHasLoadedOnce(true);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const params = new URLSearchParams(window.location.search);
      const isPaymentSuccess = params.get('payment') === 'success';
      const sessionId = params.get('session_id');
      if (isPaymentSuccess && sessionId) {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}&payment_success=true`);
      } else {
        navigate('/login');
      }
    }
  }, [loading, user, navigate]);

  if (loading && !hasLoadedOnce) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!user && !loading) return null;

  return (
    <NotificationsProvider>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <SidebarProvider defaultOpen={readSidebarCookie()}>



        <div className="min-h-screen flex w-full">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-50 h-12 flex items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur-sm px-4">
              <div className="flex items-center">
                <SidebarTrigger className="mr-3" />
                <h1 className="text-sm font-semibold text-muted-foreground">{tr('dashboard.sidebar.controlPanel', 'Panel de control')}</h1>
              </div>
              <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                className="hidden md:inline-flex items-center gap-2 h-8 px-2 rounded-md border border-border/60 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
                aria-label={tr('dashboard.commandPalette.open', 'Abrir paleta de comandos')}
              >
                <Search className="h-3.5 w-3.5" />
                <span>{tr('dashboard.commandPalette.search', 'Buscar')}</span>
                <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
              </button>
              <DashboardThemeToggle theme={theme} onToggle={toggleTheme} />
              <CreditBadge />
              <NotificationBell />
              <CouponRedeemButton />
              <InlineLanguageSwitcher />
              <UserProfileDropdown />
              </div>
            </header>
            <PastDueBanner />
            <Breadcrumbs />
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <DashboardTour />
        <ReferralSourceModal />
        <NotificationToaster />
        <CommandPalette />
      </SidebarProvider>
    </NotificationsProvider>
  );
}
