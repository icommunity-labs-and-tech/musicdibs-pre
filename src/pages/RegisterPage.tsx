import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RegistrationWizard } from '@/components/dashboard/register/RegistrationWizard';
import { BlockchainHistory } from '@/components/dashboard/BlockchainHistory';
import { Separator } from '@/components/ui/separator';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { PricingPopup } from '@/components/dashboard/PricingPopup';
import { useAuth } from '@/hooks/useAuth';
import { useKycGuard } from '@/hooks/useKycGuard';
import type { DashboardSummary } from '@/types/dashboard';
import { Loader2, Coins, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const { isManager } = useAuth();
  const { isVerified, kycLoading } = useKycGuard();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

  if (isManager) return <Navigate to="/dashboard/manager/register" replace />;

  // While checking KYC status, show a loader
  if (kycLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // If not verified, redirect to verify-identity
  if (!isVerified) {
    return <Navigate to="/dashboard/verify-identity" replace />;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Registrar obra</h2>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setPricingOpen(true)}>
          <Coins className="h-4 w-4" />
          Ver precios
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <RegistrationWizard summary={summary} />
        <div className="hidden lg:block space-y-4">
          <AccountSummary onSummaryLoaded={setSummary} />
          <div
            role="alert"
            className="w-full rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 px-4 py-3 flex gap-3 items-start"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-snug">
                ⚠️ NO salgas de esta pantalla durante el registro
              </p>
              <p className="text-xs sm:text-[13px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Si sales antes de que finalice, podrías perder tus créditos.
              </p>
            </div>
          </div>
        </div>
      </div>
      <PricingPopup open={pricingOpen} onOpenChange={setPricingOpen} />

      <Separator className="my-8" />

      <section aria-labelledby="blockchain-history-heading">
        <BlockchainHistory />
      </section>
    </div>
  );
}
