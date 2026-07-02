import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
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
  url: "https://www.musicdibs.com",
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

const PILLARS = [
  {
    id: "create",
    icon: Mic2,
    color: "from-violet-500 to-purple-600",
    badge: "CREATE",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    title: "AI Music Studio",
    subtitle: "Crea canciones profesionales desde cero",
    description:
      "Sube tu voz a capella y nuestra IA construye toda la producción alrededor: afinación, instrumentación, arreglos y mezcla profesional en minutos. O genera música completa desde un prompt de texto.",
    href: "/ia-music-studio",
    features: [
      { icon: Mic2,      label: "Voz + producción completa",    desc: "Sube tu voz, la IA hace el resto" },
      { icon: Sparkles,  label: "Generación desde texto",        desc: "Describe tu canción, la IA la crea" },
      { icon: Music,     label: "AI Mastering",                  desc: "Listo para Spotify y Apple Music" },
      { icon: FileCheck, label: "Generación de letras",          desc: "Letras en español, inglés y portugués" },
    ],
    subroutes: [
      { label: "Crear canción",  href: "/ai-studio/create" },
      { label: "Voz a canción",  href: "/ai-studio/vocal" },
      { label: "AI Mastering",   href: "/ai-studio/enhance" },
      { label: "Inspiración",    href: "/ai-studio/inspire" },
    ],
    cta: "Abrir AI Studio",
  },
  {
    id: "protect",
    icon: Shield,
    color: "from-emerald-500 to-teal-600",
    badge: "PROTECT",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    title: "Registro Blockchain de IP",
    subtitle: "Prueba legal de autoría instantánea",
    description:
      "Registra tus obras en blockchain con un certificado digital inmutable. Hash criptográfico + timestamp. Válido como prueba legal en más de 175 países bajo el Convenio de Berna, el Tratado OMPI y el reglamento eIDAS.",
    href: "/registro-obras-musicales",
    features: [
      { icon: Zap,       label: "Certificación en <15 segundos", desc: "Proceso 100% automatizado" },
      { icon: Globe,     label: "Válido en 175+ países",          desc: "Berna, OMPI y eIDAS" },
      { icon: Shield,    label: "Hash criptográfico",             desc: "Inmutable e infalsificable" },
      { icon: FileCheck, label: "Certificado descargable",        desc: "PDF con evidencia blockchain" },
    ],
    subroutes: [
      { label: "Registrar obra",      href: "/registro-obras-musicales" },
      { label: "Validez legal",        href: "/legal-validity" },
      { label: "Verificar certificado", href: "/verify" },
      { label: "Register a song (EN)", href: "/register-a-song" },
    ],
    cta: "Registrar mi música",
  },
  {
    id: "distribute",
    icon: Radio,
    color: "from-pink-500 to-rose-600",
    badge: "DISTRIBUTE",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    title: "Distribución Musical Global",
    subtitle: "220+ plataformas. Sin comisión de Musicdibs sobre tus royalties. Sin permanencia.",
    description:
      "Distribuye tu música a Spotify, Apple Music, TikTok, YouTube Music, Amazon y 220+ plataformas globales. Musicdibs no cobra ninguna comisión sobre tus royalties de streaming. Alta en 24–48 horas.",
    href: "/distribution",
    features: [
      { icon: Radio,      label: "220+ plataformas",         desc: "Spotify, Apple, TikTok y más" },
      { icon: TrendingUp, label: "Sin comisión sobre royalties", desc: "Musicdibs no retiene comisión de streaming" },
      { icon: Zap,        label: "Alta en 24–48h",            desc: "Sin esperas interminables" },
      { icon: Play,       label: "YouTube Content ID",        desc: "Monetiza cada uso en YouTube" },
    ],
    subroutes: [
      { label: "Distribución musical", href: "/distribution" },
      { label: "YouTube Content ID",   href: "/distribution#content-id" },
      { label: "Canal oficial YT (OAC)", href: "/distribution#oac" },
    ],
    cta: "Distribuir mi música",
  },
  {
    id: "promote",
    icon: Megaphone,
    color: "from-amber-500 to-orange-600",
    badge: "PROMOTE",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    title: "Promoción con IA",
    subtitle: "Contenido visual y presencia en redes, automatizados",
    description:
      "Genera portadas profesionales, posts, flyers, stories y vídeos cortos para redes sociales con IA. Y si quieres más alcance, publicamos tu música en los canales propios de Musicdibs: TikTok (245k) e Instagram (100k).",
    href: "/promocion-musical",
    features: [
      { icon: Image,     label: "Portadas con IA",         desc: "Listas para cualquier plataforma" },
      { icon: Video,     label: "Vídeos y Reels con IA",   desc: "TikTok, Instagram y YouTube Shorts" },
      { icon: Star,      label: "Post y stories IA",       desc: "Diseños listos para publicar" },
      { icon: Megaphone, label: "Canales propios",         desc: "TikTok 245k · Instagram 100k" },
    ],
    subroutes: [
      { label: "Portadas IA",      href: "/ai-studio/covers" },
      { label: "Vídeos IA",        href: "/ai-studio/video" },
      { label: "Material promo",   href: "/ai-studio/promo-material" },
      { label: "Promoción activa", href: "/promocion-musical" },
    ],
    cta: "Crear contenido",
  },
];

