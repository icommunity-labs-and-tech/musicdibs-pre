import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocalizedRoute } from "@/components/LocalizedRoute";
import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import "@/styles/landing-ai-studio.css";
import { usePromocionMusicalCopy } from "@/i18nPromocionMusical";
import { RoyaltiesCalculator } from "@/components/RoyaltiesCalculator";
import { BackgroundScene } from "@/components/landing/BackgroundScene";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import {
  Heart,
  Share2,
  MessageCircle,
  Upload,
  Megaphone,
  Sparkles,
  Wand2,
  Globe2,
  ShieldCheck,
  Music2,
  Instagram,
  Eye,
  Radio,
  Headphones,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Mic2,
  Image as ImageIcon,
  Users,
  FileMusic,
  Scale,
} from "lucide-react";


const CTA_HREF = "https://musicdibs.com/dashboard";

export default function PromocionMusical() {
  const t = usePromocionMusicalCopy();
  const localizedRoute = useLocalizedRoute();
  const { i18n } = useTranslation();
  const uiLang = (["es", "en", "pt-BR"].includes(i18n.language) ? i18n.language : "es");
  const htmlLang = localizedRoute?.lang ?? uiLang;
  const canonical = `https://musicdibs.com${localizedRoute?.prefix ?? ""}/promocion-musical`;
  return (
    <>
      <Helmet>
        <html lang={htmlLang} />
        <title>{t.seo.title}</title>
        <meta
          name="description"
          content={t.seo.description}
        />
        <meta property="og:title" content={t.seo.ogTitle} />
        <meta
          property="og:description"
          content={t.seo.ogDescription}
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>

      <div className="landing-ai-studio">
        <main className="relative min-h-screen overflow-hidden">
          <BackgroundScene />
          <Navbar ctaText={t.navbar.cta} ctaHref={CTA_HREF} />

          {/* HERO — Dual Powerhouse */}
          <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24">
            <div
              className="pointer-events-none absolute -top-10 -left-32 h-[32rem] w-[32rem] rounded-full blur-[120px] opacity-70"
              style={{ background: "radial-gradient(circle, oklch(0.68 0.27 322 / 0.55), transparent 70%)" }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-40 -right-28 h-[28rem] w-[28rem] rounded-full blur-[120px] opacity-60"
              style={{ background: "radial-gradient(circle, oklch(0.7 0.25 195 / 0.45), transparent 70%)" }}
              aria-hidden
            />

            <div className="relative mx-auto max-w-7xl px-6">
              <div className="flex justify-center animate-fade-in">
                <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium tracking-wide text-foreground/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "oklch(0.78 0.25 322)" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "oklch(0.78 0.25 322)" }} />
                  </span>
                  {t.hero.badge}
                </span>
              </div>

              <h1
                className="mt-7 text-center font-display font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl leading-[1.02] max-w-5xl mx-auto animate-fade-in"
                style={{ textWrap: "balance" as any }}
              >
                {t.hero.titleA}{" "}
                <span className="text-gradient-brand">{t.hero.titleB}</span>
              </h1>
              <p className="mt-6 text-center text-base sm:text-lg text-foreground/75 max-w-3xl mx-auto leading-relaxed">
                {t.hero.subtitle.split("{platforms}")[0]}<strong className="text-foreground">{t.hero.platforms}</strong>{t.hero.subtitle.split("{platforms}")[1].split("{followers}")[0]}{" "}
                <strong className="text-foreground">{t.hero.followers}</strong>{t.hero.subtitle.split("{followers}")[1]}
              </p>

              {/* CTA */}
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-magenta inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold"
                >
                  {t.hero.cta}
                </a>
              </div>

              {/* Escena dual: Distribución | Promoción */}
              <div className="relative mt-16 mx-auto max-w-6xl grid lg:grid-cols-2 gap-6 lg:gap-4">
                {/* LADO IZQ — Distribución global */}
                <div className="relative glass rounded-3xl p-7 sm:p-9 overflow-hidden min-h-[420px]">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ background: "oklch(0.7 0.25 195 / 0.15)", color: "oklch(0.85 0.22 195)", border: "1px solid oklch(0.7 0.25 195 / 0.3)" }}>
                    <Globe2 className="h-3 w-3" /> {t.hero.distribution.badge}
                  </span>
                  <h3 className="mt-4 font-display font-bold text-2xl sm:text-3xl leading-tight">{t.hero.distribution.title}</h3>

                  {/* Globo con anillos */}
                  <div className="relative mt-6 h-56 flex items-center justify-center" aria-hidden>
                    <div className="absolute h-44 w-44 rounded-full border border-page-border" style={{ animation: "spin-slow 22s linear infinite" }} />
                    <div className="absolute h-60 w-60 rounded-full border border-page-border" />
                    <div
                      className="relative h-32 w-32 rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle at 30% 30%, oklch(0.6 0.22 195), oklch(0.25 0.12 240))",
                        boxShadow: "0 0 60px -6px oklch(0.7 0.25 195 / 0.7), inset -10px -10px 30px oklch(0 0 0 / 0.5)",
                      }}
                    >
                      <Globe2 className="h-12 w-12 text-page-fg" />
                    </div>

                    {/* Logos plataformas flotantes */}
                    <PlatformPill className="left-2 top-2" label="Spotify" color="#1DB954" delay="0s" />
                    <PlatformPill className="right-2 top-6" label="Apple Music" color="#fa57c1" delay="0.2s" />
                    <PlatformPill className="left-4 bottom-2" label="TikTok" color="#22d3ee" delay="0.4s" />
                    <PlatformPill className="right-4 bottom-6" label="Amazon" color="#ffb84d" delay="0.6s" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.hero.distribution.chips.map((chip) => (
                      <span key={chip} className="text-[11px] px-2.5 py-1 rounded-full glass text-foreground/75">{chip}</span>
                    ))}
                  </div>
                </div>

                {/* LADO DER — Promoción orgánica */}
                <div className="relative glass rounded-3xl p-7 sm:p-9 overflow-hidden min-h-[420px] glow-magenta">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ background: "oklch(0.68 0.27 322 / 0.18)", color: "oklch(0.85 0.25 322)", border: "1px solid oklch(0.68 0.27 322 / 0.35)" }}>
                    <Instagram className="h-3 w-3" /> {t.hero.promotion.badge}
                  </span>
                  <h3 className="mt-4 font-display font-bold text-2xl sm:text-3xl leading-tight">{t.hero.promotion.title}</h3>

                  {/* Disco + engagement */}
                  <div className="relative mt-6 h-56 flex items-center justify-center" aria-hidden>
                    <div
                      className="relative h-32 w-32 rounded-full flex items-center justify-center"
                      style={{
                        background: "conic-gradient(from 0deg, oklch(0.2 0.1 320), oklch(0.15 0.08 285), oklch(0.22 0.12 340), oklch(0.18 0.1 300), oklch(0.2 0.1 320))",
                        boxShadow: "0 0 60px -6px oklch(0.68 0.27 322 / 0.7), inset 0 0 30px oklch(0 0 0 / 0.6)",
                        animation: "spin-slow 16s linear infinite",
                      }}
                    >
                      <div className="absolute inset-3 rounded-full border border-page-border" />
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))" }}
                      >
                        <Music2 className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>

                    {/* Pills engagement */}
                    <EngagePill className="left-1 top-2" icon={<Heart className="h-3.5 w-3.5" fill="currentColor" />} label="142,4k" tone="rose" delay="0s" />
                    <EngagePill className="right-1 top-8" icon={<Share2 className="h-3.5 w-3.5" />} label="8,7k" tone="violet" delay="0.2s" />
                    <EngagePill className="left-2 bottom-4" icon={<Eye className="h-3.5 w-3.5" />} label="2,1M" tone="cyan" delay="0.4s" />
                    <EngagePill className="right-2 bottom-2" icon={<MessageCircle className="h-3.5 w-3.5" />} label="+12k" tone="magenta" delay="0.6s" />
                  </div>

                  {/* Waveform */}
                  <div className="mt-3 flex items-end justify-center gap-1 h-8 opacity-70" aria-hidden>
                    {Array.from({ length: 28 }).map((_, i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full"
                        style={{
                          height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%`,
                          background: "linear-gradient(180deg, oklch(0.78 0.25 322), oklch(0.55 0.28 285))",
                          animation: `wave 1.4s ease-in-out ${i * 0.05}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <style>{`
              @keyframes spin-slow { to { transform: rotate(360deg); } }
              @keyframes wave { from { transform: scaleY(0.5); } to { transform: scaleY(1.1); } }
              @keyframes float-soft { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            `}</style>
          </section>

          {/* THE TWO PILLARS — Editorial stat-first */}
          {/* THE TWO PILLARS — Editorial split rows */}
          <section className="relative py-24 sm:py-32 overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 left-1/4 h-[26rem] w-[26rem] rounded-full blur-[140px] opacity-40"
              style={{ background: "radial-gradient(circle, oklch(0.7 0.25 195 / 0.4), transparent 70%)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 right-1/4 h-[26rem] w-[26rem] rounded-full blur-[140px] opacity-40"
              style={{ background: "radial-gradient(circle, oklch(0.68 0.27 322 / 0.45), transparent 70%)" }}
            />

            <div className="relative mx-auto max-w-6xl px-6">
              {/* Section header */}
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.78 0.25 322)" }} />
                  {t.pillars.badge}
                </span>
                <h2 className="mt-6 font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
                  {t.pillars.titleA} <span className="text-gradient-brand">{t.pillars.titleHighlight}</span><br className="hidden sm:block" /> {t.pillars.titleB}
                </h2>
                <p className="mt-5 text-base sm:text-lg text-foreground/70 max-w-xl">
                  {t.pillars.subtitle}
                  <span className="text-foreground"> {t.pillars.subtitleHighlight}</span>
                </p>
              </div>

              {/* Pillar rows */}
              <div className="mt-16 sm:mt-20 space-y-px rounded-3xl overflow-hidden border border-page-border bg-primary-foreground/[0.02] backdrop-blur-sm">
                {/* ── ROW 01 · Distribución ── */}
                <article className="relative grid grid-cols-12 gap-0">
                  <div className="col-span-12 lg:col-span-2 flex lg:flex-col items-center lg:items-start justify-between lg:justify-start gap-4 px-8 py-8 lg:py-12 border-b lg:border-b-0 lg:border-r border-page-border">
                    <span className="font-display font-black text-6xl lg:text-7xl leading-none tracking-tight"
                      style={{ background: "linear-gradient(135deg, oklch(0.85 0.22 195), oklch(0.55 0.2 230))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      01
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ background: "oklch(0.7 0.25 195 / 0.12)", color: "oklch(0.88 0.18 195)", border: "1px solid oklch(0.7 0.25 195 / 0.3)" }}>
                      <Globe2 className="h-3 w-3" /> {t.pillars.row1.badge}
                    </span>
                  </div>

                  <div className="col-span-12 lg:col-span-6 px-8 py-10 lg:py-12 border-b lg:border-b-0 lg:border-r border-page-border">
                    <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight">
                      {t.pillars.row1.title}
                    </h3>
                    <p className="mt-3 text-foreground/70 leading-relaxed">
                      {t.pillars.row1.description.split("{platforms}")[0]}<span className="text-foreground font-medium">{t.pillars.row1.platforms}</span>{t.pillars.row1.description.split("{platforms}")[1].split("{royalties}")[0]}
                      <span className="text-foreground font-medium"> {t.pillars.row1.royalties}</span>{t.pillars.row1.description.split("{royalties}")[1]}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
                      <div>
                        <div className="font-display font-bold text-2xl" style={{ color: "oklch(0.85 0.22 195)" }}>{t.pillars.row1.stat1Value}</div>
                        <div className="text-[11px] uppercase tracking-wider text-foreground/55 mt-0.5">{t.pillars.row1.stat1Label}</div>
                      </div>
                      <div className="h-10 w-px bg-page-surface self-center" aria-hidden />
                      <div>
                        <div className="font-display font-bold text-2xl" style={{ color: "oklch(0.85 0.22 195)" }}>{t.pillars.row1.stat2Value}</div>
                        <div className="text-[11px] uppercase tracking-wider text-foreground/55 mt-0.5">{t.pillars.row1.stat2Label}</div>
                      </div>
                      <div className="h-10 w-px bg-page-surface self-center" aria-hidden />
                      <div>
                        <div className="font-display font-bold text-2xl" style={{ color: "oklch(0.85 0.22 195)" }}>{t.pillars.row1.stat3Value}</div>
                        <div className="text-[11px] uppercase tracking-wider text-foreground/55 mt-0.5">{t.pillars.row1.stat3Label}</div>
                      </div>
                    </div>

                    <ul className="mt-6 space-y-2 text-sm text-foreground/75">
                      {t.pillars.row1.features.map((f) => (
                        <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.78 0.22 195)" }} /> {f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="col-span-12 lg:col-span-4 relative min-h-[260px] lg:min-h-[360px] overflow-hidden"
                    style={{ background: "radial-gradient(ellipse at center, oklch(0.7 0.25 195 / 0.14), transparent 70%)" }}>
                    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
                      <div className="absolute h-44 w-44 rounded-full border border-info/15" style={{ animation: "spin-slow 28s linear infinite" }} />
                      <div className="absolute h-60 w-60 rounded-full border border-info/10" style={{ animation: "spin-slow 40s linear infinite reverse" }} />
                      <div className="absolute h-72 w-72 rounded-full border border-info/5" />
                      <div
                        className="relative h-20 w-20 rounded-full flex items-center justify-center"
                        style={{
                          background: "radial-gradient(circle at 30% 30%, oklch(0.75 0.2 195), oklch(0.3 0.15 240))",
                          boxShadow: "0 0 50px -4px oklch(0.7 0.25 195 / 0.8), inset -8px -8px 22px oklch(0 0 0 / 0.55)",
                        }}
                      >
                        <Globe2 className="h-9 w-9 text-page-fg" />
                      </div>
                      <PlatformPill className="left-[8%] top-[14%]" label="Spotify" color="#1DB954" delay="0s" />
                      <PlatformPill className="right-[8%] top-[22%]" label="Apple Music" color="#fa57c1" delay="0.2s" />
                      <PlatformPill className="left-[10%] bottom-[18%]" label="YouTube" color="#ff4d4d" delay="0.4s" />
                      <PlatformPill className="right-[10%] bottom-[14%]" label="Tidal" color="#22d3ee" delay="0.6s" />
                    </div>
                  </div>
                </article>

                {/* ── ROW 02 · Promoción (flipped) ── */}
                <article className="relative grid grid-cols-12 gap-0 bg-primary-foreground/[0.015]">
                  <div className="col-span-12 lg:col-span-4 lg:order-1 relative min-h-[260px] lg:min-h-[360px] overflow-hidden border-b lg:border-b-0 lg:border-r border-page-border"
                    style={{ background: "radial-gradient(ellipse at center, oklch(0.68 0.27 322 / 0.16), transparent 70%)" }}>
                    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
                      <div
                        className="relative h-24 w-24 rounded-full flex items-center justify-center"
                        style={{
                          background: "conic-gradient(from 0deg, oklch(0.2 0.1 320), oklch(0.15 0.08 285), oklch(0.22 0.12 340), oklch(0.18 0.1 300), oklch(0.2 0.1 320))",
                          boxShadow: "0 0 50px -4px oklch(0.68 0.27 322 / 0.8), inset 0 0 26px oklch(0 0 0 / 0.6)",
                          animation: "spin-slow 14s linear infinite",
                        }}
                      >
                        <div className="absolute inset-3 rounded-full border border-page-border" />
                        <div className="h-9 w-9 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))" }}>
                          <Music2 className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                      <EngagePill className="left-[8%] top-[14%]" icon={<Heart className="h-3.5 w-3.5" fill="currentColor" />} label="142,4k" tone="rose" delay="0s" />
                      <EngagePill className="right-[8%] top-[20%]" icon={<Share2 className="h-3.5 w-3.5" />} label="8,7k" tone="violet" delay="0.2s" />
                      <EngagePill className="left-[10%] bottom-[28%]" icon={<Eye className="h-3.5 w-3.5" />} label="2,1M" tone="cyan" delay="0.4s" />
                      <EngagePill className="right-[10%] bottom-[20%]" icon={<MessageCircle className="h-3.5 w-3.5" />} label="+12k" tone="magenta" delay="0.6s" />
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end justify-center gap-1 h-8 w-[70%] opacity-70">
                        {Array.from({ length: 28 }).map((_, i) => (
                          <span
                            key={i}
                            className="w-1 rounded-full flex-1"
                            style={{
                              height: `${20 + Math.abs(Math.sin(i * 0.6)) * 80}%`,
                              background: "linear-gradient(180deg, oklch(0.8 0.25 322), oklch(0.55 0.28 285))",
                              animation: `wave 1.4s ease-in-out ${i * 0.05}s infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-6 lg:order-2 px-8 py-10 lg:py-12 border-b lg:border-b-0 lg:border-r border-page-border">
                    <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight">
                      {t.pillars.row2.title}
                    </h3>
                    <p className="mt-3 text-foreground/70 leading-relaxed">
                      {t.pillars.row2.description.split("{audience}")[0]}<span className="text-foreground font-medium">{t.pillars.row2.audience}</span>{t.pillars.row2.description.split("{audience}")[1]}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
                      <div>
                        <div className="font-display font-bold text-2xl" style={{ color: "oklch(0.82 0.22 322)" }}>{t.pillars.row2.stat1Value}</div>
                        <div className="text-[11px] uppercase tracking-wider text-foreground/55 mt-0.5">{t.pillars.row2.stat1Label}</div>
                      </div>
                      <div className="h-10 w-px bg-page-surface self-center" aria-hidden />
                      <div>
                        <div className="font-display font-bold text-2xl" style={{ color: "oklch(0.82 0.22 322)" }}>{t.pillars.row2.stat2Value}</div>
                        <div className="text-[11px] uppercase tracking-wider text-foreground/55 mt-0.5">{t.pillars.row2.stat2Label}</div>
                      </div>
                      <div className="h-10 w-px bg-page-surface self-center" aria-hidden />
                      <div>
                        <div className="font-display font-bold text-2xl" style={{ color: "oklch(0.82 0.22 322)" }}>{t.pillars.row2.stat3Value}</div>
                        <div className="text-[11px] uppercase tracking-wider text-foreground/55 mt-0.5">{t.pillars.row2.stat3Label}</div>
                      </div>
                    </div>

                    <ul className="mt-6 space-y-2 text-sm text-foreground/75">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.78 0.22 322)" }} />
                        <span>
                          {t.pillars.row2.instagramPrefix} <a href="https://www.instagram.com/musicdibs/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">{t.pillars.row2.instagramHandle}</a>
                          {" "}{t.pillars.row2.tiktokPrefix} <a href="https://www.tiktok.com/@musicdibs_" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">{t.pillars.row2.tiktokHandle}</a>
                        </span>
                      </li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.78 0.22 322)" }} /> {t.pillars.row2.feature2}</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.78 0.22 322)" }} /> {t.pillars.row2.feature3}</li>
                    </ul>
                  </div>

                  <div className="col-span-12 lg:col-span-2 lg:order-3 flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 px-8 py-8 lg:py-12 lg:text-right">
                    <span className="font-display font-black text-6xl lg:text-7xl leading-none tracking-tight"
                      style={{ background: "linear-gradient(135deg, oklch(0.82 0.25 322), oklch(0.55 0.28 285))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      02
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ background: "oklch(0.68 0.27 322 / 0.14)", color: "oklch(0.88 0.22 322)", border: "1px solid oklch(0.68 0.27 322 / 0.32)" }}>
                      <Megaphone className="h-3 w-3" /> {t.pillars.row2.badge}
                    </span>
                  </div>
                </article>
              </div>

              {/* CTA inline */}
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-magenta inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                >
                  {t.pillars.cta} <ArrowRight className="h-4 w-4" />
                </a>
                <span className="text-xs text-foreground/55">{t.pillars.ctaNote}</span>
              </div>
            </div>

            <style>{`
              @keyframes spin-slow { to { transform: rotate(360deg); } }
              @keyframes wave { from { transform: scaleY(0.45); } to { transform: scaleY(1.1); } }
            `}</style>
          </section>

          <RoyaltiesCalculator />

          {/* ECOSYSTEM */}
          <section
            className="relative py-14 sm:py-18"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.98 0.01 295 / 0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(0.98 0.01 295 / 0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          >
            <div className="mx-auto max-w-6xl px-6">
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-foreground/80">
                  {t.ecosystem.badge}
                </span>
                <h2 className="mt-5 font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl">
                  {t.ecosystem.titleA}{" "}
                  <span className="text-gradient-brand">{t.ecosystem.titleHighlight}</span>
                </h2>
                <p className="mt-4 text-foreground/70">
                  {t.ecosystem.subtitle}
                </p>
              </div>

              {/* === Features carousel — one slide per funcionalidad === */}
              <div className="mt-8">
                <FeaturesCarousel />
              </div>




              {/* CTA inline */}
              <div className="mt-10 text-center">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors"
                >
                  {t.ecosystem.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

            </div>
          </section>

          {/* FINAL CTA */}
          <section className="relative py-28 sm:py-36">
            <div className="mx-auto max-w-4xl px-6 text-center">
              <h2
                className="font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.1]"
                style={{ textWrap: "balance" as any }}
              >
                {t.finalCta.titleA}{" "}
                <span className="text-gradient-brand">{t.finalCta.titleHighlight}</span>{t.finalCta.titleEnd}
              </h2>
              <p className="mt-5 text-foreground/70 text-lg max-w-xl mx-auto">
                {t.finalCta.subtitle}
              </p>
              <div className="mt-9">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-magenta inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold"
                >
                  {t.finalCta.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>

          <Footer />
        </main>
      </div>
    </>
  );
}

function Pillar({
  accent,
  badge,
  badgeIcon,
  title,
  desc,
  features,
  icon,
}: {
  accent: "cyan" | "magenta";
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  desc: string;
  features: React.ReactNode[];
  icon: React.ReactNode;
}) {
  const cyan = accent === "cyan";
  const grad = cyan
    ? "linear-gradient(135deg, oklch(0.7 0.22 195), oklch(0.55 0.2 220))"
    : "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))";
  const glow = cyan
    ? "0 0 32px -6px oklch(0.7 0.22 195 / 0.55)"
    : "0 0 32px -6px oklch(0.68 0.27 322 / 0.65)";
  const badgeBg = cyan
    ? { background: "oklch(0.7 0.25 195 / 0.15)", color: "oklch(0.85 0.22 195)", border: "1px solid oklch(0.7 0.25 195 / 0.3)" }
    : { background: "oklch(0.68 0.27 322 / 0.18)", color: "oklch(0.85 0.25 322)", border: "1px solid oklch(0.68 0.27 322 / 0.35)" };

  return (
    <div
      className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden card-hover"
      style={{ boxShadow: glow }}
    >
      <div className="flex items-start gap-4">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center text-primary-foreground shrink-0"
          style={{ background: grad, boxShadow: glow }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider" style={badgeBg}>
            {badgeIcon} {badge}
          </span>
          <h3 className="mt-3 font-display font-bold text-2xl sm:text-3xl leading-tight">{title}</h3>
        </div>
      </div>

      <p className="mt-5 text-foreground/75 leading-relaxed">{desc}</p>

      <ul className="mt-6 space-y-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: cyan ? "oklch(0.78 0.22 195)" : "oklch(0.82 0.25 322)" }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PillarEditorial({
  number,
  badge,
  badgeIcon,
  title,
  desc,
  stat,
  statLabel,
  secondaryStat,
  secondaryLabel,
  features,
  accentClass,
  glowColor,
  icon,
  visual,
}: {
  number: string;
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  desc: string;
  stat: string;
  statLabel: string;
  secondaryStat: string;
  secondaryLabel: string;
  features: React.ReactNode[];
  accentClass: string;
  glowColor: string;
  icon: React.ReactNode;
  visual?: React.ReactNode;
}) {
  return (
    <div className="group relative bg-background/40 overflow-hidden transition-colors hover:bg-background/60">
      {/* Accent glow */}
      <div
        aria-hidden
        className={`absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl bg-gradient-to-br ${accentClass} opacity-60 group-hover:opacity-100 transition-opacity duration-700`}
      />

      {/* Visual hero zone */}
      {visual && (
        <div className="relative h-56 sm:h-64 border-b border-page-border overflow-hidden">
          {visual}
        </div>
      )}

      <div className="relative p-8 sm:p-10 lg:p-12">

      {/* Top row: number + icon */}
      <div className="relative flex items-start justify-between">
        <span
          className="font-display font-black text-7xl sm:text-8xl leading-none text-transparent"
          style={{
            WebkitTextStroke: "1px oklch(0.98 0.01 295 / 0.25)",
          }}
        >
          {number}
        </span>
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center text-primary-foreground"
          style={{
            background: "oklch(0.98 0.01 295 / 0.06)",
            border: "1px solid oklch(0.98 0.01 295 / 0.12)",
            boxShadow: `0 0 24px -4px ${glowColor}`,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Badge */}
      <span className="relative mt-6 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/85">
        {badgeIcon} {badge}
      </span>

      {/* Title + desc */}
      <h3 className="relative mt-4 font-display font-bold text-2xl sm:text-3xl leading-tight">
        {title}
      </h3>
      <p className="relative mt-3 text-foreground/70 leading-relaxed text-[15px]">{desc}</p>

      {/* Stats row */}
      <div className="relative mt-8 grid grid-cols-2 gap-4 py-5 border-y border-page-border">
        <div>
          <div className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground">
            {stat}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-foreground/55">
            {statLabel}
          </div>
        </div>
        <div>
          <div className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground">
            {secondaryStat}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-foreground/55">
            {secondaryLabel}
          </div>
        </div>
      </div>

      {/* Features */}
      <ul className="relative mt-6 space-y-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-foreground/60" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

function PlatformPill({
  className = "",
  label,
  color,
  delay = "0s",
}: {
  className?: string;
  label: string;
  color: string;
  delay?: string;
}) {
  return (
    <div
      className={`absolute glass rounded-full px-2.5 py-1.5 flex items-center gap-1.5 ${className}`}
      style={{
        animation: `fade-in 0.7s ease-out ${delay} both, float-soft 5s ease-in-out ${delay} infinite`,
        boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.5)",
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </div>
  );
}

function EngagePill({
  className = "",
  icon,
  label,
  tone,
  delay = "0s",
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  tone: "rose" | "violet" | "cyan" | "magenta";
  delay?: string;
}) {
  const toneColor = {
    rose: "oklch(0.78 0.22 10)",
    violet: "oklch(0.78 0.22 290)",
    cyan: "oklch(0.82 0.18 195)",
    magenta: "oklch(0.85 0.25 322)",
  }[tone];
  return (
    <div
      className={`absolute glass rounded-full px-2.5 py-1.5 flex items-center gap-1.5 ${className}`}
      style={{
        animation: `fade-in 0.7s ease-out ${delay} both, float-soft 5s ease-in-out ${delay} infinite`,
        color: toneColor,
        boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.5)",
      }}
    >
      {icon}
      <span className="text-[11px] font-semibold text-foreground">{label}</span>
    </div>
  );
}

function Step({
  index,
  title,
  icon,
  desc,
}: {
  index: string;
  title: string;
  icon: React.ReactNode;
  desc: string;
}) {
  return (
    <div className="glass rounded-3xl p-7 relative overflow-hidden group transition-transform hover:-translate-y-1">
      <span className="absolute top-4 right-5 text-xs font-bold tracking-widest text-foreground/30">
        {index}
      </span>
      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center text-primary-foreground"
        style={{
          background: "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))",
          boxShadow: "0 0 24px -6px oklch(0.68 0.27 322 / 0.6)",
        }}
      >
        {icon}
      </div>
      <h3 className="mt-5 font-display font-semibold text-xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureHighlight({
  accent,
  badge,
  badgeIcon,
  title,
  desc,
  features,
  icon,
}: {
  accent: "cyan" | "magenta";
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  desc: string;
  features: { icon: React.ReactNode; label: string }[];
  icon: React.ReactNode;
}) {
  const cyan = accent === "cyan";
  const grad = cyan
    ? "linear-gradient(135deg, oklch(0.7 0.22 195), oklch(0.55 0.2 220))"
    : "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))";
  const glow = cyan
    ? "0 0 40px -8px oklch(0.7 0.22 195 / 0.55)"
    : "0 0 40px -8px oklch(0.68 0.27 322 / 0.6)";
  const ringColor = cyan ? "oklch(0.7 0.22 195 / 0.25)" : "oklch(0.68 0.27 322 / 0.3)";
  const badgeBg = cyan
    ? { background: "oklch(0.7 0.25 195 / 0.15)", color: "oklch(0.85 0.22 195)", border: "1px solid oklch(0.7 0.25 195 / 0.3)" }
    : { background: "oklch(0.68 0.27 322 / 0.18)", color: "oklch(0.85 0.25 322)", border: "1px solid oklch(0.68 0.27 322 / 0.35)" };

  return (
    <div
      className="glass relative overflow-hidden rounded-3xl p-7 sm:p-8 card-hover"
      style={{ boxShadow: glow }}
    >
      {/* Decorative blob */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-50"
        style={{ background: grad }}
      />

      <div className="relative flex items-start gap-4">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center text-primary-foreground shrink-0"
          style={{ background: grad, boxShadow: glow }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
            style={badgeBg}
          >
            {badgeIcon} {badge}
          </span>
          <h3 className="mt-3 font-display font-bold text-xl sm:text-2xl leading-tight">{title}</h3>
        </div>
      </div>

      <p className="relative mt-5 text-foreground/75 leading-relaxed text-sm sm:text-base">{desc}</p>

      <ul className="relative mt-6 grid sm:grid-cols-2 gap-2.5">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 rounded-xl bg-primary-foreground/[0.03] px-3 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-primary-foreground/[0.06]"
            style={{ border: `1px solid ${ringColor}` }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: grad }}
            >
              {f.icon}
            </span>
            <span className="leading-tight">{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


function EcoCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 transition-all hover:border-page-border-strong hover:-translate-y-0.5">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground"
        style={{
          background: "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))",
        }}
      >
        {icon}
      </div>
      <h3 className="mt-4 font-display font-semibold text-base text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-foreground/65 leading-relaxed">{desc}</p>
    </div>
  );
}

// === Features carousel: registro + AI Music Studio tools ===
type FeatureSlide = {
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  highlight: string;
  desc: string;
  icon: React.ReactNode;
  bullets: string[];
  accent: "cyan" | "magenta";
};

function useFeatureSlides(): FeatureSlide[] {
  const t = usePromocionMusicalCopy();
  const icons: { badgeIcon: React.ReactNode; icon: React.ReactNode; accent: "cyan" | "magenta" }[] = [
    { badgeIcon: <ShieldCheck className="h-3 w-3" />, icon: <ShieldCheck className="h-7 w-7" />, accent: "cyan" },
    { badgeIcon: <Wand2 className="h-3 w-3" />, icon: <Wand2 className="h-7 w-7" />, accent: "magenta" },
    { badgeIcon: <Upload className="h-3 w-3" />, icon: <Upload className="h-7 w-7" />, accent: "magenta" },
    { badgeIcon: <Headphones className="h-3 w-3" />, icon: <Headphones className="h-7 w-7" />, accent: "magenta" },
    { badgeIcon: <ImageIcon className="h-3 w-3" />, icon: <ImageIcon className="h-7 w-7" />, accent: "magenta" },
    { badgeIcon: <Users className="h-3 w-3" />, icon: <Users className="h-7 w-7" />, accent: "magenta" },
  ];
  return t.slides.map((slide, i) => ({
    badge: slide.badge,
    badgeIcon: icons[i].badgeIcon,
    title: slide.title,
    highlight: slide.highlight,
    desc: slide.desc,
    icon: icons[i].icon,
    bullets: slide.bullets,
    accent: icons[i].accent,
  }));
}

function FeaturesCarousel() {
  const t = usePromocionMusicalCopy();
  const slides = useFeatureSlides();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="relative">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        plugins={[Autoplay({ delay: 20000, stopOnInteraction: true })]}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((s, i) => (
            <CarouselItem key={i}>
              <FeatureSlideCard slide={s} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex left-2 sm:-left-12 bg-background/60 backdrop-blur border-page-border-strong" />
        <CarouselNext className="hidden sm:flex right-2 sm:-right-12 bg-background/60 backdrop-blur border-page-border-strong" />
      </Carousel>

      {/* Dots */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            aria-label={t.carousel.goToSlide(i + 1)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === selected ? 28 : 8,
              background:
                i === selected
                  ? "linear-gradient(90deg, oklch(0.68 0.27 322), oklch(0.7 0.22 195))"
                  : "oklch(0.7 0.05 285 / 0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureSlideCard({ slide }: { slide: FeatureSlide }) {
  const cyan = slide.accent === "cyan";
  const grad = cyan
    ? "linear-gradient(135deg, oklch(0.7 0.22 195), oklch(0.55 0.2 220))"
    : "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))";
  const bgPanel = cyan
    ? "linear-gradient(135deg, oklch(0.18 0.05 220 / 0.7), oklch(0.16 0.04 195 / 0.7))"
    : "linear-gradient(135deg, oklch(0.22 0.08 322 / 0.6), oklch(0.18 0.06 285 / 0.6))";
  const border = cyan
    ? "1px solid oklch(0.7 0.22 195 / 0.25)"
    : "1px solid oklch(0.68 0.27 322 / 0.25)";
  const glow = cyan
    ? "0 0 40px -10px oklch(0.7 0.22 195 / 0.35)"
    : "0 0 40px -10px oklch(0.68 0.27 322 / 0.35)";
  const badgeBg = cyan
    ? { background: "oklch(0.7 0.25 195 / 0.15)", color: "oklch(0.85 0.22 195)", border: "1px solid oklch(0.7 0.25 195 / 0.3)" }
    : { background: "oklch(0.68 0.27 322 / 0.18)", color: "oklch(0.85 0.25 322)", border: "1px solid oklch(0.68 0.27 322 / 0.35)" };
  const highlightStyle = {
    background: cyan
      ? "linear-gradient(135deg, oklch(0.78 0.22 195), oklch(0.7 0.22 220))"
      : "linear-gradient(135deg, oklch(0.8 0.22 322), oklch(0.72 0.22 285))",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-8 min-h-[260px]"
      style={{ background: bgPanel, border, boxShadow: glow }}
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-40"
        style={{ background: grad }}
      />
      <div className="relative grid md:grid-cols-[auto,1fr] gap-5 sm:gap-7 items-center">
        <div
          className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center text-primary-foreground shrink-0"
          style={{ background: grad, boxShadow: glow }}
        >
          {slide.icon}
        </div>
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
            style={badgeBg}
          >
            {slide.badgeIcon} {slide.badge}
          </span>
          <h3 className="mt-2 font-display font-bold text-xl sm:text-2xl leading-tight">
            {slide.title}{" "}
            <span style={highlightStyle}>{slide.highlight}</span>
          </h3>
          <p className="mt-2 text-foreground/75 text-sm sm:text-base leading-relaxed">
            {slide.desc}
          </p>
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: cyan ? "oklch(0.78 0.22 195)" : "oklch(0.8 0.22 322)" }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
