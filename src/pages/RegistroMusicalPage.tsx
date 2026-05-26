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

                  <div className="relative aspect-square w-full max-w-[520px] mx-auto">
                    {/* Central disc — la canción */}
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-44 w-44 sm:h-52 sm:w-52 rounded-full flex items-center justify-center z-20"
                      style={{
                        background:
                          "conic-gradient(from 0deg, oklch(0.68 0.27 322), oklch(0.55 0.3 280), oklch(0.7 0.3 0), oklch(0.68 0.27 322))",
                        boxShadow:
                          "0 0 60px -10px oklch(0.68 0.27 322 / 0.8), 0 0 120px -20px oklch(0.55 0.3 280 / 0.6)",
                      }}
                    >
                      {/* vinyl grooves */}
                      <div
                        className="absolute inset-3 rounded-full spin-slow"
                        style={{
                          background:
                            "repeating-radial-gradient(circle at center, oklch(0.13 0.05 300 / 0.85) 0 3px, oklch(0.2 0.08 320 / 0.55) 3px 5px)",
                          animationDuration: "18s",
                        }}
                      />
                      <div
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                      >
                        <div
                          className="h-20 w-20 sm:h-24 sm:w-24 rounded-full flex flex-col items-center justify-center text-center"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.13 0.05 300), oklch(0.18 0.1 320))",
                            border: "2px solid oklch(0.85 0.22 340 / 0.5)",
                            boxShadow:
                              "inset 0 0 20px oklch(0.68 0.27 322 / 0.4)",
                          }}
                        >
                          <Music2
                            className="h-7 w-7"
                            style={{ color: "oklch(0.85 0.22 340)" }}
                          />
                          <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-foreground/70">
                            tu canción
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Orbit ring */}
                    <div
                      className="absolute inset-6 rounded-full pointer-events-none"
                      style={{
                        border: "1px dashed oklch(0.85 0.22 340 / 0.25)",
                      }}
                    />
                    <div
                      className="absolute inset-16 rounded-full pointer-events-none"
                      style={{
                        border: "1px dashed oklch(0.85 0.22 340 / 0.15)",
                      }}
                    />

                    {/* Card 1 — Registro (top) */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-0 glass glow-magenta rounded-2xl px-4 py-3 z-30 min-w-[200px]"
                      style={{ animation: "landing-orb-float 7s ease-in-out infinite" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.3), oklch(0.55 0.3 280 / 0.2))",
                            border: "1px solid oklch(0.68 0.27 322 / 0.4)",
                          }}
                        >
                          <ShieldCheck
                            className="h-5 w-5"
                            style={{ color: "oklch(0.85 0.22 340)" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Registro
                          </p>
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            Sellado
                            <CheckCircle2
                              className="h-3 w-3"
                              style={{ color: "oklch(0.85 0.22 340)" }}
                            />
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate">
                            0xA1f9…c4d2
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2 — Distribución (bottom-left) */}
                    <div
                      className="absolute left-0 bottom-6 sm:bottom-10 glass glow-magenta rounded-2xl px-4 py-3 z-30 min-w-[180px]"
                      style={{
                        animation: "landing-orb-float 8s ease-in-out infinite",
                        animationDelay: "1.2s",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.3), oklch(0.55 0.3 280 / 0.2))",
                            border: "1px solid oklch(0.68 0.27 322 / 0.4)",
                          }}
                        >
                          <Globe2
                            className="h-5 w-5"
                            style={{ color: "oklch(0.85 0.22 340)" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Distribución
                          </p>
                          <p className="text-xs font-semibold text-foreground">
                            +220 plataformas
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className="h-1.5 w-1.5 rounded-full animate-pulse"
                              style={{
                                background: "oklch(0.85 0.22 340)",
                                boxShadow: "0 0 6px oklch(0.85 0.22 340)",
                              }}
                            />
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

                    {/* Card 3 — Promoción (bottom-right) */}
                    <div
                      className="absolute right-0 bottom-6 sm:bottom-10 glass glow-magenta rounded-2xl px-4 py-3 z-30 min-w-[180px]"
                      style={{
                        animation: "landing-orb-float 9s ease-in-out infinite",
                        animationDelay: "2.4s",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.3), oklch(0.55 0.3 280 / 0.2))",
                            border: "1px solid oklch(0.68 0.27 322 / 0.4)",
                          }}
                        >
                          <TrendingUp
                            className="h-5 w-5"
                            style={{ color: "oklch(0.85 0.22 340)" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Promoción
                          </p>
                          <p className="text-xs font-semibold text-foreground">
                            +12.4k oyentes
                          </p>
                          {/* mini bars */}
                          <div className="flex items-end gap-0.5 h-3 mt-1">
                            {[40, 70, 55, 90, 65, 80].map((h, i) => (
                              <span
                                key={i}
                                className="w-1 rounded-sm wave-bar"
                                style={{
                                  height: `${h}%`,
                                  background:
                                    "linear-gradient(to top, oklch(0.55 0.3 280), oklch(0.85 0.22 340))",
                                  animationDelay: `${i * 0.15}s`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* connecting SVG lines */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <defs>
                        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="oklch(0.85 0.22 340)" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="oklch(0.55 0.3 280)" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      <line x1="50" y1="50" x2="50" y2="10" stroke="url(#line-grad)" strokeWidth="0.3" strokeDasharray="1 1.5" />
                      <line x1="50" y1="50" x2="12" y2="85" stroke="url(#line-grad)" strokeWidth="0.3" strokeDasharray="1 1.5" />
                      <line x1="50" y1="50" x2="88" y2="85" stroke="url(#line-grad)" strokeWidth="0.3" strokeDasharray="1 1.5" />
                    </svg>

                    {/* ambient glow halo */}
                    <div
                      className="absolute inset-0 rounded-full blur-3xl opacity-60 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(circle at center, oklch(0.68 0.27 322 / 0.45), transparent 65%)",
                      }}
                    />
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
