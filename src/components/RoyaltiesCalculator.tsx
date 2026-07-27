import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, TrendingUp, Music, DollarSign, Layers, Check } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useInView } from "@/hooks/useInView";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const COMPETITORS = [
  // Musicdibs no se queda comisión — el usuario recibe el 100% de lo que
  // el distribuidor/plataforma le paga. Las plataformas de streaming
  // (Spotify, Apple Music) retienen su parte antes, igual que con
  // cualquier distribuidor — aclarado en el disclaimer.
  { key: "musicdibs", rate: 1.0, highlight: true },
  { key: "distrokid", rate: 0.80, highlight: false },
  { key: "cdbaby", rate: 0.85, highlight: false },
  { key: "tunecore", rate: 0.80, highlight: false },
];

const AVG_PAY_PER_STREAM = 0.004;

// Reference monthly prices in EUR for the "stack cost" tab.
// Based on each tool's most common public pricing (2026); the disclaimer
// tells users to check each service for the exact price in their country.
type StackOption = { id: string; labelKey: string; monthlyEur: number };

const CREATION_OPTIONS: StackOption[] = [
  { id: "none", labelKey: "calculator.stack.none", monthlyEur: 0 },
  { id: "suno", labelKey: "Suno Pro", monthlyEur: 10 },
  { id: "udio", labelKey: "Udio Standard", monthlyEur: 10 },
  { id: "other", labelKey: "calculator.stack.other", monthlyEur: 10 },
];
const DISTRIBUTION_OPTIONS: StackOption[] = [
  { id: "none", labelKey: "calculator.stack.none", monthlyEur: 0 },
  { id: "distrokid", labelKey: "DistroKid Musician+", monthlyEur: 3.25 }, // ~$39.99/yr
  { id: "cdbaby", labelKey: "CD Baby Standard", monthlyEur: 2.5 },
  { id: "tunecore", labelKey: "TuneCore Rising", monthlyEur: 12 },
  { id: "other", labelKey: "calculator.stack.other", monthlyEur: 5 },
];
const REGISTRATION_OPTIONS: StackOption[] = [
  { id: "none", labelKey: "calculator.stack.none", monthlyEur: 0 },
  { id: "other", labelKey: "calculator.stack.other", monthlyEur: 8 },
];
const PROMOTION_OPTIONS: StackOption[] = [
  { id: "none", labelKey: "calculator.stack.none", monthlyEur: 0 },
  { id: "groover", labelKey: "Groover", monthlyEur: 20 },
  { id: "submithub", labelKey: "SubmitHub", monthlyEur: 12 },
  { id: "other", labelKey: "calculator.stack.other", monthlyEur: 10 },
];

const MUSICDIBS_MONTHLY_EUR = 6.9;
const MUSICDIBS_ANNUAL_EUR = 59.9;
const MUSICDIBS_ANNUAL_MONTHLY_EQUIV = MUSICDIBS_ANNUAL_EUR / 12;

const formatNumber = (n: number, lang: string) => {
  const locale = lang === "es" ? "es-ES" : lang === "pt-BR" ? "pt-BR" : lang === "fr" ? "fr-FR" : lang === "it" ? "it-IT" : lang === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale).format(n);
};

const formatCurrency = (n: number, lang: string) => {
  const locale = lang === "es" ? "es-ES" : lang === "pt-BR" ? "pt-BR" : lang === "fr" ? "fr-FR" : lang === "it" ? "it-IT" : lang === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const STREAM_PRESETS = [10_000, 50_000, 100_000, 500_000, 1_000_000];

const AnimatedCurrency = ({ value, lang }: { value: number; lang: string }) => {
  const animated = useAnimatedValue(value, 600);
  return <>{formatCurrency(animated, lang)}</>;
};

// Resolve label — supports either an i18n key or a raw brand string.
const resolveLabel = (t: (k: string) => string, key: string) =>
  key.includes(".") ? t(key) : key;

const StackSelector = ({
  label,
  options,
  value,
  onChange,
  t,
}: {
  label: string;
  options: StackOption[];
  value: string;
  onChange: (id: string) => void;
  t: (k: string) => string;
}) => (
  <div>
    <label className="block text-white font-medium mb-2">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={
              selected
                ? { background: "#A855F7", color: "#FFFFFF", boxShadow: "0 0 12px rgba(168,85,247,0.5)" }
                : { background: "rgba(255,255,255,0.1)", color: "#C4B5FD" }
            }
          >
            {resolveLabel(t, opt.labelKey)}
          </button>
        );
      })}
    </div>
  </div>
);

