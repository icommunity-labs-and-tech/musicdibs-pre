import { Helmet } from "react-helmet-async";
import "@/styles/landing-ai-studio.css";
import { Link } from "react-router-dom";
import { BackgroundScene } from "@/components/landing/BackgroundScene";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SocialBanner } from "@/components/landing/SocialBanner";
import {
  ShieldCheck,
  Globe2,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  Music2,
  Award,
  Volume2,
} from "lucide-react";

const SERVICES = [
  {
    Icon: ShieldCheck,
    sub: "Registro Digital de Obra",
    title: "Protege tu propiedad intelectual",
    desc: "De forma rápida, segura y legalmente vinculante. Certificación blockchain en minutos.",
  },
  {
    Icon: Globe2,
    sub: "Distribución a +220 Plataformas",
    title: "Tu música en todo el mundo",
    desc: "Spotify, Apple Music, TikTok, Amazon y muchas más, desde un solo panel.",
  },
  {
    Icon: TrendingUp,
    sub: "Promoción Musicdibs",
    title: "Llega a miles de oyentes",
    desc: "Activa los canales oficiales de Musicdibs y nuestras herramientas de marketing.",
  },
];

const PLATFORMS = [
  "Spotify",
  "Apple Music",
  "TikTok",
  "Amazon Music",
  "YouTube Music",
  "Deezer",
  "Tidal",
];

export default function RegistroMusicalPage() {
  return (
    <>
      <Helmet>
        <title>Registro Musical · Protege, distribuye y promociona tu música</title>
        <meta
          name="description"
          content="Registra la propiedad intelectual de tus canciones, distribúyelas en +220 plataformas globales y haz crecer tu audiencia con Musicdibs."
        />
        <link rel="canonical" href="https://musicdibs.com/registro-musical" />
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
          <Navbar />

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
                    Nuevo · Todo en uno
                  </div>

                  <h1
                    className="font-display font-bold text-[2.6rem] sm:text-5xl lg:text-[3.6rem] leading-[1.05] tracking-tight text-foreground"
                    style={{ textWrap: "balance" as any }}
                  >
                    Protege, distribuye y promociona tu música a nivel{" "}
                    <span className="text-gradient-brand">global</span>.
                  </h1>

                  <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                    Registra tus derechos de autor, lanza en +220 plataformas y
                    haz crecer tu audiencia con Musicdibs.
                  </p>

                  <div className="mt-9 flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/login"
                      className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                    >
                      Empezar ahora gratis
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                      href="#servicios"
                      className="btn-ghost inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                    >
                      Ver demo de registro
                    </a>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
                    {["Validez legal", "Blockchain", "+220 plataformas"].map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "oklch(0.85 0.22 340)" }} />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Certificate mockup */}
                <div className="relative animate-fade-in">
                  <div
                    className="absolute -inset-10 rounded-[2rem] blur-3xl opacity-70 pointer-events-none orb"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, oklch(0.68 0.27 322 / 0.55), transparent 60%), radial-gradient(circle at 80% 70%, oklch(0.55 0.3 280 / 0.45), transparent 60%)",
                    }}
                  />

                  <div className="relative glass glow-magenta rounded-3xl p-7 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          background: "oklch(0.68 0.27 322 / 0.15)",
                          color: "oklch(0.92 0.18 340)",
                          border: "1px solid oklch(0.68 0.27 322 / 0.35)",
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full animate-pulse"
                          style={{
                            background: "oklch(0.85 0.22 340)",
                            boxShadow: "0 0 8px oklch(0.85 0.22 340)",
                          }}
                        />
                        Registered
                      </span>
                    </div>

                    <div
                      className="rounded-2xl p-6 relative overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.13 0.05 300 / 0.7), oklch(0.18 0.1 320 / 0.5))",
                        border: "1px solid oklch(0.68 0.27 322 / 0.22)",
                      }}
                    >
                      <div className="absolute top-5 right-5">
                        <div
                          className="relative h-16 w-16 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              "conic-gradient(from 0deg, oklch(0.68 0.27 322), oklch(0.55 0.3 280), oklch(0.68 0.27 322))",
                            boxShadow: "0 0 30px -4px oklch(0.68 0.27 322 / 0.7)",
                          }}
                        >
                          <div
                            className="absolute inset-1 rounded-full flex items-center justify-center"
                            style={{ background: "oklch(0.13 0.05 300)" }}
                          >
                            <Award className="h-7 w-7" style={{ color: "oklch(0.85 0.22 340)" }} />
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                        Music License Certificate
                      </p>
                      <h3 className="text-xl font-bold text-foreground pr-20 leading-tight font-display">
                        Midnight Echoes
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">por A. Morales</p>

                      <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
                        {[
                          ["ID Registro", "0xA1f9…c4d2", true],
                          ["Fecha", "Hoy · 14:32", false],
                          ["Red", "Polygon · iBS", false],
                          ["Estado", "Verificado", false],
                        ].map(([k, v, mono], i) => (
                          <div key={i}>
                            <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">
                              {k}
                            </p>
                            <p
                              className={mono ? "font-mono text-foreground/90" : "text-foreground/90"}
                              style={k === "Estado" ? { color: "oklch(0.85 0.22 340)", fontWeight: 600 } : {}}
                            >
                              {v as string}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 pt-5 border-t border-border flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" style={{ color: "oklch(0.85 0.22 340)" }} />
                        <span className="text-[11px] text-muted-foreground">
                          Firmado y sellado en blockchain
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 glass">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4" style={{ color: "oklch(0.85 0.22 340)" }} />
                        <span className="text-xs text-foreground/80">
                          Distribuyendo a 220 plataformas
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.85 0.22 340)" }}
                      >
                        Live
                      </span>
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
                  Servicios
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground">
                  Todo lo que tu música necesita,{" "}
                  <span className="text-gradient-brand">en un solo lugar</span>
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {SERVICES.map(({ Icon, sub, title, desc }) => (
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
                ))}
              </div>

              {/* platforms ribbon */}
              <div className="mt-16 glass rounded-2xl px-6 py-5">
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                    Distribuimos en
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
                    +212 más
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================= FINAL CTA ============================= */}
          <section className="relative py-24">
            <div className="mx-auto max-w-4xl px-6">
              <div className="relative glass glow-magenta rounded-[2rem] px-6 sm:px-14 py-16 text-center overflow-hidden">
                <div
                  className="absolute -top-24 -left-16 h-72 w-72 rounded-full opacity-60 pointer-events-none orb"
                  style={{
                    background:
                      "radial-gradient(circle, oklch(0.68 0.27 322 / 0.55), transparent 70%)",
                  }}
                />
                <div
                  className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-50 pointer-events-none orb"
                  style={{
                    background:
                      "radial-gradient(circle, oklch(0.55 0.3 280 / 0.5), transparent 70%)",
                    animationDelay: "1.5s",
                  }}
                />

                <div className="relative">
                  <Volume2 className="h-10 w-10 mx-auto mb-6" style={{ color: "oklch(0.85 0.22 340)" }} />
                  <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-tight text-foreground">
                    ¿Listo para proteger y{" "}
                    <span className="text-gradient-brand">potenciar tu música?</span>
                  </h2>
                  <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
                    Únete a miles de artistas que ya confían en Musicdibs para
                    proteger, distribuir y promocionar sus obras.
                  </p>
                  <Link
                    to="/login"
                    className="btn-magenta mt-10 inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-sm font-semibold"
                  >
                    Unirme a Musicdibs hoy
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <SocialBanner />
          <Footer />
        </main>
      </div>
    </>
  );
}
