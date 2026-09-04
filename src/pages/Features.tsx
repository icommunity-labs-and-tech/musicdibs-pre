import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useFeaturesCopy } from "@/i18nFeatures";
import { Button } from "@/components/ui/button";
import {
  Mic2,
  Shield,
  Radio,
  Megaphone,
  Sparkles,
  Music,
  FileCheck,
  Globe,
  TrendingUp,
  Zap,
  Image,
  Video,
  Star,
  ArrowRight,
  CheckCircle2,
  Play,
} from "lucide-react";

// ─── JSON-LD ─────────────────────────────────────────────────────────────────

const featuresJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Musicdibs",
  applicationCategory: "MusicApplication",
  operatingSystem: "Web",
  url: "https://musicdibs.com",
  description:
    "Plataforma todo-en-uno para artistas independientes: crea música con IA, registra tu propiedad intelectual en blockchain, distribuye a 220+ plataformas y promociona con contenido generado por IA.",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "6.90",
    highPrice: "399.90",
    priceCurrency: "EUR",
    offerCount: "5",
  },
  featureList: [
    "Generación de música completa con IA",
    "Registro blockchain de propiedad intelectual",
    "Distribución a 220+ plataformas de streaming",
    "Sin comisiones de Musicdibs sobre los royalties de streaming del artista",
    "Generación de portadas con IA",
    "Generación de vídeos promocionales con IA",
    "AI Mastering automático",
    "Generación de letras con IA",
    "YouTube Content ID",
    "Verificación de certificados",
    "Validez legal en 175+ países",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "1240",
    bestRating: "5",
  },
};

// ─── DATA ─────────────────────────────────────────────────────────────────────

const PILLARS_META = [
  {
    id: "create",
    icon: Mic2,
    color: "from-accent to-primary",
    badgeColor: "bg-accent/20 text-accent border-accent/30",
    href: "/ia-music-studio",
    featureIcons: [Mic2, Sparkles, Music, FileCheck],
  },
  {
    id: "protect",
    icon: Shield,
    color: "from-success to-info",
    badgeColor: "bg-success/20 text-success border-success/30",
    href: "/registro-obras-musicales",
    featureIcons: [Zap, Globe, Shield, FileCheck],
  },
  {
    id: "distribute",
    icon: Radio,
    color: "from-brand to-destructive",
    badgeColor: "bg-brand/20 text-brand border-brand/30",
    href: "/distribution",
    featureIcons: [Radio, TrendingUp, Zap, Play],
  },
  {
    id: "promote",
    icon: Megaphone,
    color: "from-warning to-warning",
    badgeColor: "bg-warning/20 text-warning border-warning/30",
    href: "/promocion-musical",
    featureIcons: [Image, Video, Star, Megaphone],
  },
];

