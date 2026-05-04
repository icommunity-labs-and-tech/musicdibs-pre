import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { CreditUsageChart } from '@/components/dashboard/CreditUsageChart';
import { CreditHistory } from '@/components/dashboard/CreditHistory';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreditsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true);
    }
  }, [searchParams]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    searchParams.delete('welcome');
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="max-w-4xl space-y-6">
      {showWelcome && (
        <Alert className="border-primary/50 bg-primary/5 relative">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle>{t('dashboard.creditsPage.welcomeTitle')}</AlertTitle>
          <AlertDescription>{t('dashboard.creditsPage.welcomeMessage')}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={dismissWelcome}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}
      <h2 className="text-xl font-bold">{t('dashboard.creditsPage.title')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('dashboard.creditsPage.description')}
      </p>
      <CreditStore />
      <CreditUsageChart />
      <CreditHistory />
    </div>
  );
}
