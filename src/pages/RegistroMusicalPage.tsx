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
  Heart,
  Users,
  Disc3,
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
          <Navbar ctaText="Empezar AHORA" ctaHref="https://www.musicdibs.com/dashboard" />

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
                    TODO EN UNO
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
                      Empezar AHORA
                      <ArrowRight className="h-4 w-4" />
                    </Link>
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

                  {/* Floating accent card (back) — Certificate */}
                  <div
                    className="absolute -top-6 -right-4 z-10 glass rounded-2xl px-4 py-3 w-[210px] hidden sm:block"
                    style={{
                      animation: "landing-orb-float 7s ease-in-out infinite",
                      border: "1px solid oklch(0.85 0.22 340 / 0.35)",
                      boxShadow: "0 20px 50px -15px #8B5CF6",
                      transform: "rotate(4deg)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Award
                        className="h-4 w-4"
                        style={{ color: "oklch(0.85 0.22 340)" }}
                      />
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Certificado
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Obra registrada
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      0xA1f9…c4d2
                    </p>
                  </div>

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
                        musicdibs · panel
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
                          <Music2 className="h-6 w-6 text-white relative z-10" />
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
                            Tu nuevo single
                          </p>
                          <p className="text-sm font-semibold text-foreground truncate">
                            Midnight Echoes
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            3:42 · Electronic
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

                      {[
                        {
                          Icon: ShieldCheck,
                          label: "Registro",
                          value: "Propiedad Intelectual",
                          meta: "Blockchain · Validez legal",
                          done: true,
                        },
                        {
                          Icon: Globe2,
                          label: "Distribución",
                          value: "+220 plataformas",
                          meta: "Spotify · Apple · TikTok · YouTube",
                          done: true,
                        },
                        {
                          Icon: TrendingUp,
                          label: "Promoción",
                          value: "+12.4k oyentes",
                          meta: "Crecimiento +28% esta semana",
                          done: false,
                        },
                      ].map(({ Icon, label, value, meta, done }, i) => (
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
                              <CheckCircle2 className="h-3 w-3 text-white" />
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
                                OK
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
                                Activo
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating accent card (front) — Stats */}
                  <div
                    className="absolute -bottom-6 -left-4 z-30 glass rounded-2xl px-4 py-3 w-[200px] hidden sm:block"
                    style={{
                      animation: "landing-orb-float 8s ease-in-out infinite",
                      animationDelay: "1.5s",
                      border: "1px solid oklch(0.85 0.22 340 / 0.4)",
                      boxShadow:
                        "0 25px 50px -10px #8B5CF6, 0 0 30px -5px oklch(0.85 0.22 340 / 0.5)",
                      transform: "rotate(-3deg)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2
                        className="h-4 w-4"
                        style={{ color: "oklch(0.85 0.22 340)" }}
                      />
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Reproducciones
                      </span>
                    </div>
                    <p
                      className="text-xl font-bold"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.95 0.1 340), #8B5CF6)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      48.219
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp
                        className="h-3 w-3"
                        style={{ color: "oklch(0.85 0.22 340)" }}
                      />
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: "oklch(0.85 0.22 340)" }}
                      >
                        +28% esta semana
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