const StackCostTab = ({ lang, t }: { lang: string; t: (k: string) => string }) => {
  const [creation, setCreation] = useState("suno");
  const [distribution, setDistribution] = useState("distrokid");
  const [registration, setRegistration] = useState("none");
  const [promotion, setPromotion] = useState("none");

  const summary = useMemo(() => {
    const rows: { key: string; opt: StackOption }[] = [
      { key: "creation", opt: CREATION_OPTIONS.find((o) => o.id === creation)! },
      { key: "distribution", opt: DISTRIBUTION_OPTIONS.find((o) => o.id === distribution)! },
      { key: "registration", opt: REGISTRATION_OPTIONS.find((o) => o.id === registration)! },
      { key: "promotion", opt: PROMOTION_OPTIONS.find((o) => o.id === promotion)! },
    ];
    const monthly = rows.reduce((s, r) => s + r.opt.monthlyEur, 0);
    const logins = rows.filter((r) => r.opt.id !== "none").length;
    return { rows, monthly, annual: monthly * 12, logins };
  }, [creation, distribution, registration, promotion]);

  const savingsMonthly = Math.max(0, summary.monthly - MUSICDIBS_ANNUAL_MONTHLY_EQUIV);
  const savingsAnnual = savingsMonthly * 12;

  return (
    <div className="space-y-6">
      <p className="text-sm" style={{ color: "#C4B5FD" }}>{t("calculator.stack.intro")}</p>

      <div className="grid md:grid-cols-2 gap-5">
        <StackSelector label={t("calculator.stack.creation")} options={CREATION_OPTIONS} value={creation} onChange={setCreation} t={t} />
        <StackSelector label={t("calculator.stack.distribution")} options={DISTRIBUTION_OPTIONS} value={distribution} onChange={setDistribution} t={t} />
        <StackSelector label={t("calculator.stack.registration")} options={REGISTRATION_OPTIONS} value={registration} onChange={setRegistration} t={t} />
        <StackSelector label={t("calculator.stack.promotion")} options={PROMOTION_OPTIONS} value={promotion} onChange={setPromotion} t={t} />
      </div>

      {/* Totals */}
      <div className="grid md:grid-cols-3 gap-4 pt-4">
        <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-xs mb-1" style={{ color: "#C4B5FD" }}>{t("calculator.stack.total_month")}</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(summary.monthly, lang)}</div>
        </div>
        <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-xs mb-1" style={{ color: "#C4B5FD" }}>{t("calculator.stack.total_year")}</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(summary.annual, lang)}</div>
        </div>
        <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-xs mb-1" style={{ color: "#C4B5FD" }}>{t("calculator.stack.logins")}</div>
          <div className="text-2xl font-bold text-white">{formatNumber(summary.logins, lang)}</div>
        </div>
      </div>

      {/* vs Musicdibs */}
      <div className="rounded-xl p-6" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5" style={{ color: "#A855F7" }} />
          <h4 className="text-white font-semibold">{t("calculator.stack.vs_musicdibs")}</h4>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="text-xs mb-1" style={{ color: "#C4B5FD" }}>{t("calculator.stack.monthly_plan")}</div>
            <div className="text-xl font-bold text-white">{formatCurrency(MUSICDIBS_MONTHLY_EUR, lang)}<span className="text-sm font-normal opacity-70"> /mo</span></div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="text-xs mb-1" style={{ color: "#C4B5FD" }}>{t("calculator.stack.annual_plan")}</div>
            <div className="text-xl font-bold text-white">{formatCurrency(MUSICDIBS_ANNUAL_MONTHLY_EQUIV, lang)}<span className="text-sm font-normal opacity-70"> /mo</span></div>
          </div>
        </div>

        {savingsAnnual > 0 && (
          <div className="mt-4 flex items-start gap-2">
            <Check className="w-5 h-5 mt-0.5" style={{ color: "#A855F7" }} />
            <div className="text-white">
              <span className="font-semibold">{t("calculator.stack.savings")}: </span>
              <span className="text-xl font-bold" style={{ color: "#A855F7" }}>{formatCurrency(savingsAnnual, lang)}</span>
              <span className="opacity-70 text-sm"> / year</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: "rgba(196,181,253,0.6)" }}>
        {t("calculator.stack.disclaimer_stack")}
      </p>
    </div>
  );
};

