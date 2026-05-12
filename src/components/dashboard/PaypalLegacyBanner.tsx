import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function PaypalLegacyBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('stripe_customer_id, subscription_plan')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const plan = (data as any).subscription_plan;
      const stripeId = (data as any).stripe_customer_id;
      setShow(!stripeId && (plan === 'Annual' || plan === 'Monthly'));
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!show) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3 mb-4">
      <span className="text-orange-500 text-xl" aria-hidden>⚠️</span>
      <div className="flex-1">
        <p className="font-semibold text-orange-800">
          {t('dashboard.paypalBanner.title')}
        </p>
        <p className="text-sm text-orange-700 mt-1">
          {t('dashboard.paypalBanner.body')}
        </p>
        <a
          href="https://musicdibs.com/#pricing-section"
          className="inline-block mt-2 text-sm font-medium text-orange-800 underline hover:text-orange-900"
        >
          {t('dashboard.paypalBanner.cta')}
        </a>
      </div>
    </div>
  );
}
