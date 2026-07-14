import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { CreditUsageChart } from '@/components/dashboard/CreditUsageChart';
import { CreditHistory } from '@/components/dashboard/CreditHistory';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Ads conversion tracking — dispara una unica vez por session_id de Stripe
// tras un pago exitoso. Usa el importe real de la orden (no un valor fijo),
// consultando por stripe_checkout_session_id ya guardado por el webhook. Como el
// webhook puede tardar unos segundos en procesar el evento, reintenta brevemente
// antes de desistir.
function trackPurchaseConversion(sessionId: string) {
  const trackedKey = `ga_conversion_tracked_${sessionId}`;
  if (sessionStorage.getItem(trackedKey)) return; // ya trackeado (evita doble disparo en re-render/recarga)

  let attempts = 0;
  const maxAttempts = 6; // ~12s de reintentos (webhook suele tardar 1-3s)

  const tryFetchAndFire = async () => {
    attempts++;
    const { data: order } = await supabase
      .from('orders')
      .select('amount_gross, currency')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('order_status', 'paid')
      .maybeSingle();

    if (order) {
      window.gtag?.('event', 'conversion', {
        send_to: 'AW-18310773693/s8WsCM7qqM0cEL33oJtE',
        value: Number(order.amount_gross) || 0,
        currency: order.currency || 'EUR',
        transaction_id: sessionId,
      });
      sessionStorage.setItem(trackedKey, '1');
      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(tryFetchAndFire, 2000);
    } else {
      // Fallback: el webhook no proceso a tiempo. Disparamos igualmente para no
      // perder la conversion, sin importe especifico (Google Ads acepta value=0
      // pero es mejor evitarlo si es posible; se usa un valor generico minimo).
      window.gtag?.('event', 'conversion', {
        send_to: 'AW-18310773693/s8WsCM7qqM0cEL33oJtE',
        transaction_id: sessionId,
      });
      sessionStorage.setItem(trackedKey, '1');
    }
  };

  tryFetchAndFire();
}

export default function CreditsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        trackPurchaseConversion(sessionId);
      }
      // Limpiar los parametros de la URL para que no se reprocese al recargar
      searchParams.delete('payment');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
