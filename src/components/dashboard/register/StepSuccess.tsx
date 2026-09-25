import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PlanOffer } from '@/components/dashboard/PlanOffer';
import type { WizardData } from './types';

interface StepSuccessProps {
  data: WizardData;
  registrationId: string;
  fileHash?: string;
  onRegisterAnother: () => void;
}

export function StepSuccess({ data, registrationId, fileHash, onRegisterAnother }: StepSuccessProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVersion = data.flow === 'version';
  const dateLang = i18n.resolvedLanguage || 'es';
  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('available_credits, subscription_plan')
      .eq('user_id', user.id)
      .single()
      .then(({ data: profile }) => {
        if (!cancelled && profile) {
          setCredits(profile.available_credits ?? 0);
          setSubscriptionPlan(profile.subscription_plan ?? 'Free');
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  // FIX (bug real: usuarios con Artist Pro u otro plan anual/mensual activo
  // veian el boton de "comprar Artist Pro" y podian terminar con una
  // segunda suscripcion duplicada via el Payment Link directo, que
  // bypasea la logica de upgrade/cambio de plan de create-credit-checkout).
  // Mismo guard que ya usa CreditStore.tsx (isAnnualActive): solo mostrar
  // la promo si el usuario esta en plan Free, sin ningun plan de pago activo.
  const hasActivePaidPlan = subscriptionPlan !== null && subscriptionPlan !== 'Free';

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">{t('wizard.success.title')}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{t('wizard.success.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs text-left w-full max-w-sm bg-card rounded-lg border border-border/40 p-4">
        {isVersion && data.parentWorkTitle && (
          <div>
            <span className="text-muted-foreground">{t('wizard.success.originalWork')}</span>{' '}
            <span className="font-medium">{data.parentWorkTitle}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{t('wizard.success.regId')}</span>{' '}
          <span className="font-mono">{registrationId.slice(0, 12)}...</span>
        </div>
        {fileHash && (
          <div>
            <span className="text-muted-foreground">{t('wizard.success.fileHash')}</span>{' '}
            <span className="font-mono">{fileHash.slice(0, 16)}...</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{t('wizard.success.date')}</span>{' '}
          <span>{new Date().toLocaleDateString(dateLang)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => {
            const el = document.getElementById('blockchain-history-heading');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              navigate('/dashboard/register');
            }
          }}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          {t('wizard.success.viewReg')}
        </Button>
        <Button variant="hero" onClick={onRegisterAnother}>
          <Plus className="h-4 w-4 mr-1.5" />
          {isVersion ? t('wizard.success.registerAnotherVersion') : t('wizard.success.registerAnother')}
        </Button>
      </div>

      {user && credits !== null && credits < 5 && !hasActivePaidPlan && (
        <div className="w-full max-w-sm rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('wizard.success.lowCreditsTitle')}
          </p>
          <p className="text-xs text-muted-foreground">{t('wizard.success.lowCreditsText')}</p>
          <PlanOffer showMoreLink={false} />
        </div>
      )}
    </div>
  );
}
