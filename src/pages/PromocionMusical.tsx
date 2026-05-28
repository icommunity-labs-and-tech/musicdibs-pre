import { Helmet } from "react-helmet-async";
import "@/styles/landing-ai-studio.css";
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
} from "lucide-react";

const CTA_HREF = "https://www.musicdibs.com/login";

export default function PromocionMusical() {
  return (
    <>
      <Helmet>
        <title>Distribución y promoción musical · Lanza tu música al mundo | Musicdibs</title>
        <meta
          name="description"
          content="Distribuye tu música en +220 plataformas globales y promociónala en la red de Musicdibs con cientos de miles de seguidores reales en Instagram."
        />
        <meta property="og:title" content="Distribución y promoción musical · Musicdibs" />
        <meta
          property="og:description"
          content="Distribución global ilimitada + promoción orgánica en redes. Todo en un solo lugar."
        />
        <link rel="canonical" href="https://musicdibs.com/promocion-musical" />
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
          <Navbar ctaText="Empezar ahora" ctaHref={CTA_HREF} />

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
                  Distribución global + Promoción en redes
                </span>
              </div>

              <h1
                className="mt-7 text-center font-display font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl leading-[1.02] max-w-5xl mx-auto animate-fade-in"
                style={{ textWrap: "balance" as any }}
              >
                Lanza tu música al mundo y{" "}
                <span className="text-gradient-brand">llega a miles de fans</span>
              </h1>
              <p className="mt-6 text-center text-base sm:text-lg text-foreground/75 max-w-3xl mx-auto leading-relaxed">
                Distribuye tus canciones en más de <strong className="text-foreground">220 plataformas globales</strong> y, al mismo tiempo, impúlsalas en la red de canales de Musicdibs, con una audiencia de{" "}
                <strong className="text-foreground">cientos de miles de seguidores reales</strong> en Instagram especializados en el sector musical.
              </p>

              {/* CTAs */}
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-magenta inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold"
                >
                  Empezar ahora
                </a>
                <a
                  href="#como-funciona"
                  className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold"
                >
                  Ver cómo funciona
                </a>
              </div>

              {/* Escena dual: Distribución | Promoción */}
              <div className="relative mt-16 mx-auto max-w-6xl grid lg:grid-cols-2 gap-6 lg:gap-4">
                {/* LADO IZQ — Distribución global */}
                <div className="relative glass rounded-3xl p-7 sm:p-9 overflow-hidden min-h-[420px]">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ background: "oklch(0.7 0.25 195 / 0.15)", color: "oklch(0.85 0.22 195)", border: "1px solid oklch(0.7 0.25 195 / 0.3)" }}>
                    <Globe2 className="h-3 w-3" /> Distribución
                  </span>
                  <h3 className="mt-4 font-display font-bold text-2xl sm:text-3xl leading-tight">+220 plataformas globales</h3>

                  {/* Globo con anillos */}
                  <div className="relative mt-6 h-56 flex items-center justify-center" aria-hidden>
                    <div className="absolute h-44 w-44 rounded-full border border-white/10" style={{ animation: "spin-slow 22s linear infinite" }} />
                    <div className="absolute h-60 w-60 rounded-full border border-white/5" />
                    <div
                      className="relative h-32 w-32 rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle at 30% 30%, oklch(0.6 0.22 195), oklch(0.25 0.12 240))",
                        boxShadow: "0 0 60px -6px oklch(0.7 0.25 195 / 0.7), inset -10px -10px 30px oklch(0 0 0 / 0.5)",
                      }}
                    >
                      <Globe2 className="h-12 w-12 text-white/90" />
                    </div>

                    {/* Logos plataformas flotantes */}
                    <PlatformPill className="left-2 top-2" label="Spotify" color="#1DB954" delay="0s" />
                    <PlatformPill className="right-2 top-6" label="Apple Music" color="#fa57c1" delay="0.2s" />
                    <PlatformPill className="left-4 bottom-2" label="TikTok" color="#22d3ee" delay="0.4s" />
                    <PlatformPill className="right-4 bottom-6" label="Amazon" color="#ffb84d" delay="0.6s" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Regalías", "Estadísticas", "Lanzamientos"].map((t) => (
                      <span key={t} className="text-[11px] px-2.5 py-1 rounded-full glass text-foreground/75">{t}</span>
                    ))}
                  </div>
                </div>

                {/* LADO DER — Promoción orgánica */}
                <div className="relative glass rounded-3xl p-7 sm:p-9 overflow-hidden min-h-[420px] glow-magenta">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ background: "oklch(0.68 0.27 322 / 0.18)", color: "oklch(0.85 0.25 322)", border: "1px solid oklch(0.68 0.27 322 / 0.35)" }}>
                    <Instagram className="h-3 w-3" /> Promoción
                  </span>
                  <h3 className="mt-4 font-display font-bold text-2xl sm:text-3xl leading-tight">Cientos de miles de fans reales</h3>

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
                      <div className="absolute inset-3 rounded-full border border-white/5" />
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))" }}
                      >
                        <Music2 className="h-5 w-5 text-white" />
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

          {/* THE TWO PILLARS */}
          <section className="relative py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-foreground/80">
                  Dos servicios. Un solo lugar.
                </span>
                <h2 className="mt-5 font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl">
                  Los <span className="text-gradient-brand">dos pilares</span> de tu lanzamiento
                </h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                <Pillar
                  accent="cyan"
                  badgeIcon={<Globe2 className="h-3.5 w-3.5" />}
                  badge="Pilar 1"
                  title="Distribución Global Ilimitada"
                  desc="Colocamos tu música en más de 220 plataformas digitales (Spotify, Apple Music, Amazon, Deezer, TikTok…). Controla tus regalías, estadísticas y lanzamientos desde un único panel profesional."
                  features={[
                    "+220 plataformas digitales en todo el mundo",
                    "Regalías 100% para el artista",
                    "Panel unificado con estadísticas en tiempo real",
                    "Lanzamientos ilimitados",
                  ]}
                  icon={<Radio className="h-7 w-7" />}
                />
                <Pillar
                  accent="magenta"
                  badgeIcon={<Megaphone className="h-3.5 w-3.5" />}
                  badge="Pilar 2"
                  title="Promoción Orgánica en Redes"
                  desc="No solo distribuimos, te hacemos visible. Conectamos tu música directamente con nuestra comunidad de cientos de miles de seguidores melómanos y profesionales del sector en Instagram."
                  features={[
                    "Red propia de canales especializados en música",
                    "Audiencia real, no bots ni inflada",
                    "Promoción curada por expertos del sector",
                    "Crecimiento orgánico medible",
                  ]}
                  icon={<Headphones className="h-7 w-7" />}
                />
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="como-funciona" className="relative py-24 sm:py-32">
            <div className="mx-auto max-w-6xl px-6">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl">
                  Cómo <span className="text-gradient-brand">funciona</span>
                </h2>
                <p className="mt-4 text-foreground/70">
                  Tres pasos simples para lanzar, proteger y promocionar tu música.
                </p>
              </div>

              <div className="mt-14 grid md:grid-cols-3 gap-6">
                <Step
                  index="01"
                  title="Sube tu música"
                  icon={<Upload className="h-6 w-6" />}
                  desc="Carga tus canciones y añade los metadatos fácilmente desde tu panel."
                />
                <Step
                  index="02"
                  title="Distribución & protección"
                  icon={<Globe2 className="h-6 w-6" />}
                  desc="Enviamos tu música a todo el mundo de forma masiva y segura, con registro legal incluido."
                />
                <Step
                  index="03"
                  title="Campaña de promoción"
                  icon={<Megaphone className="h-6 w-6" />}
                  desc="Activamos la maquinaria en las redes de Musicdibs para multiplicar tu alcance."
                />
              </div>
            </div>
          </section>

          {/* ECOSYSTEM */}
          <section
            className="relative py-24 sm:py-32"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.98 0.01 295 / 0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(0.98 0.01 295 / 0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          >
            <div className="mx-auto max-w-6xl px-6">
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-foreground/80">
                  Todo el poder de Musicdibs
                </span>
                <h2 className="mt-5 font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl">
                  Mucho más que distribución y{" "}
                  <span className="text-gradient-brand">promoción</span>
                </h2>
                <p className="mt-4 text-foreground/70">
                  Descubre el resto de herramientas diseñadas para potenciar tu carrera musical en cada etapa.
                </p>
              </div>

              <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <EcoCard
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Creación con IA"
                  desc="Genera ideas, letras y maquetas desde cero."
                />
                <EcoCard
                  icon={<Wand2 className="h-5 w-5" />}
                  title="Mejora & Mastering"
                  desc="Herramientas de retoque de audio profesional."
                />
                <EcoCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Protección Legal"
                  desc="Registro de propiedad intelectual inmediato con validez legal."
                />
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
                ¿Listo para llevar tu música al{" "}
                <span className="text-gradient-brand">siguiente nivel</span>?
              </h2>
              <p className="mt-5 text-foreground/70 text-lg max-w-xl mx-auto">
                Distribuye en +220 plataformas y promociónala con nuestra red en un solo clic.
              </p>
              <div className="mt-9">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-magenta inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold"
                >
                  Distribuir y promocionar mi música
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
  features: string[];
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
          className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shrink-0"
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
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/85">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: cyan ? "oklch(0.78 0.22 195)" : "oklch(0.82 0.25 322)" }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
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
        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white"
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
    <div className="glass rounded-2xl p-5 transition-all hover:border-white/20 hover:-translate-y-0.5">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
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