const COMPARE_META = [
  { md: true,  landr: true,  distrokid: true,  toolost: true  },
  { md: true,  landr: false, distrokid: false, toolost: true  },
  { md: true,  landr: false, distrokid: false, toolost: false },
  { md: true,  landr: false, distrokid: false, toolost: false },
  { md: true,  landr: false, distrokid: false, toolost: false },
  { md: true,  landr: true,  distrokid: false, toolost: false },
  { md: true,  landr: true,  distrokid: false, toolost: false },
  { md: true,  landr: false, distrokid: false, toolost: false },
  { md: true,  landr: false, distrokid: false, toolost: false },
  { md: true,  landr: false, distrokid: false, toolost: false },
  { md: true,  landr: true,  distrokid: true,  toolost: true  },
  { md: true,  landr: false, distrokid: true,  toolost: true  },
  { md: true,  landr: false, distrokid: false, toolost: false },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const Check = ({ ok }: { ok: boolean }) =>
  ok ? (
    <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
  ) : (
    <span className="block w-5 h-0.5 bg-page-surface-strong mx-auto rounded" />
  );

export default function Features() {
  const copy = useFeaturesCopy();
  const pillars = PILLARS_META.map((meta, i) => ({ ...meta, ...copy.pillars[i] }));
  const compareRows = COMPARE_META.map((meta, i) => ({ ...meta, feature: copy.compare.rows[i] }));

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={copy.seo.title}
        description={copy.seo.description}
        path="/features"
        jsonLd={featuresJsonLd}
      />
      <Navbar />

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-5 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              {copy.hero.badge}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-accent to-brand bg-clip-text text-transparent leading-tight">
            {copy.hero.titleA}
            <br />
            {copy.hero.titleB}
          </h1>
          <p className="text-xl md:text-2xl text-page-fg-muted mb-6 max-w-3xl mx-auto leading-relaxed">
            {copy.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
              <Link to="/login">{copy.hero.ctaPrimary}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-page-border-strong text-primary-foreground hover:bg-page-surface px-8">
              <Link to="/distribution">{copy.hero.ctaSecondary}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── PILARES ── */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto space-y-24">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            const isEven = idx % 2 === 0;
            return (
              <div
                key={pillar.id}
                id={pillar.id}
                className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-12 items-start`}
              >
                {/* Text */}
                <div className="flex-1 space-y-6">
                  <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-bold tracking-widest ${pillar.badgeColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {pillar.badge}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground leading-tight">
                    {pillar.title}
                  </h2>
                  <p className="text-lg text-page-fg-subtle font-medium">{pillar.subtitle}</p>
                  <p className="text-page-fg-muted leading-relaxed">{pillar.description}</p>

                  {/* Sub-links */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {pillar.subroutes.map((sr) => (
                      <Link
                        key={sr.href}
                        to={sr.href}
                        className="text-sm text-page-fg-subtle hover:text-page-fg underline underline-offset-2 transition-colors"
                      >
                        {sr.label}
                      </Link>
                    ))}
                  </div>

                  <Button
                    asChild
                    className={`mt-2 bg-gradient-to-r ${pillar.color} hover:opacity-90 text-primary-foreground border-0`}
                  >
                    <Link to={pillar.href}>
                      {pillar.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                {/* Feature cards */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  {pillar.features.map((feat, fIdx) => {
                    const FIcon = pillar.featureIcons[fIdx];
                    return (
                      <div
                        key={feat.label}
                        className="bg-page-surface border border-page-border rounded-2xl p-5 hover:bg-page-surface transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-3`}>
                          <FIcon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <p className="font-semibold text-primary-foreground text-sm mb-1">{feat.label}</p>
                        <p className="text-page-fg-subtle text-xs leading-relaxed">{feat.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── COMPARATIVA ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              {copy.compare.title}
            </h2>
            <p className="text-page-fg-subtle text-lg max-w-2xl mx-auto">
              {copy.compare.subtitle}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-page-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-page-border">
                  <th className="text-left px-6 py-4 text-page-fg-subtle font-medium w-1/2">{copy.compare.tableHeader}</th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-accent font-bold">Musicdibs</span>
                  </th>
                  <th className="px-4 py-4 text-center text-page-fg-subtle font-medium">LANDR</th>
                  <th className="px-4 py-4 text-center text-page-fg-subtle font-medium">DistroKid</th>
                  <th className="px-4 py-4 text-center text-page-fg-subtle font-medium">Too Lost</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-page-border ${i % 2 === 0 ? "bg-primary-foreground/[0.02]" : ""}`}
                  >
                    <td className="px-6 py-3.5 text-page-fg-muted">{row.feature}</td>
                    <td className="px-4 py-3.5"><Check ok={row.md} /></td>
                    <td className="px-4 py-3.5"><Check ok={row.landr} /></td>
                    <td className="px-4 py-3.5"><Check ok={row.distrokid} /></td>
                    <td className="px-4 py-3.5"><Check ok={row.toolost} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            {copy.closingCta.title}
          </h2>
          <p className="text-page-fg-subtle text-lg mb-10">
            {copy.closingCta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-accent to-brand hover:opacity-90 text-primary-foreground border-0 px-10">
              <Link to="/login">
                {copy.closingCta.ctaPrimary}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-page-border-strong text-primary-foreground hover:bg-page-surface px-10">
              <Link to="/faq">{copy.closingCta.ctaSecondary}</Link>
            </Button>
          </div>
          <p className="text-page-fg-subtle text-sm mt-6">
            {copy.closingCta.footnote}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
