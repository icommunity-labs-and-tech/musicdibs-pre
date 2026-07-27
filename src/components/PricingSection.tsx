import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useABTest, trackABClick } from "@/hooks/useABTest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Briefcase, ArrowRight, Check, Sparkles, Star } from "lucide-react";
import { GuestEmailModal } from "@/components/GuestEmailModal";

// Annual capacity packs — connected to real Stripe prices via the
// `create-credit-checkout` edge function.
type AnnualOption = {
  planId: 'annual_100' | 'annual_200' | 'annual_300' | 'annual_500' | 'annual_1000';
  credits: number;
  priceEur: number;
  pricePerCreditEur: number;
  priceId: string;
};

const ANNUAL_OPTIONS: AnnualOption[] = [
  { planId: 'annual_100',  credits: 100,  priceEur: 59.90,  pricePerCreditEur: 0.60, priceId: 'price_1THT7cF9ZCIiqrz6sWS67Q4V' },
  { planId: 'annual_200',  credits: 200,  priceEur: 109.90, pricePerCreditEur: 0.55, priceId: 'price_1THT7gF9ZCIiqrz6Acb2CkDC' },
  { planId: 'annual_300',  credits: 300,  priceEur: 149.90, pricePerCreditEur: 0.50, priceId: 'price_1THT7jF9ZCIiqrz6i02J4bj4' },
  { planId: 'annual_500',  credits: 500,  priceEur: 229.90, pricePerCreditEur: 0.46, priceId: 'price_1THT7nF9ZCIiqrz6r1ZcqH8L' },
  { planId: 'annual_1000', credits: 1000, priceEur: 399.90, pricePerCreditEur: 0.40, priceId: 'price_1THT7rF9ZCIiqrz6UmJDkBNZ' },
];

// New starter annual plan — planId already resolved in the backend edge function.
const STARTER_ANNUAL = {
  planId: 'annual_20' as const,
  credits: 20,
  priceEur: 19.90,
  priceId: 'price_1Tp90nFULeu7PzK67hoGodWv',
};

const BASE_PRICES = {
  monthly: 6.90,
  individual: 7.00,
};

const CURRENCY_CONFIG: Record<string, { symbol: string; rate: number; position: 'before' | 'after'; decimal: string }> = {
  es: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
  en: { symbol: '$', rate: 1.08, position: 'before', decimal: '.' },
  'pt-BR': { symbol: 'R$', rate: 5.50, position: 'before', decimal: ',' },
  fr: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
  it: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
  de: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
};

function formatPrice(amount: number, lang: string): string {
  const config = CURRENCY_CONFIG[lang] || CURRENCY_CONFIG['es'];
  const converted = amount * config.rate;
  const [whole, dec] = converted.toFixed(2).split('.');
  const formatted = whole + config.decimal + dec;
  return config.position === 'before'
    ? `${config.symbol}${formatted}`
    : `${formatted} ${config.symbol}`;
}

