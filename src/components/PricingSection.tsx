import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation, Trans } from "react-i18next";
import { getFooterLinks } from "@/i18nLinks";
import { Link, useNavigate } from "react-router-dom";
import { ComparisonTable } from "@/components/ComparisonTable";
import { useABTest, trackABClick } from "@/hooks/useABTest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Briefcase, ArrowRight, Check, X, Sparkles } from "lucide-react";

type AnnualPlanId = 'annual_100' | 'annual_200' | 'annual_300' | 'annual_500' | 'annual_1000';

type StripePlan = {
  planId: string;
  priceId: string;
  credits: number;
  mode: 'subscription' | 'payment';
  productType: 'annual' | 'monthly' | 'single' | 'topup';
  billingInterval: 'yearly' | 'monthly' | null;
  label: string;
  currency: string;
  unitAmount: number;
  amount: number;
  formattedPrice: string;
  pricePerCredit: number | null;
  formattedPricePerCredit: string | null;
  sortOrder: number;
};

type PricingCatalogResponse = {
  plans?: StripePlan[];
  error?: string;
};

const isAnnualPlanId = (planId: string): planId is AnnualPlanId => planId.startsWith('annual_');

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedAnnualPlanId, setSelectedAnnualPlanId] = useState<AnnualPlanId>('annual_100');
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage || i18n.language;
  const links = getFooterLinks(lang);

  useEffect(() => {
    let cancelled = false;
    setPricingLoading(true);

    supabase.functions.invoke<PricingCatalogResponse>('stripe-pricing-catalog', {
      body: { locale: lang },
    }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'No se pudieron cargar los precios de Stripe');
        setStripePlans([]);
        return;
      }
      setStripePlans(data?.plans ?? []);
    }).finally(() => {
      if (!cancelled) setPricingLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const annualOptions = useMemo(
    () => stripePlans.filter((plan): plan is StripePlan & { planId: AnnualPlanId } => isAnnualPlanId(plan.planId)).sort((a, b) => a.sortOrder - b.sortOrder),
    [stripePlans]
  );

  useEffect(() => {
    if (annualOptions.length > 0 && !annualOptions.some((option) => option.planId === selectedAnnualPlanId)) {
      setSelectedAnnualPlanId(annualOptions[0].planId);
    }
  }, [annualOptions, selectedAnnualPlanId]);

  const selectedAnnual = useMemo(
    () => annualOptions.find(o => o.planId === selectedAnnualPlanId) ?? annualOptions[0],
    [annualOptions, selectedAnnualPlanId]
  );

  const monthlyPlan = useMemo(() => stripePlans.find((plan) => plan.planId === 'monthly'), [stripePlans]);
  const individualPlan = useMemo(() => stripePlans.find((plan) => plan.planId === 'individual'), [stripePlans]);

  const handleCheckout = useCallback(async (planId: string) => {
    if (!user) {
      navigate('/login', { state: { returnTo: '/#pricing-section' } });
      return;
    }
    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-credit-checkout', {
        body: { planId },
      });
      if (error) throw error;
      if (data?.already_subscribed) {
        toast.info(data.message || 'Ya estás suscrito a este plan.');
        return;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar el pago');
    } finally {
      setLoadingPlan(null);
    }
  }, [user, navigate]);

  const ctaBuy = useABTest({
    id: 'pricing_cta_buy',
    variants: [
      { text: t("pricing.buyNow"), className: '' },
      { text: '🎶 Quiero distribuir mi música', className: '' },
      { text: 'Comenzar ahora', className: 'bg-yellow-400 text-black hover:bg-yellow-300 border-0' },
    ],
  });

  const prices = useMemo(() => ({
    annual: selectedAnnual?.formattedPrice ?? '—',
    annualPerCredit: selectedAnnual?.formattedPricePerCredit ?? '—',
    monthly: monthlyPlan?.formattedPrice ?? '—',
    individual: individualPlan?.formattedPrice ?? '—',
  }), [selectedAnnual, monthlyPlan, individualPlan]);

  const annualOptionLabel = useCallback((opt: StripePlan) => {
    const yearSuffix = t('pricing.priceAnnualSuffix').trim() || '/ year';
    const creditsWord = t('pricing.creditsWord', { defaultValue: 'créditos' });
    const perCreditWord = t('pricing.perCreditShort', { defaultValue: '/cr.' });
    return `${opt.credits} ${creditsWord} — ${opt.formattedPrice} ${yearSuffix} (${opt.formattedPricePerCredit ?? '—'} ${perCreditWord})`;
  }, [t]);

  return (
    <section id="pricing-section" className="py-20 px-4 bg-gradient-to-b from-primary/60 via-primary to-purple-600">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {t("pricing.title")}
        </h2>
        <p className="text-xl text-white/90 mb-12 max-w-4xl mx-auto">
          {t("pricing.subtitle")}
        </p>

        {/* Toggle Switch */}
        <div className="flex items-center justify-center mb-12">
          <span className={`mr-4 text-lg font-medium ${!isAnnual ? 'text-white' : 'text-white/70'}`}>
            {t("pricing.toggleBasic")}
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-8 w-16 items-center rounded-full bg-white/20 transition-colors"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isAnnual ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`ml-4 text-lg font-medium ${isAnnual ? 'text-white' : 'text-white/70'}`}>
            {t("pricing.togglePlus")}
          </span>
        </div>

        {/* Pricing Card */}
        <div className="flex justify-center mb-16">
          <Card
            className={`w-full border-0 text-white transition-all duration-500 ${
              isAnnual
                ? "max-w-lg bg-gradient-to-br from-pink-500 via-pink-600 to-purple-700 shadow-[0_25px_80px_-15px_rgba(236,72,153,0.6)] ring-2 ring-yellow-400/60 scale-100"
                : "max-w-md bg-gradient-to-b from-slate-700/90 to-slate-800/90 shadow-lg ring-1 ring-white/10 opacity-95"
            }`}
          >
            <CardContent className={isAnnual ? "p-10" : "p-7"}>
              <div className="text-center mb-6">
                {isAnnual && (
                  <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-pink-700 font-bold text-xs md:text-sm px-4 py-2 rounded-full mb-4 shadow-md">
                    <Sparkles className="w-4 h-4" />
                    {t("pricing.badgeAnnual")}
                  </div>
                )}

                <h3 className={`font-bold mb-1 ${isAnnual ? 'text-2xl md:text-3xl' : 'text-lg text-white/90'}`}>
                  {isAnnual ? t("pricing.nameAnnual") : t("pricing.nameMonthly")}
                </h3>

                <p className={`mb-4 ${isAnnual ? 'text-white/85 text-sm md:text-base' : 'text-white/65 text-xs'}`}>
                  {isAnnual ? t("pricing.briefAnnual") : t("pricing.briefMonthly")}
                </p>

                {/* Annual capacity selector — only on the annual plan */}
                {isAnnual && (
                  <div className="mb-5 text-left">
                    <p className="text-xs md:text-sm text-white/85 mb-2 text-center">
                      {t('pricing.annualSelectorHelp')}
                    </p>
                    <Select
                      value={selectedAnnualPlanId}
                      onValueChange={(v) => setSelectedAnnualPlanId(v as AnnualOption['planId'])}
                    >
                      <SelectTrigger
                        aria-label={t('pricing.annualSelectorAria', { defaultValue: 'Selecciona pack anual' })}
                        className="w-full bg-white/15 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm font-semibold h-12 text-sm md:text-base"
                      >
                        <SelectValue>{annualOptionLabel(selectedAnnual)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        {ANNUAL_OPTIONS.map(opt => (
                          <SelectItem key={opt.planId} value={opt.planId}>
                            {annualOptionLabel(opt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-[11px] md:text-xs text-white/70 text-center">
                      {t('pricing.annualSelectorNote')}
                    </p>
                  </div>
                )}

                <div className={`font-bold mb-2 ${isAnnual ? 'text-5xl md:text-6xl' : 'text-3xl'}`}>
                  {isAnnual ? prices.annual : prices.monthly}
                  <span className={`font-normal ${isAnnual ? 'text-xl' : 'text-base'}`}>
                    {isAnnual ? t("pricing.priceAnnualSuffix") : t("pricing.priceMonthlySuffix")}
                  </span>
                </div>

                <div
                  className={`inline-block rounded-full font-semibold ${
                    isAnnual
                      ? 'bg-white/20 text-white px-4 py-1.5 text-sm md:text-base backdrop-blur-sm border border-white/30'
                      : 'bg-white/10 text-white/85 px-3 py-1 text-xs'
                  }`}
                >
                  {isAnnual
                    ? t('pricing.creditsAnnualDynamic', {
                        count: selectedAnnual.credits,
                        defaultValue: `${selectedAnnual.credits} créditos incluidos`,
                      })
                    : t('pricing.creditsMonthly')}
                </div>

                {isAnnual && (
                  <p className="mt-2 text-xs md:text-sm text-white/80">
                    {t('pricing.annualPerCredit', {
                      price: prices.annualPerCredit,
                      defaultValue: `${prices.annualPerCredit} / crédito`,
                    })}
                  </p>
                )}
              </div>

              <div className={`space-y-2.5 mb-6 text-left ${isAnnual ? '' : 'mt-6'}`}>
                {(() => {
                  const featureList = t(`pricing.features.${isAnnual ? 'annual' : 'monthly'}`, { returnObjects: true }) as string[];
                  return featureList.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                          isAnnual
                            ? 'bg-green-400 ring-2 ring-green-300/40 shadow-[0_0_10px_rgba(74,222,128,0.45)]'
                            : 'bg-white'
                        }`}
                      >
                        <Check className={`w-3 h-3 ${isAnnual ? 'text-green-900' : 'text-slate-700'}`} strokeWidth={3} />
                      </div>
                      <span className={`leading-relaxed ${isAnnual ? 'text-sm md:text-[15px]' : 'text-sm text-white/90'}`}>{feature}</span>
                    </div>
                  ));
                })()}
              </div>

              {!isAnnual && (() => {
                const excluded = t('pricing.features.monthlyExcluded', { returnObjects: true }) as string[];
                if (!Array.isArray(excluded) || excluded.length === 0) return null;
                return (
                  <div className="mb-6 pt-4 border-t border-white/15">
                    <p className="text-xs uppercase tracking-wider text-white/55 font-semibold mb-2">
                      {t('pricing.excludedTitle')}
                    </p>
                    <div className="space-y-2">
                      {excluded.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                            <X className="w-3 h-3 text-white/60" strokeWidth={3} />
                          </div>
                          <span className="text-sm leading-relaxed text-white/55 line-through">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const targetPlanId = isAnnual ? selectedAnnualPlanId : 'monthly';
                return (
                  <Button
                    className={`w-full font-semibold rounded-full ${
                      isAnnual
                        ? 'bg-white hover:bg-white/95 text-pink-600 py-4 text-base md:text-lg shadow-xl'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/30 py-3 text-sm'
                    } ${ctaBuy.className}`}
                    disabled={loadingPlan !== null}
                    onClick={() => {
                      trackABClick('pricing_cta_buy', ctaBuy.variantIndex, ctaBuy.text);
                      handleCheckout(targetPlanId);
                    }}
                  >
                    {loadingPlan === targetPlanId ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                    {isAnnual ? t("pricing.ctaAnnual") : t("pricing.ctaMonthly")}
                    {isAnnual && <ArrowRight className="ml-2 w-5 h-5" />}
                  </Button>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Individual Registration Option — secondary, must not compete with annual plan */}
        <div className="text-center max-w-xl mx-auto rounded-2xl px-6 py-6 bg-white/5 backdrop-blur-sm border border-white/10">
          <h3 className="text-base md:text-lg font-semibold text-white/90 mb-1">
            {t("pricing.indivTitle")}
          </h3>
          <p className="text-sm text-white/70 mb-4">
            {t("pricing.indivSubtitle_dynamic", { price: prices.individual, defaultValue: t("pricing.indivSubtitle") })}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border border-white/40 text-white/90 hover:bg-white/10 hover:text-white px-6 py-2 rounded-full font-medium text-sm"
            disabled={loadingPlan !== null}
            onClick={() => handleCheckout('individual')}
          >
            {loadingPlan === 'individual' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            {t("pricing.indivButton")}
          </Button>
        </div>

        {/* Professional / Company / Academy CTA band */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div
            className="relative rounded-2xl p-6 md:p-7 backdrop-blur-xl flex flex-col md:flex-row items-center gap-5 md:gap-6 text-center md:text-left"
            style={{
              background:
                "linear-gradient(135deg, rgba(236,72,153,0.10) 0%, rgba(168,85,247,0.10) 50%, rgba(20,184,166,0.10) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow:
                "0 18px 50px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(168,85,247,0.25))",
                border: "1px solid rgba(236,72,153,0.35)",
              }}
            >
              <Briefcase className="w-6 h-6 text-pink-200" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-lg md:text-xl mb-1">
                {t("pricing.prosTitle")}
              </h4>
              <p className="text-white/75 text-sm md:text-[15px] leading-relaxed">
                {t("pricing.prosSubtitle")}
              </p>
            </div>
            <Link to="/contact" className="shrink-0">
              <Button
                className="rounded-full px-6 py-3 font-semibold text-white whitespace-nowrap"
                style={{
                  background:
                    "linear-gradient(90deg, #ec4899, #a855f7)",
                  boxShadow: "0 10px 30px rgba(236,72,153,0.35)",
                }}
              >
                {t("pricing.prosCta")}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Fiscal / legal note */}
          <p className="mt-6 text-center text-white/55 text-xs leading-relaxed max-w-3xl mx-auto">
            {t("pricing.conditionsText")}
          </p>
        </div>

        {/* Comparison Table */}
        <ComparisonTable />
      </div>
    </section>
  );
};