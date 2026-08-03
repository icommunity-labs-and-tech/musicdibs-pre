import { Helmet } from "react-helmet-async";
import "@/styles/landing-ai-studio.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { REGISTRO_COPY, type RegistroLang } from "./registroMusicalCopy";
import { BackgroundScene } from "@/components/landing/BackgroundScene";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SocialBanner } from "@/components/landing/SocialBanner";
import { PricingSection } from "@/components/PricingSection";
import { RoyaltiesCalculator } from "@/components/RoyaltiesCalculator";
import promoInstagramAsset from "@/assets/promo-instagram-100k.png.asset.json";
import promoTiktokAsset from "@/assets/promo-tiktok-245k.png.asset.json";
const urbanArtistInstagram = promoInstagramAsset.url;
const urbanArtistTiktok = promoTiktokAsset.url;
import testimonioPoster from "@/assets/testimonio-poster.jpg";
import {
  ShieldCheck,
  Globe2,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  Music2,
  Heart,
  Users,
  Disc3,
} from "lucide-react";

const SERVICE_ICONS = [ShieldCheck, Globe2, TrendingUp];

const PLATFORMS = [
  "Spotify",
  "Apple Music",
  "TikTok",
  "Amazon Music",
  "YouTube Music",
];

export default function RegistroMusicalPage() {
  const { i18n } = useTranslation();
  const lang: RegistroLang = (["es", "en", "pt-BR"].includes(i18n.language)
    ? i18n.language
    : "es") as RegistroLang;
  const c = REGISTRO_COPY[lang];
  return (
    <>
      <Helmet>
        <title>{c.seoTitle}</title>
        <meta name="description" content={c.seoDesc} />
        <link rel="canonical" href="https://www.musicdibs.com/registro-musical" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: c.ldName,
            serviceType: c.ldServiceType,
            description: c.ldDescription,
            areaServed: "Worldwide",
            url: "https://www.musicdibs.com/registro-musical",
            provider: {
              "@type": "Organization",
              name: "Musicdibs",
              url: "https://www.musicdibs.com",
              logo: "https://www.musicdibs.com/logo.png",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "EUR",
              price: "0",
              availability: "https://schema.org/InStock",
              url: "https://www.musicdibs.com/registro-musical",
            },
          })}
        </script>
      </Helmet>


      <div className="landing-ai-studio">
        <main className="relative min-h-screen overflow-hidden">
          <BackgroundScene />
          <Navbar
            ctaText={c.navCta}
            ctaHref="https://www.musicdibs.com/login?tab=register"
            secondaryText={c.navSecondary}
            secondaryHref="https://www.musicdibs.com/login"
          />

          {/* ============================= HERO ============================= */}
          <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
            <div className="relative mx-auto max-w-6xl px-6">
              <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
                {/* Copy */}
                <div className="animate-fade-in">
                  <div
                    className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-[0.22em] mb-6"
                    style={{ color: "oklch(0.85 0.22 340)" }}
                  >
                    <Sparkles className="h-3 w-3" />
                    {c.heroBadge}
                  </div>

                  <h1
                    className="font-display font-bold text-[2.6rem] sm:text-5xl lg:text-[3.6rem] leading-[1.05] tracking-tight text-foreground"
                    style={{ textWrap: "balance" as any }}
                  >
                    {c.heroTitle1}{" "}
                    <span className="text-gradient-brand">{c.heroTitleAccent}</span>.
                  </h1>

                  <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                    {c.heroSubtitle}
                  </p>

                  <div className="mt-9 flex flex-col sm:flex-row gap-3">
                    <a
                      href="#pricing-section"
                      className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                    >
                      {c.heroCta}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>

                  <p className="mt-4 text-sm text-[oklch(0.98_0.01_295/0.7)]">
                    {c.heroExplore}{" "}
                    <a
                      href="https://www.musicdibs.com/login?tab=register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline-offset-4 hover:underline transition-colors"
                      style={{ color: "oklch(0.85 0.22 340)" }}
                    >
                      {c.heroExploreLink}
                    </a>
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
                    {c.heroChips.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "oklch(0.85 0.22 340)" }} />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dashboard-style panel mockup */}
                <div className="relative animate-fade-in">
                  {/* Ambient glow */}
                  <div
                    className="absolute -inset-12 rounded-[2rem] blur-3xl opacity-70 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 70% 20%, #8B5CF6 0%, transparent 55%), radial-gradient(circle at 20% 80%, oklch(0.68 0.27 322 / 0.5), transparent 60%)",
                    }}
                  />


                  {/* Main panel */}
                  <div
                    className="relative glass rounded-[1.75rem] p-5 sm:p-6 z-20"
                    style={{
                      border: "1px solid oklch(0.85 0.22 340 / 0.25)",
                      boxShadow:
                        "0 40px 80px -30px #8B5CF6, 0 0 0 1px oklch(1 0 0 / 0.04) inset",
                      backdropFilter: "blur(24px)",
                    }}
                  >
                    {/* Window chrome */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: "oklch(0.85 0.22 340)",
                            boxShadow: "0 0 8px oklch(0.85 0.22 340)",
                          }}
                        />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {c.panelLabel}
                      </span>
                    </div>

                    {/* Track player card */}
                    <div
                      className="rounded-2xl p-4 mb-5"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.18 0.1 320 / 0.6), oklch(0.12 0.06 300 / 0.4))",
                        border: "1px solid oklch(0.85 0.22 340 / 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="relative h-14 w-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                          style={{
                            background:
                              "linear-gradient(135deg, #8B5CF6, oklch(0.68 0.27 322))",
                            boxShadow: "0 10px 25px -5px #8B5CF6",
                          }}
                        >
                          <Music2 className="h-6 w-6 text-primary-foreground relative z-10" />
                          <div
                            className="absolute inset-0 opacity-40"
                            style={{
                              background:
                                "repeating-linear-gradient(45deg, transparent 0 4px, oklch(1 0 0 / 0.1) 4px 8px)",
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {c.panelTrackLabel}
                          </p>
                          <p className="text-sm font-semibold text-foreground truncate">
                            Midnight Echoes
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.panelTrackMeta}
                          </p>
                        </div>
                        <div
                          className="flex items-center gap-1 px-2 py-1 rounded-full"
                          style={{
                            background: "oklch(0.85 0.22 340 / 0.12)",
                            border: "1px solid oklch(0.85 0.22 340 / 0.35)",
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full animate-pulse"
                            style={{
                              background: "oklch(0.85 0.22 340)",
                              boxShadow: "0 0 6px oklch(0.85 0.22 340)",
                            }}
                          />
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color: "oklch(0.85 0.22 340)" }}
                          >
                            Live
                          </span>
                        </div>
                      </div>

                      {/* Soundwave */}
                      <div className="flex items-end gap-[3px] h-8 mt-4">
                        {[40, 65, 35, 80, 55, 90, 45, 70, 60, 85, 50, 75, 40, 65, 95, 55, 70, 45, 80, 60, 50, 85, 65, 40].map((h, i) => (
                          <span
                            key={i}
                            className="flex-1 rounded-sm wave-bar"
                            style={{
                              height: `${h}%`,
                              background:
                                "linear-gradient(to top, #8B5CF6, oklch(0.85 0.22 340))",
                              boxShadow: "0 0 4px oklch(0.85 0.22 340 / 0.6)",
                              animationDelay: `${i * 0.06}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Vertical timeline — 3 stages */}
                    <div className="relative pl-7">
                      {/* connecting line */}
                      <div
                        className="absolute left-[10px] top-2 bottom-2 w-px"
                        style={{
                          background:
                            "linear-gradient(to bottom, oklch(0.85 0.22 340), #8B5CF6, oklch(0.55 0.3 280 / 0.3))",
                        }}
                      />

                      {c.timeline.map((it, idx) => ({
                        Icon: [ShieldCheck, Globe2, TrendingUp][idx],
                        label: it.label,
                        value: it.value,
                        meta: it.meta,
                        done: idx < 2,
                      })).map(({ Icon, label, value, meta, done }, i) => (
                        <div
                          key={label}
                          className="relative mb-4 last:mb-0"
                          style={{
                            animation: "landing-orb-float 6s ease-in-out infinite",
                            animationDelay: `${i * 0.4}s`,
                          }}
                        >
                          {/* node */}
                          <div
                            className="absolute -left-7 top-1 h-5 w-5 rounded-full flex items-center justify-center"
                            style={{
                              background: done
                                ? "linear-gradient(135deg, #8B5CF6, oklch(0.68 0.27 322))"
                                : "oklch(0.18 0.1 320 / 0.6)",
                              border: "2px solid oklch(0.06 0.03 300)",
                              boxShadow: done
                                ? "0 0 14px oklch(0.85 0.22 340)"
                                : "0 0 8px oklch(0.85 0.22 340 / 0.4)",
                            }}
                          >
                            {done && (
                              <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>

                          <div
                            className="rounded-xl px-4 py-3 flex items-center gap-3"
                            style={{
                              background: "oklch(0.13 0.05 300 / 0.55)",
                              border: "1px solid oklch(0.85 0.22 340 / 0.18)",
                            }}
                          >
                            <div
                              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background:
                                  "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.35), oklch(0.55 0.3 280 / 0.25))",
                                border: "1px solid oklch(0.85 0.22 340 / 0.3)",
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{ color: "oklch(0.85 0.22 340)" }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {label}
                              </p>
                              <p className="text-xs font-semibold text-foreground truncate">
                                {value}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {meta}
                              </p>
                            </div>
                            {done ? (
                              <span
                                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                style={{
                                  color: "oklch(0.85 0.22 340)",
                                  background: "oklch(0.85 0.22 340 / 0.12)",
                                  border: "1px solid oklch(0.85 0.22 340 / 0.3)",
                                }}
                              >
                                {c.badgeOk}
                              </span>
                            ) : (
                              <span
                                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse"
                                style={{
                                  color: "oklch(0.95 0.05 340)",
                                  background:
                                    "linear-gradient(135deg, #8B5CF6, oklch(0.68 0.27 322))",
                                }}
                              >
                                {c.badgeActive}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>


          {/* ============================= SERVICES ============================= */}
          <section id="servicios" className="relative py-24">
            <div className="mx-auto max-w-6xl px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <p
                  className="text-xs uppercase tracking-[0.28em] mb-4 font-semibold"
                  style={{ color: "oklch(0.85 0.22 340)" }}
                >
                  {c.servicesEyebrow}
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground">
                  {c.servicesTitle1}{" "}
                  <span className="text-gradient-brand">{c.servicesTitleAccent}</span>
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {c.services.map(({ sub, title, desc }, idx) => {
                  const Icon = SERVICE_ICONS[idx];
                  return (
                  <div key={title} className="group relative glass card-hover rounded-2xl p-7">
                    <div
                      className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6 transition-transform group-hover:scale-110"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.25), oklch(0.55 0.3 280 / 0.18))",
                        border: "1px solid oklch(0.68 0.27 322 / 0.35)",
                        boxShadow: "0 0 30px -8px oklch(0.68 0.27 322 / 0.6)",
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: "oklch(0.85 0.22 340)" }} />
                    </div>

                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2 font-semibold">
                      {sub}
                    </p>
                    <h3 className="font-display font-bold text-xl text-foreground mb-3 leading-tight">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                  );
                })}
              </div>

              {/* platforms ribbon */}
              <div className="mt-16 glass rounded-2xl px-6 py-5">
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                    {c.distributeIn}
                  </span>
                  {PLATFORMS.map((p) => (
                    <span
                      key={p}
                      className="text-sm text-foreground/80 font-medium inline-flex items-center gap-1.5"
                    >
                      <Music2 className="h-3.5 w-3.5" style={{ color: "oklch(0.85 0.22 340)" }} />
                      {p}
                    </span>
                  ))}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.85 0.22 340)" }}
                  >
                    {c.morePlatforms}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================= TESTIMONIOS / RESEÑAS ============================= */}
          <section id="testimonios" className="relative py-24">
            <div className="mx-auto max-w-5xl px-6">
              <div className="text-center mb-12">
                <p
                  className="text-xs uppercase tracking-[0.28em] mb-4 font-semibold"
                  style={{ color: "oklch(0.85 0.22 340)" }}
                >
                  {c.testimonialsEyebrow}
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-4">
                  {c.testimonialsTitle1} <span className="text-gradient-brand">{c.testimonialsTitleAccent}</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  {c.testimonialsSubtitle}
                </p>
              </div>
              <div className="relative mx-auto max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-border/40">
                <video
                  src="/videos/testimonio-0528.mp4"
                  poster={testimonioPoster}
                  controls
                  playsInline
                  preload="none"
                  className="w-full h-auto block"
                />

              </div>
            </div>
          </section>

          {/* ============================= REGISTRO / DERECHOS DE AUTOR ============================= */}
          <section id="registro" className="relative py-24">

            <div className="mx-auto max-w-6xl px-6">
              <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
                {/* Visual */}
                <div className="relative order-2 lg:order-1">
                  <div
                    className="absolute -inset-10 rounded-[2rem] blur-3xl opacity-60 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, oklch(0.68 0.27 322 / 0.55), transparent 60%), radial-gradient(circle at 80% 80%, #8B5CF6 0%, transparent 55%)",
                    }}
                  />
                  <div
                    className="relative glass rounded-[1.75rem] p-7 z-10"
                    style={{
                      border: "1px solid oklch(0.85 0.22 340 / 0.25)",
                      boxShadow: "0 40px 80px -30px #8B5CF6",
                    }}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" style={{ color: "oklch(0.85 0.22 340)" }} />
                        <span className="text-xs uppercase tracking-[0.22em] text-foreground/80 font-semibold">
                          {c.certTitle}
                        </span>
                      </div>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
                        style={{
                          color: "oklch(0.85 0.22 340)",
                          background: "oklch(0.85 0.22 340 / 0.12)",
                          border: "1px solid oklch(0.85 0.22 340 / 0.3)",
                        }}
                      >
                        {c.certVerified}
                      </span>
                    </div>

                    <div
                      className="rounded-xl px-4 py-3 mb-4 font-mono text-[11px] break-all"
                      style={{
                        background: "oklch(0.13 0.05 300 / 0.55)",
                        border: "1px solid oklch(0.85 0.22 340 / 0.18)",
                        color: "oklch(0.85 0.22 340)",
                      }}
                    >
                      0x9f3a · 4c12 · 8b7e · d215 · a6f0 · 7e93 · cb14
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {c.certFields.map(({ k, v }) => (
                        <div
                          key={k}
                          className="rounded-lg px-3 py-2"
                          style={{
                            background: "oklch(0.13 0.05 300 / 0.4)",
                            border: "1px solid oklch(0.85 0.22 340 / 0.12)",
                          }}
                        >
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</p>
                          <p className="text-xs font-semibold text-foreground">{v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" style={{ color: "oklch(0.85 0.22 340)" }} />
                      {c.certBerne}
                    </div>
                  </div>
                </div>

                {/* Copy */}
                <div className="order-1 lg:order-2">
                  <p
                    className="text-xs uppercase tracking-[0.28em] mb-4 font-semibold"
                    style={{ color: "oklch(0.85 0.22 340)" }}
                  >
                    {c.regEyebrow}
                  </p>
                  <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-5">
                    {c.regTitle1} <span className="text-gradient-brand">{c.regTitleAccent}</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-7 max-w-xl">
                    {c.regDesc}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {c.regBullets.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-foreground/85">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#pricing-section"
                    className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                  >
                    {c.regCta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ============================= DISTRIBUCIÓN ============================= */}
          <section id="distribucion" className="relative py-24">
            <div className="mx-auto max-w-6xl px-6">
              <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
                <div>
                  <p
                    className="text-xs uppercase tracking-[0.28em] mb-4 font-semibold"
                    style={{ color: "oklch(0.85 0.22 340)" }}
                  >
                    {c.distEyebrow}
                  </p>
                  <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-5">
                    {c.distTitle1} <span className="text-gradient-brand">{c.distTitleAccent}</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-7 max-w-xl">
                    {c.distDesc}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {c.distBullets.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-foreground/85">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#pricing-section"
                    className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                  >
                    {c.distCta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="relative">
                  {/* Royalties badge — eye-catching graphic */}
                  <div
                    className="absolute -top-6 -right-4 sm:-top-8 sm:-right-8 z-30 rotate-[8deg] animate-fade-in"
                    style={{ animation: "landing-orb-float 5s ease-in-out infinite" }}
                  >
                    <div
                      className="relative rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #8B5CF6 0%, oklch(0.68 0.27 322) 60%, oklch(0.85 0.22 340) 100%)",
                        boxShadow:
                          "0 20px 50px -10px oklch(0.68 0.27 322 / 0.7), 0 0 0 1px oklch(1 0 0 / 0.15) inset",
                        border: "2px solid oklch(1 0 0 / 0.2)",
                      }}
                    >
                      <div
                        className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
                        style={{
                          background:
                            "repeating-linear-gradient(45deg, transparent 0 6px, oklch(1 0 0 / 0.15) 6px 12px)",
                        }}
                      />
                      <p className="relative text-[10px] uppercase tracking-[0.2em] font-semibold text-page-fg">
                        {c.royaltiesBadgeTop}
                      </p>
                      <p className="relative text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground mt-1">
                        {c.royaltiesBadgeBottom}
                      </p>
                    </div>
                  </div>

                  <div
                    className="absolute -inset-10 rounded-[2rem] blur-3xl opacity-60 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 50%, #8B5CF6 0%, transparent 60%)",
                    }}
                  />
                  <div
                    className="relative glass rounded-[1.75rem] p-6 z-10"
                    style={{
                      border: "1px solid oklch(0.85 0.22 340 / 0.25)",
                      boxShadow: "0 40px 80px -30px #8B5CF6",
                    }}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-5 w-5" style={{ color: "oklch(0.85 0.22 340)" }} />
                        <span className="text-xs uppercase tracking-[0.22em] text-foreground/80 font-semibold">
                          {c.releaseTitle}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{c.releaseStatus}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Spotify", color: "#1DB954" },
                        { name: "Apple Music", color: "#FA243C" },
                        { name: "TikTok", color: "#25F4EE" },
                        { name: "YouTube Music", color: "#FF0033" },
                        { name: "Amazon Music", color: "#00A8E1" },
                      ].map(({ name, color }) => (
                        <div
                          key={name}
                          className="rounded-xl px-3 py-3 flex items-center gap-3"
                          style={{
                            background: "oklch(0.13 0.05 300 / 0.55)",
                            border: "1px solid oklch(0.85 0.22 340 / 0.18)",
                          }}
                        >
                          <span
                            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: `${color}22`,
                              border: `1px solid ${color}55`,
                            }}
                          >
                            <Disc3 className="h-4 w-4" style={{ color }} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.platformActive}</p>
                          </div>
                          <CheckCircle2 className="h-4 w-4" style={{ color: "oklch(0.85 0.22 340)" }} />
                        </div>
                      ))}
                    </div>

                    <div
                      className="mt-4 rounded-xl px-4 py-3 text-center text-[11px] font-semibold"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.2), oklch(0.55 0.3 280 / 0.15))",
                        border: "1px solid oklch(0.85 0.22 340 / 0.25)",
                        color: "oklch(0.85 0.22 340)",
                      }}
                    >
                      + 215 más
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <RoyaltiesCalculator />

          {/* ============================= PROMOCIÓN TIKTOK/INSTAGRAM ============================= */}
          <section id="promocion" className="relative py-24">
            <div className="mx-auto max-w-6xl px-6">
              <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
                <div className="relative order-2 lg:order-1">
                  <div
                    className="absolute -inset-10 rounded-[2rem] blur-3xl opacity-60 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 70%, oklch(0.68 0.27 322 / 0.5), transparent 60%), radial-gradient(circle at 80% 20%, #25F4EE55, transparent 55%)",
                    }}
                  />
                  <div className="relative grid grid-cols-2 gap-4 z-10">
                    <div
                      className="glass rounded-[1.5rem] p-4 flex flex-col"
                      style={{
                        border: "1px solid oklch(0.85 0.22 340 / 0.25)",
                        boxShadow: "0 30px 60px -25px #E1306C",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="h-7 w-7 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)",
                          }}
                        >
                          <Heart className="h-3.5 w-3.5 text-primary-foreground" />
                        </span>
                        <a
                          href="https://www.instagram.com/musicdibs/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-foreground hover:underline"
                        >
                          @musicdibs
                        </a>
                      </div>
                      <div
                        className="aspect-[3/4] rounded-xl mb-3 overflow-hidden relative flex items-center justify-center"
                        style={{
                          background: "oklch(0.13 0.05 300 / 0.4)",
                        }}
                      >
                        <img
                          src={urbanArtistInstagram}
                          alt={c.altInstagram}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" style={{ color: "#DD2A7B" }} /> 12.4k
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> 3.2k
                        </span>
                      </div>
                    </div>

                    <div
                      className="glass rounded-[1.5rem] p-4 flex flex-col"
                      style={{
                        border: "1px solid oklch(0.85 0.22 340 / 0.25)",
                        boxShadow: "0 30px 60px -25px #25F4EE",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="h-7 w-7 rounded-lg flex items-center justify-center"
                          style={{ background: "#0a0a0a", border: "1px solid #25F4EE" }}
                        >
                          <Music2 className="h-3.5 w-3.5" style={{ color: "#25F4EE" }} />
                        </span>
                        <a
                          href="https://www.tiktok.com/@musicdibs_"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-foreground hover:underline"
                        >
                          @musicdibs_
                        </a>
                      </div>
                      <div
                        className="aspect-[3/4] rounded-xl mb-3 overflow-hidden relative flex items-center justify-center"
                        style={{
                          background: "oklch(0.13 0.05 300 / 0.4)",
                        }}
                      >
                        <img
                          src={urbanArtistTiktok}
                          alt={c.altTiktok}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" style={{ color: "#25F4EE" }} /> 48.2k
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> 9.1k
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <p
                    className="text-xs uppercase tracking-[0.28em] mb-4 font-semibold"
                    style={{ color: "oklch(0.85 0.22 340)" }}
                  >
                    {c.promoEyebrow}
                  </p>
                  <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-5">
                    {c.promoTitle1} <span className="text-gradient-brand">{c.promoTitleAccent}</span>
                  </h2>

                  {/* Badge viral */}
                  <div className="inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 mb-6 border"
                    style={{
                      background: "linear-gradient(135deg, #F58529 0%, #DD2A7B 35%, #8134AF 65%, #25F4EE 100%)",
                      borderColor: "oklch(1 0 0 / 0.25)",
                      boxShadow: "0 12px 30px -8px oklch(0.68 0.27 322 / 0.45)",
                    }}
                  >
                    <span
                      className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: "oklch(1 0 0 / 0.15)" }}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="white">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </span>
                    <span
                      className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: "oklch(1 0 0 / 0.15)" }}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="white">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.88 2.88 0 112.88-2.88V9.39a6.37 6.37 0 003.63 1.15V7.53a4.83 4.83 0 003.59-1.84z"/>
                      </svg>
                    </span>
                    <span className="text-sm font-bold text-primary-foreground leading-snug">
                      {c.promoBadge}
                    </span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed mb-7 max-w-xl">
                    {c.promoDesc}
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3 text-sm text-foreground/85">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                      <span>
                        {c.promoBulletPublish.pre}{" "}
                        <a
                          href="https://www.instagram.com/musicdibs/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: "oklch(0.85 0.22 340)" }}
                        >
                          @musicdibs
                        </a>{" "}
                        {c.promoBulletPublish.mid}{" "}
                        <a
                          href="https://www.tiktok.com/@musicdibs_"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: "oklch(0.85 0.22 340)" }}
                        >
                          @musicdibs_
                        </a>{" "}
                        {c.promoBulletPublish.post}
                      </span>
                    </li>
                    {c.promoBullets.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-foreground/85">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#pricing-section"
                    className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                  >
                    Promocionar mi música
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <PricingSection />

          <SocialBanner />
          <Footer />
        </main>
      </div>
    </>
  );
}
