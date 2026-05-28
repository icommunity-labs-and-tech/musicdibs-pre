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

          {/* HERO */}
          <section className="relative pt-36 pb-24 sm:pt-44 sm:pb-32">
            <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-14 items-center">
              <div className="animate-fade-in">
                <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium tracking-wide text-foreground/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Promoción musical · Musicdibs Network
                </span>
                <h1
                  className="mt-6 font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.05]"
                  style={{ textWrap: "balance" as any }}
                >
                  Llega a cientos de miles de{" "}
                  <span className="text-gradient-brand">fans reales</span>.
                </h1>
                <p className="mt-6 text-base sm:text-lg text-foreground/75 max-w-xl leading-relaxed">
                  Impulsa tu música a través de la red de canales de Musicdibs. Aprovecha nuestra
                  audiencia de más de <strong className="text-foreground">+{AUDIENCE}k seguidores</strong>{" "}
                  en Instagram especializados en el sector musical para viralizar tu talento.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a
                    href={CTA_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-magenta inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
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

              {/* Visual element */}
              <div className="relative animate-fade-in">
                <div className="relative mx-auto max-w-md aspect-square">
                  {/* Glow blob */}
                  <div
                    className="absolute inset-0 rounded-full blur-3xl opacity-60"
                    style={{
                      background:
                        "radial-gradient(circle, oklch(0.68 0.27 322 / 0.7), transparent 65%)",
                    }}
                    aria-hidden
                  />
                  {/* Music player card */}
                  <div className="relative glass glow-magenta rounded-3xl p-6 mt-10 mx-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-16 w-16 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.55 0.28 285))",
                        }}
                      >
                        <Music2 className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">Tu próximo hit</p>
                        <p className="text-xs text-foreground/60 truncate">Musicdibs · Promo Boost</p>
                      </div>
                    </div>
                    <div className="mt-5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full w-2/3 rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, oklch(0.78 0.25 322), oklch(0.7 0.28 285))",
                        }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-foreground/50 font-medium">
                      <span>1:42</span>
                      <span>2:51</span>
                    </div>
                  </div>

                  {/* Floating engagement icons */}
                  <FloatingIcon className="top-4 right-6" delay="0s">
                    <Heart className="h-5 w-5" fill="currentColor" />
                    <span className="text-xs font-bold">12.4k</span>
                  </FloatingIcon>
                  <FloatingIcon className="bottom-10 left-2" delay="0.4s">
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-xs font-bold">2.1k</span>
                  </FloatingIcon>
                  <FloatingIcon className="bottom-24 right-0" delay="0.8s">
                    <Share2 className="h-5 w-5" />
                    <span className="text-xs font-bold">8.7k</span>
                  </FloatingIcon>
                </div>
              </div>
            </div>
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