export const PricingSection = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedAnnualPlanId, setSelectedAnnualPlanId] = useState<AnnualOption['planId']>('annual_100');
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [pendingGuestPlanId, setPendingGuestPlanId] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.resolvedLanguage || i18n.language;

  const launchCheckout = useCallback(async (planId: string, guestEmail?: string) => {
    const expectedPriceId =
      planId === STARTER_ANNUAL.planId
        ? STARTER_ANNUAL.priceId
        : ANNUAL_OPTIONS.find(o => o.planId === planId)?.priceId;
    const body: Record<string, unknown> = expectedPriceId ? { planId, expectedPriceId } : { planId };
    if (guestEmail) {
      body.guest = true;
      body.guestEmail = guestEmail;
    }
    try {
      const refCode = localStorage.getItem('referral_code');
      if (refCode) body.referral_code = refCode;
    } catch { /* ignore */ }
    const { data, error } = await supabase.functions.invoke('create-credit-checkout', { body });
    if (error) throw error;
    if (data?.already_subscribed) {
      toast.info(data.message || 'Ya estás suscrito a este plan.');
      return;
    }
    if (data?.url) {
      if (guestEmail) {
        window.location.href = data.url;
      } else {
        window.open(data.url, '_blank');
      }
    }
  }, []);

  const handleCheckout = useCallback(async (planId: string) => {
    if (!user) {
      setPendingGuestPlanId(planId);
      setGuestModalOpen(true);
      return;
    }
    setLoadingPlan(planId);
    try {
      await launchCheckout(planId);
    } catch (err: any) {
      toast.error(err.message || 'Error al iniciar el pago');
    } finally {
      setLoadingPlan(null);
    }
  }, [user, launchCheckout]);

  const handleGuestConfirm = useCallback(async (email: string, password: string, name: string) => {
    if (!pendingGuestPlanId) return;
    const planId = pendingGuestPlanId;
    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke('register-guest-lead', {
        body: { email, password, name, language: (lang || 'es').slice(0, 2) },
      });
      if (error || !data?.ok) {
        throw new Error(data?.error || 'Error al registrar el email');
      }
      try {
        sessionStorage.setItem('guest_checkout_email', email);
        sessionStorage.setItem('guest_checkout_password', password);
      } catch { /* ignore */ }
      await launchCheckout(planId, email);
      setGuestModalOpen(false);
      setPendingGuestPlanId(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al continuar');
      throw err;
    } finally {
      setLoadingPlan(null);
    }
  }, [pendingGuestPlanId, lang, launchCheckout]);

  const ctaBuy = useABTest({
    id: 'pricing_cta_buy',
    variants: [
      { text: t("pricing.buyNow"), className: '' },
      { text: '🎶 Quiero distribuir mi música', className: '' },
      { text: 'Comenzar ahora', className: 'bg-warning text-black hover:bg-warning border-0' },
    ],
  });

  const selectedAnnual = useMemo(
    () => ANNUAL_OPTIONS.find(o => o.planId === selectedAnnualPlanId) ?? ANNUAL_OPTIONS[0],
    [selectedAnnualPlanId]
  );

  const prices = useMemo(() => ({
    monthly: formatPrice(BASE_PRICES.monthly, lang),
    individual: formatPrice(BASE_PRICES.individual, lang),
    starter: formatPrice(STARTER_ANNUAL.priceEur, lang),
    annual: formatPrice(selectedAnnual.priceEur, lang),
    annualPerCredit: formatPrice(selectedAnnual.pricePerCreditEur, lang),
  }), [lang, selectedAnnual]);

  const annualOptionLabel = useCallback((opt: AnnualOption) => {
    const price = formatPrice(opt.priceEur, lang);
    const perCredit = formatPrice(opt.pricePerCreditEur, lang);
    const yearSuffix = t('pricing.priceAnnualSuffix').trim() || '/ year';
    const creditsWord = t('pricing.creditsWord', { defaultValue: 'créditos' });
    const perCreditWord = t('pricing.perCreditShort', { defaultValue: '/cr.' });
    return `${opt.credits} ${creditsWord} — ${price} ${yearSuffix} (${perCredit} ${perCreditWord})`;
  }, [lang, t]);

  const monthlyFeatures = t('pricing.features.monthly', { returnObjects: true }) as string[];
  const starterFeatures = t('pricing.features.starter', { returnObjects: true }) as string[];
  const annualFeatures = t('pricing.features.annual', { returnObjects: true }) as string[];

  const renderFeature = (text: string, tone: 'plain' | 'accent' = 'plain') => (
    <div className="flex items-start space-x-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
          tone === 'accent'
            ? 'bg-success ring-2 ring-success/40 shadow-[0_0_10px_rgba(74,222,128,0.45)]'
            : 'bg-white/90'
        }`}
      >
        <Check className={`w-3 h-3 ${tone === 'accent' ? 'text-success' : 'text-slate-700'}`} strokeWidth={3} />
      </div>
      <span className="text-sm leading-relaxed text-white/90">{text}</span>
    </div>
  );

  return (
    <>
    <section id="pricing-section" className="py-20 px-4 bg-gradient-to-b from-primary/60 via-primary to-primary">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {t("pricing.title")}
        </h2>
        <p className="text-xl text-white/90 mb-14 max-w-4xl mx-auto">
          {t("pricing.subtitle")}
        </p>

        {/* 3 columnas de precios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 items-stretch mb-16 max-w-6xl mx-auto">

          {/* ─────────── COLUMNA IZQUIERDA — Mensual ─────────── */}
          <div className="order-1 md:order-1 flex">
            <Card className="w-full border border-white/15 bg-gradient-to-b from-slate-700/90 to-slate-800/90 text-white shadow-lg flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold text-white/90 mb-1">
                    {t("pricing.nameMonthly")}
                  </h3>
                  <p className="text-xs text-white/65 mb-4">{t("pricing.briefMonthly")}</p>
                  <div className="text-3xl font-bold mb-2">
                    {prices.monthly}
                    <span className="text-base font-normal">{t("pricing.priceMonthlySuffix")}</span>
                  </div>
                  <div className="inline-block rounded-full bg-white/10 text-white/85 px-3 py-1 text-xs font-semibold">
                    {t("pricing.creditsMonthly")}
                  </div>
                </div>
                <div className="space-y-2.5 mb-6 text-left flex-1">
                  {monthlyFeatures.map((f, i) => <div key={i}>{renderFeature(f)}</div>)}
                </div>
                <Button
                  className="w-full font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 py-3 text-sm"
                  disabled={loadingPlan !== null}
                  onClick={() => handleCheckout('monthly')}
                >
                  {loadingPlan === 'monthly' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  {t("pricing.ctaMonthly")}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ─────────── COLUMNA CENTRAL — Anual Básico (destacada) ─────────── */}
          <div className="order-2 md:order-2 flex">
            <Card
              className="w-full border-[3px] border-warning text-white flex flex-col relative md:-mt-4 md:mb-0"
              style={{
                background: 'linear-gradient(160deg, #f59e0b 0%, #ec4899 55%, #a855f7 100%)',
                boxShadow: '0 30px 80px -20px rgba(236,72,153,0.7), 0 0 0 4px rgba(250,204,21,0.15)',
              }}
            >
              {/* Badge superior grande */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <div className="inline-flex items-center gap-1.5 bg-warning text-brand font-extrabold text-xs md:text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                  <Star className="w-4 h-4 fill-pink-800" />
                  {t('pricing.starter.badge')}
                </div>
              </div>

              <CardContent className="p-7 pt-9 flex flex-col flex-1">
                <div className="text-center mb-5">
                  <h3 className="text-2xl md:text-3xl font-bold mb-1">
                    {t('pricing.starter.name')}
                  </h3>
                  <p className="text-white/90 text-sm mb-4">
                    {t('pricing.starter.brief')}
                  </p>
                  <div className="text-5xl md:text-6xl font-bold mb-2">
                    {prices.starter}
                    <span className="text-xl font-normal">{t("pricing.priceAnnualSuffix")}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 text-white font-semibold px-4 py-1.5 text-sm">
                    <Sparkles className="w-4 h-4" />
                    {t('pricing.starter.credits')}
                  </div>
                </div>

                <div className="space-y-2.5 mb-4 text-left flex-1">
                  {starterFeatures.map((f, i) => <div key={i}>{renderFeature(f, 'accent')}</div>)}
                </div>

                {/* Upsell tenue hacia Plus+ */}
                <p className="text-[11px] md:text-xs text-white/75 text-center mb-5 leading-relaxed">
                  {t('pricing.starter.upsell')} <ArrowRight className="inline w-3 h-3 -mt-0.5" />
                </p>

                <Button
                  className="w-full font-bold rounded-full bg-white hover:bg-muted text-brand py-4 text-base md:text-lg shadow-xl"
                  disabled={loadingPlan !== null}
                  onClick={() => {
                    trackABClick('pricing_cta_buy', ctaBuy.variantIndex, ctaBuy.text);
                    handleCheckout(STARTER_ANNUAL.planId);
                  }}
                >
                  {loadingPlan === STARTER_ANNUAL.planId ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  {t('pricing.starter.cta')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ─────────── COLUMNA DERECHA — Plan Plus+ ─────────── */}
          <div className="order-3 md:order-3 flex">
            <Card className="w-full border border-white/20 bg-gradient-to-br from-primary/80 via-brand/70 to-primary/80 text-white shadow-xl flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 text-white font-semibold text-[11px] md:text-xs px-3 py-1 rounded-full mb-3">
                    {t("pricing.badgeAnnual")}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">
                    {t("pricing.nameAnnual")}
                  </h3>
                  <p className="text-white/85 text-xs md:text-sm mb-4">
                    {t("pricing.briefAnnual")}
                  </p>

                  <div className="mb-4 text-left">
                    <p className="text-[11px] md:text-xs text-white/80 mb-1.5 text-center">
                      {t('pricing.annualSelectorHelp')}
                    </p>
                    <Select
                      value={selectedAnnualPlanId}
                      onValueChange={(v) => setSelectedAnnualPlanId(v as AnnualOption['planId'])}
                    >
                      <SelectTrigger
                        aria-label={t('pricing.annualSelectorAria', { defaultValue: 'Selecciona pack anual' })}
                        className="w-full bg-white/15 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm font-semibold h-11 text-sm"
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
                  </div>

                  <div className="text-4xl md:text-5xl font-bold mb-2">
                    {prices.annual}
                    <span className="text-lg font-normal">{t("pricing.priceAnnualSuffix")}</span>
                  </div>
                  <div className="inline-block rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold px-3 py-1 text-xs">
                    {t('pricing.creditsAnnualDynamic', { count: selectedAnnual.credits })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/75">
                    {t('pricing.annualPerCredit', { price: prices.annualPerCredit })}
                  </p>
                </div>

                <div className="space-y-2 mb-6 text-left flex-1">
                  {annualFeatures.map((f, i) => <div key={i}>{renderFeature(f, 'accent')}</div>)}
                </div>

                <Button
                  className={`w-full font-semibold rounded-full bg-white/95 hover:bg-white text-primary py-3.5 text-sm md:text-base shadow-lg ${ctaBuy.className}`}
                  disabled={loadingPlan !== null}
                  onClick={() => {
                    trackABClick('pricing_cta_buy', ctaBuy.variantIndex, ctaBuy.text);
                    handleCheckout(selectedAnnualPlanId);
                  }}
                >
                  {loadingPlan === selectedAnnualPlanId ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  {t("pricing.ctaAnnual")}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Individual Registration Option */}
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
              <Briefcase className="w-6 h-6 text-brand" />
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

          <p className="mt-6 text-center text-white/55 text-xs leading-relaxed max-w-3xl mx-auto">
            {t("pricing.conditionsText")}
          </p>
        </div>

      </div>
    </section>
    <GuestEmailModal
      open={guestModalOpen}
      onOpenChange={(o) => { if (!o) { setGuestModalOpen(false); setPendingGuestPlanId(null); setLoadingPlan(null); } }}
      onConfirm={handleGuestConfirm}
    />
    </>
  );
};