export const RoyaltiesCalculator = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;
  const [streams, setStreams] = useState(100_000);

  const { ref: barsRef, isInView: barsVisible } = useInView({ threshold: 0.3 });

  const results = useMemo(() => {
    const grossRevenue = streams * AVG_PAY_PER_STREAM;
    return COMPETITORS.map((c) => ({
      ...c,
      earnings: grossRevenue * c.rate,
      percentage: c.rate * 100,
    }));
  }, [streams]);

  const musicdibsEarnings = results[0].earnings;
  const bestCompetitorEarnings = Math.max(...results.slice(1).map((r) => r.earnings));
  const advantage = musicdibsEarnings - bestCompetitorEarnings;

  // Animated values
  const animatedStreams = useAnimatedValue(streams, 500);
  const animatedAdvantage = useAnimatedValue(advantage, 700);

  const rafSlider = useRef<number | null>(null);
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(e.currentTarget.value);
    if (rafSlider.current) cancelAnimationFrame(rafSlider.current);
    rafSlider.current = requestAnimationFrame(() => {
      setStreams(nextValue);
      rafSlider.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafSlider.current) cancelAnimationFrame(rafSlider.current);
    };
  }, []);

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-primary to-primary">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-brand blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
              style={{ background: "rgba(168,85,247,0.2)", color: "#C4B5FD" }}
            >
              <Calculator className="w-4 h-4" />
              {t("calculator.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t("calculator.title")}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#C4B5FD" }}>
              {t("calculator.subtitle")}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div
            className="rounded-2xl p-6 md:p-10"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
            }}
          >
            <Tabs defaultValue="royalties" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5">
                <TabsTrigger value="royalties" className="data-[state=active]:bg-primary/40 data-[state=active]:text-white text-white/70">
                  {t("calculator.tabs.royalties")}
                </TabsTrigger>
                <TabsTrigger value="stack" className="data-[state=active]:bg-primary/40 data-[state=active]:text-white text-white/70">
                  {t("calculator.tabs.stack")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="royalties">
                {/* Streams input */}
                <div className="mb-10">
                  <label className="flex items-center gap-2 font-semibold text-lg mb-4 text-white">
                    <Music className="w-5 h-5" style={{ color: "#A855F7" }} />
                    {t("calculator.streams_label")}
                  </label>

                  {/* Preset buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {STREAM_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setStreams(preset)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                        style={
                          streams === preset
                            ? { background: "#A855F7", color: "#FFFFFF", boxShadow: "0 0 12px rgba(168,85,247,0.5)" }
                            : { background: "rgba(255,255,255,0.1)", color: "#C4B5FD" }
                        }
                      >
                        {formatNumber(preset, lang)}
                      </button>
                    ))}
                  </div>

                  {/* Slider */}
                  <div className="relative">
                    <input
                      type="range"
                      min={1000}
                      max={5000000}
                      step={1000}
                      value={streams}
                      onChange={handleSliderChange}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A855F7] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(168,85,247,0.6)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#A855F7] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(168,85,247,0.6)] [&::-moz-range-thumb]:cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        accentColor: "#A855F7",
                      }}
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: "#C4B5FD" }}>
                      <span>1K</span>
                      <span>5M</span>
                    </div>
                  </div>

                  {/* Current value display */}
                  <div className="mt-4 text-center">
                    <span
                      className="text-4xl font-bold bg-clip-text text-transparent"
                      style={{ backgroundImage: "linear-gradient(90deg, #A855F7, #E879F9)" }}
                    >
                      {formatNumber(Math.round(animatedStreams), lang)}
                    </span>
                    <span className="ml-2 text-lg" style={{ color: "#C4B5FD" }}>{t('calcStreams.unit')}</span>
                  </div>
                </div>

                {/* Results comparison */}
                <div className="space-y-3" ref={barsRef}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5" style={{ color: "#A855F7" }} />
                    <h3 className="text-white font-semibold text-lg">
                      {t("calculator.results_title")}
                    </h3>
                  </div>

                  {results.map((r, index) => {
                    const maxEarnings = results[0].earnings;
                    const barWidth = maxEarnings > 0 ? (r.earnings / maxEarnings) * 100 : 0;
                    const animatedWidth = barsVisible ? barWidth : 0;
                    const delay = index * 150;

                    return (
                      <div
                        key={r.key}
                        className="rounded-xl p-4 transition-all duration-500 ease-out"
                        style={{
                          ...(r.highlight
                            ? {
                                background: "rgba(168,85,247,0.12)",
                                border: "1px solid rgba(168,85,247,0.35)",
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                              }),
                          opacity: barsVisible ? 1 : 0,
                          transform: barsVisible ? "translateY(0)" : "translateY(12px)",
                          transitionDelay: `${delay}ms`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${r.highlight ? "text-lg" : ""}`}
                              style={{ color: "#FFFFFF" }}
                            >
                              {t(`calculator.competitors.${r.key}`)}
                            </span>
                            {r.highlight && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                                style={{ background: "#A855F7" }}
                              >
                                {t("calculator.recommended")}
                              </span>
                            )}
                            {!r.highlight && (
                              <span className="text-xs" style={{ color: "#C4B5FD" }}>
                                ({r.percentage}% {t("calculator.royalties")})
                              </span>
                            )}
                          </div>
                          <span
                            className="font-bold text-lg"
                            style={{ color: "#FFFFFF" }}
                          >
                            <AnimatedCurrency value={r.earnings} lang={lang} />
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${animatedWidth}%`,
                              transition: `width 1s ease-out ${delay + 200}ms`,
                              ...(r.highlight
                                ? {
                                    background: "linear-gradient(90deg, #A855F7, #7C3AED)",
                                    boxShadow: barsVisible ? "0 0 12px rgba(168,85,247,0.6)" : "none",
                                  }
                                : {
                                    background: "rgba(255,255,255,0.25)",
                                  }),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Advantage callout */}
                {advantage > 0 && (
                  <div
                    className="mt-8 rounded-xl p-5 text-center"
                    style={{
                      background: "rgba(168,85,247,0.1)",
                      border: "1px solid rgba(168,85,247,0.25)",
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5" style={{ color: "#A855F7" }} />
                      <span className="text-white font-bold text-lg">
                        {t("calculator.advantage_prefix")}{" "}
                        <span className="text-xl" style={{ color: "#A855F7" }}>{formatCurrency(animatedAdvantage, lang)}</span>{" "}
                        {t("calculator.advantage_suffix")}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#C4B5FD" }}>
                      {t("calculator.advantage_desc")}
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-xs mt-6 text-center leading-relaxed" style={{ color: "rgba(196,181,253,0.6)" }}>
                  {t("calculator.disclaimer")}
                </p>
              </TabsContent>

              <TabsContent value="stack">
                <StackCostTab lang={lang} t={t} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