const COMPARE_ROWS = [
  { feature: "Distribución a 220+ plataformas", md: true,  landr: true,  distrokid: true,  toolost: true  },
  { feature: "Sin comisión de Musicdibs sobre royalties de streaming", md: true, landr: false, distrokid: false, toolost: true },
  { feature: "Registro blockchain IP",          md: true,  landr: false, distrokid: false, toolost: false },
  { feature: "Validez legal global (175+ países)", md: true, landr: false, distrokid: false, toolost: false },
  { feature: "Certificación en <15 segundos",  md: true,  landr: false, distrokid: false, toolost: false },
  { feature: "Generación música con IA",        md: true,  landr: true,  distrokid: false, toolost: false },
  { feature: "AI Mastering integrado",          md: true,  landr: true,  distrokid: false, toolost: false },
  { feature: "Portadas con IA",                 md: true,  landr: false, distrokid: false, toolost: false },
  { feature: "Vídeos promocionales con IA",     md: true,  landr: false, distrokid: false, toolost: false },
  { feature: "Canales sociales propios",        md: true,  landr: false, distrokid: false, toolost: false },
  { feature: "YouTube Content ID",              md: true,  landr: true,  distrokid: true,  toolost: true  },
  { feature: "Sin permanencia",                 md: true,  landr: false, distrokid: true,  toolost: true  },
  { feature: "Mercado hispanohablante",         md: true,  landr: false, distrokid: false, toolost: false },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const Check = ({ ok }: { ok: boolean }) =>
  ok ? (
    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
  ) : (
    <span className="block w-5 h-0.5 bg-white/20 mx-auto rounded" />
  );

export default function Features() {
  return (
    <div className="min-h-screen page-bg">
      <SEO
        title="Funcionalidades: Crea, Protege, Distribuye y Promociona tu Música"
        description="Todo lo que necesita un artista independiente en una sola plataforma: AI Music Studio, registro blockchain, distribución a 220+ plataformas y promoción con IA. Desde €6,90/mes."
        path="/features"
        jsonLd={featuresJsonLd}
      />
      <Navbar />

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-5 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">
              Stack completo para artistas independientes
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-violet-200 to-pink-300 bg-clip-text text-transparent leading-tight">
            Create. Protect.
            <br />
            Distribute. Promote.
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-6 max-w-3xl mx-auto leading-relaxed">
            El único stack completo para músicos independientes en el mercado hispanohablante.
            Crea canciones con IA, registra tu propiedad intelectual, distribuye a todo el mundo
            y genera contenido visual — todo desde un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white px-8">
              <Link to="/login">Empezar gratis</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8">
              <Link to="/distribution">Ver distribución</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── PILARES ── */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto space-y-24">
          {PILLARS.map((pillar, idx) => {
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
                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    {pillar.title}
                  </h2>
                  <p className="text-lg text-white/60 font-medium">{pillar.subtitle}</p>
                  <p className="text-white/70 leading-relaxed">{pillar.description}</p>

                  {/* Sub-links */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {pillar.subroutes.map((sr) => (
                      <Link
                        key={sr.href}
                        to={sr.href}
                        className="text-sm text-white/50 hover:text-white/90 underline underline-offset-2 transition-colors"
                      >
                        {sr.label}
                      </Link>
                    ))}
                  </div>

                  <Button
                    asChild
                    className={`mt-2 bg-gradient-to-r ${pillar.color} hover:opacity-90 text-white border-0`}
                  >
                    <Link to={pillar.href}>
                      {pillar.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                {/* Feature cards */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  {pillar.features.map((feat) => {
                    const FIcon = feat.icon;
                    return (
                      <div
                        key={feat.label}
                        className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-3`}>
                          <FIcon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-semibold text-white text-sm mb-1">{feat.label}</p>
                        <p className="text-white/50 text-xs leading-relaxed">{feat.desc}</p>
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
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Musicdibs vs la competencia
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              El único stack que cubre los cuatro pilares: crear, proteger, distribuir y promocionar.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-white/50 font-medium w-1/2">Funcionalidad</th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-violet-300 font-bold">Musicdibs</span>
                  </th>
                  <th className="px-4 py-4 text-center text-white/40 font-medium">LANDR</th>
                  <th className="px-4 py-4 text-center text-white/40 font-medium">DistroKid</th>
                  <th className="px-4 py-4 text-center text-white/40 font-medium">Too Lost</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                  >
                    <td className="px-6 py-3.5 text-white/70">{row.feature}</td>
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Todo lo que necesitas para vivir de tu música
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Más de 100.000 artistas ya usan Musicdibs. Empieza gratis y escala cuando quieras.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white border-0 px-10">
              <Link to="/login">
                Crear cuenta gratis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-10">
              <Link to="/faq">Ver preguntas frecuentes</Link>
            </Button>
          </div>
          <p className="text-white/30 text-sm mt-6">
            Desde €6,90/mes · Sin permanencia · 3 créditos gratis al registrarte
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
