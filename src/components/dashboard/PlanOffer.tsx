import { Link } from 'react-router-dom';
import { Loader2, Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';
import { useState } from 'react';

type Lang = 'es' | 'en' | 'pt';

const COPY: Record<Lang, {
  starter: string; starterDesc: string; starterPrice: string; starterCta: string;
  pro: string; proDesc: string; proPrice: string; proCta: string; recommended: string; more: string;
}> = {
  es: {
    starter: 'Starter', starterDesc: '8 créditos cada mes', starterPrice: '6,90 €/mes', starterCta: 'Empezar con Starter',
    pro: 'Artist Pro', proDesc: '100 créditos al año + distribución', proPrice: '59,90 €/año', proCta: 'Conseguir Artist Pro',
    recommended: 'Recomendado', more: 'Ver todos los planes',
  },
  en: {
    starter: 'Starter', starterDesc: '8 credits every month', starterPrice: '€6.90/month', starterCta: 'Start with Starter',
    pro: 'Artist Pro', proDesc: '100 credits per year + distribution', proPrice: '€59.90/year', proCta: 'Get Artist Pro',
    recommended: 'Recommended', more: 'See all plans',
  },
  pt: {
    starter: 'Starter', starterDesc: '8 créditos por mês', starterPrice: '€6,90/mês', starterCta: 'Começar com Starter',
    pro: 'Artist Pro', proDesc: '100 créditos por ano + distribuição', proPrice: '€59,90/ano', proCta: 'Obter Artist Pro',
    recommended: 'Recomendado', more: 'Ver todos os planos',
  },
};

function resolveLang(lng: string | undefined): Lang {
  if (!lng) return 'es';
  if (lng.startsWith('pt')) return 'pt';
  if (lng.startsWith('en')) return 'en';
  return 'es';
}

/** Tarjeta compacta con compra directa de Starter (mensual) y Artist Pro (anual 100). */
export function PlanOffer({ showMoreLink = true }: { showMoreLink?: boolean }) {
  const { i18n } = useTranslation();
  const c = COPY[resolveLang(i18n.resolvedLanguage || i18n.language)];
  const { startCreditCheckout } = useCheckout();
  const [pending, setPending] = useState<'monthly' | 'annual_100' | null>(null);

  const buy = async (planId: 'monthly' | 'annual_100') => {
    setPending(planId);
    await startCreditCheckout({ planId });
    setPending(null);
  };

  return (
    <div className="w-full space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative rounded-lg border-2 border-primary bg-primary/5 p-4 text-left sm:order-2">
          <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            <Sparkles className="h-3 w-3" /> {c.recommended}
          </span>
          <p className="font-semibold">{c.pro}</p>
          <p className="text-xs text-muted-foreground">{c.proDesc}</p>
          <p className="mt-2 text-lg font-bold">{c.proPrice}</p>
          <Button className="mt-3 w-full" size="sm" disabled={pending !== null} onClick={() => buy('annual_100')}>
            {pending === 'annual_100' ? <Loader2 className="h-4 w-4 animate-spin" /> : c.proCta}
          </Button>
        </div>
        <div className="rounded-lg border border-border p-4 text-left sm:order-1">
          <p className="font-semibold">{c.starter}</p>
          <p className="text-xs text-muted-foreground">{c.starterDesc}</p>
          <p className="mt-2 text-lg font-bold">{c.starterPrice}</p>
          <Button className="mt-3 w-full" size="sm" variant="outline" disabled={pending !== null} onClick={() => buy('monthly')}>
            {pending === 'monthly' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1" />{c.starterCta}</>}
          </Button>
        </div>
      </div>
      {showMoreLink && (
        <Link to="/dashboard/credits" className="block text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
          {c.more}
        </Link>
      )}
    </div>
  );
}
