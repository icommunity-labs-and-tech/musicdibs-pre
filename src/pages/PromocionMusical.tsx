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
  TrendingUp,
  Sparkles,
  Wand2,
  Globe2,
  ShieldCheck,
  Music2,
  Play,
  Instagram,
  Eye,
} from "lucide-react";


const CTA_HREF = "https://www.musicdibs.com/login";
const AUDIENCE = "500"; // miles (placeholder)

export default function PromocionMusical() {
  return (
    <>
      <Helmet>
        <title>Promoción musical · Llega a cientos de miles de fans reales | Musicdibs</title>
        <meta
          name="description"
          content="Impulsa tu música con la red de canales de Musicdibs. Audiencia especializada en el sector musical, crecimiento orgánico acelerado y resultados reales."
        />
        <meta property="og:title" content="Promoción musical · Musicdibs" />
        <meta
          property="og:description"
          content="Llega a cientos de miles de fans reales con la red de promoción musical de Musicdibs."
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
          <Navbar ctaText="Promocionar mi música" ctaHref={CTA_HREF} />

          {/* HERO — composición visual asimétrica */}
          <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
            {/* Orbes de fondo */}
            <div
              className="pointer-events-none absolute -top-10 -left-32 h-[32rem] w-[32rem] rounded-full blur-[120px] opacity-70"
              style={{ background: "radial-gradient(circle, oklch(0.68 0.27 322 / 0.55), transparent 70%)" }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-40 -right-28 h-[28rem] w-[28rem] rounded-full blur-[120px] opacity-60"
              style={{ background: "radial-gradient(circle, oklch(0.55 0.28 285 / 0.55), transparent 70%)" }}
              aria-hidden
            />

            <div className="relative mx-auto max-w-7xl px-6">
              {/* Badge centrado arriba */}
              <div className="flex justify-center animate-fade-in">
                <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium tracking-wide text-foreground/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "oklch(0.78 0.25 322)" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "oklch(0.78 0.25 322)" }} />
                  </span>
                  Musicdibs Network · Promoción musical
                </span>
              </div>

              {/* Título grande centrado */}
              <h1
                className="mt-7 text-center font-display font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl leading-[1.02] max-w-5xl mx-auto animate-fade-in"
                style={{ textWrap: "balance" as any }}
              >
                Llega a cientos de miles de{" "}
                <span className="text-gradient-brand">fans reales</span>
              </h1>
              <p className="mt-6 text-center text-base sm:text-lg text-foreground/75 max-w-2xl mx-auto leading-relaxed">
                Impulsa tu música con la red de canales de Musicdibs. Más de{" "}
                <strong className="text-foreground">+{AUDIENCE}k seguidores</strong> reales,
                especializados en el sector musical, listos para descubrirte.
              </p>

              {/* Escena visual: vinilo + tarjetas flotantes */}
              <div className="relative mt-16 mx-auto max-w-5xl h-[440px] sm:h-[520px]">
                {/* Anillos concéntricos decorativos */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
                  <div className="absolute h-[420px] w-[420px] rounded-full border border-white/5" />
                  <div className="absolute h-[560px] w-[560px] rounded-full border border-white/5" />
                  <div className="absolute h-[700px] w-[700px] rounded-full border border-white/[0.03]" />
                </div>

                {/* Vinilo / disco central */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div
                    className="relative h-56 w-56 sm:h-72 sm:w-72 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "conic-gradient(from 0deg, oklch(0.2 0.1 320), oklch(0.15 0.08 285), oklch(0.22 0.12 340), oklch(0.18 0.1 300), oklch(0.2 0.1 320))",
                      boxShadow:
                        "0 0 0 1px oklch(0.98 0.01 295 / 0.08), 0 30px 80px -20px oklch(0.68 0.27 322 / 0.55), inset 0 0 40px oklch(0 0 0 / 0.6)",
                      animation: "spin-slow 18s linear infinite",
                    }}
                  >
                    <div className="absolute inset-4 rounded-full border border-white/5" />
                    <div className="absolute inset-8 rounded-full border border-white/5" />
                    <div className="absolute inset-14 rounded-full border border-white/[0.04]" />
                    <div
                      className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))",
                        boxShadow: "0 0 30px -4px oklch(0.68 0.27 322 / 0.8)",
                      }}
                    >
                      <Music2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                      <div className="absolute h-3 w-3 rounded-full bg-black" />
                    </div>
                  </div>
                  <button
                    aria-label="Reproducir demo"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center backdrop-blur-md transition-transform hover:scale-110"
                    style={{ background: "oklch(0 0 0 / 0.45)", border: "1px solid oklch(0.98 0.01 295 / 0.25)" }}
                  >
                    <Play className="h-5 w-5 text-white" fill="currentColor" />
                  </button>
                </div>

                {/* Tarjetas flotantes */}
                <OrbitCard className="left-2 top-4 sm:left-8 sm:top-8" delay="0s">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" }}>
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] text-foreground/60 leading-none">Nuevos seguidores</p>
                    <p className="text-lg font-display font-bold text-foreground leading-tight">+12.847</p>
                  </div>
                </OrbitCard>

                <OrbitCard className="right-2 top-10 sm:right-6 sm:top-16" delay="0.15s">
                  <div className="h-9 w-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.3 0.2 0 / 0.4)", color: "oklch(0.85 0.25 0)" }}>
                    <Heart className="h-4 w-4" fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-[11px] text-foreground/60 leading-none">Me gusta</p>
                    <p className="text-lg font-display font-bold text-foreground leading-tight">142,4k</p>
                  </div>
                </OrbitCard>

                <OrbitCard className="left-0 bottom-12 sm:left-4 sm:bottom-20" delay="0.3s">
                  <div className="h-9 w-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.3 0.15 280 / 0.5)", color: "oklch(0.85 0.2 285)" }}>
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-foreground/60 leading-none">Alcance</p>
                    <p className="text-lg font-display font-bold text-foreground leading-tight">2,1M</p>
                  </div>
                </OrbitCard>

                <OrbitCard className="right-0 bottom-6 sm:right-10 sm:bottom-16" delay="0.45s">
                  <div className="h-9 w-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.3 0.2 322 / 0.45)", color: "oklch(0.85 0.25 322)" }}>
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-foreground/60 leading-none">Compartidos</p>
                    <p className="text-lg font-display font-bold text-foreground leading-tight">8,7k</p>
                  </div>
                </OrbitCard>

                <OrbitCard className="hidden sm:flex left-1/2 -translate-x-1/2 bottom-0" delay="0.6s">
                  <div className="flex -space-x-2 shrink-0">
                    {["#ff6b9d", "#8b5cf6", "#22d3ee"].map((c) => (
                      <div key={c} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: "oklch(0.13 0.05 300)" }} />
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] text-foreground/60 leading-none flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> Comentando ahora
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-tight">"Esta canción es 🔥"</p>
                  </div>
                </OrbitCard>

                {/* Waveform decorativo */}
                <div className="absolute left-1/2 -bottom-4 -translate-x-1/2 flex items-end gap-1 h-10 opacity-60 pointer-events-none w-64 justify-center" aria-hidden>
                  {Array.from({ length: 32 }).map((_, i) => (
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

              {/* CTA */}
              <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-5">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-magenta inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold"
                >
                  Promocionar mi música
                </a>
                <a
                  href="#como-funciona"
                  className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  Ver cómo funciona →
                </a>
              </div>
            </div>

            <style>{`
              @keyframes spin-slow { to { transform: rotate(360deg); } }
              @keyframes wave { from { transform: scaleY(0.5); } to { transform: scaleY(1.1); } }
              @keyframes float-soft { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            `}</style>
          </section>

          {/* SOCIAL PROOF / STATS */}
          <section className="relative py-12">
            <div className="mx-auto max-w-6xl px-6">
              <div className="glass rounded-3xl p-8 sm:p-10 grid sm:grid-cols-3 gap-8 sm:gap-4">
                <Stat value={`+${AUDIENCE}k`} label="Audiencia total" sub="Seguidores reales" />
                <Stat value="Música" label="Engagement" sub="Especializado en el sector" />
                <Stat value="Acelerado" label="Resultados" sub="Crecimiento orgánico" />
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
                  Un proceso simple y curado para que tu música llegue a quien tiene que llegar.
                </p>
              </div>

              <div className="mt-14 grid md:grid-cols-3 gap-6">
                <Step
                  index="01"
                  title="Submit"
                  icon={<Upload className="h-6 w-6" />}
                  desc="Envías tu canción o clip de video listo para destacar."
                />
                <Step
                  index="02"
                  title="Curated Push"
                  icon={<Megaphone className="h-6 w-6" />}
                  desc="Nuestro equipo de expertos integra tu contenido en nuestros canales estratégicos."
                />
                <Step
                  index="03"
                  title="Growth"
                  icon={<TrendingUp className="h-6 w-6" />}
                  desc="Tu audiencia crece mientras tu música llega a oyentes, sellos y fans."
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
                  Mucho más que promoción
                </span>
                <h2 className="mt-5 font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl">
                  Todo lo que necesitas para tu{" "}
                  <span className="text-gradient-brand">carrera musical</span>
                </h2>
                <p className="mt-4 text-foreground/70">
                  Musicdibs es un ecosistema completo. La promoción es solo el principio.
                </p>
              </div>

              <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <EcoCard
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Creación con IA"
                  desc="Genera ideas y temas desde cero."
                />
                <EcoCard
                  icon={<Wand2 className="h-5 w-5" />}
                  title="Mejora tu música"
                  desc="Mastering y retoque profesional."
                />
                <EcoCard
                  icon={<Globe2 className="h-5 w-5" />}
                  title="Distribución global"
                  desc="Lanza en +220 plataformas (Spotify, Apple…)."
                />
                <EcoCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Protección legal"
                  desc="Registro de propiedad intelectual inmediato."
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
                ¿Listo para que el{" "}
                <span className="text-gradient-brand">mundo te escuche</span>?
              </h2>
              <p className="mt-5 text-foreground/70 text-lg max-w-xl mx-auto">
                Únete a los artistas que ya están creciendo con Musicdibs.
              </p>
              <div className="mt-9">
                <a
                  href={CTA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-magenta inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold"
                >
                  Empezar ahora
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

function FloatingIcon({
  children,
  className = "",
  delay = "0s",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`absolute glass glow-magenta rounded-2xl px-3 py-2 flex items-center gap-2 text-foreground animate-fade-in ${className}`}
      style={{
        color: "oklch(0.85 0.25 322)",
        animation: `fade-in 0.6s ease-out ${delay} both, float 4s ease-in-out ${delay} infinite`,
      }}
    >
      {children}
      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}

function OrbitCard({
  children,
  className = "",
  delay = "0s",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`absolute glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 ${className}`}
      style={{
        animation: `fade-in 0.7s ease-out ${delay} both, float-soft 5s ease-in-out ${delay} infinite`,
        boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(0.98 0.01 295 / 0.08)",
      }}
    >
      {children}
    </div>
  );
}


function Stat({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="text-center sm:text-left sm:px-4">
      <p className="text-3xl sm:text-4xl font-display font-bold text-gradient-brand">{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-foreground/60 mt-0.5">{sub}</p>
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
