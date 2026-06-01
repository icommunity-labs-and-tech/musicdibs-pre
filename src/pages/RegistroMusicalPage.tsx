import { Helmet } from "react-helmet-async";
import "@/styles/landing-ai-studio.css";
import { Link } from "react-router-dom";
import { BackgroundScene } from "@/components/landing/BackgroundScene";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SocialBanner } from "@/components/landing/SocialBanner";
import { PricingSection } from "@/components/PricingSection";
import urbanArtistInstagram from "@/assets/urban-artist-instagram.jpg";
import urbanArtistTiktok from "@/assets/urban-artist-tiktok.jpg";
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
    desc: "Crea canciones y actívalas en los canales oficiales de Musicdibs.",
  },
];

const PLATFORMS = [
  "Spotify",
  "Apple Music",
  "TikTok",
  "Amazon Music",
  "YouTube Music",
];

export default function RegistroMusicalPage() {
  return (
    <>
      <Helmet>
        <title>Registro Musical · Protege y distribuye tu música</title>
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
                    Protege y distribuye tu música a nivel{" "}
                    <span className="text-gradient-brand">global</span>.
                  </h1>

                  <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                    Registra tus derechos de autor en minutos, lanza en +220 plataformas y
                    quédate con el 100 % de tus ingresos. Mantén tu libertad como artista. 
                  </p>

                  <div className="mt-9 flex flex-col sm:flex-row gap-3">
                    <a
                      href="https://www.musicdibs.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                    >
                      Empezar AHORA
                      <ArrowRight className="h-4 w-4" />
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
                    + 215 más
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
                  Reseñas · Artistas
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-4">
                  Qué dicen los <span className="text-gradient-brand">artistas de nosotros</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  Miles de músicos confían en Musicdibs para proteger su obra. Escucha sus experiencias.
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
                          Certificado Blockchain
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
                        Verificado
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
                      {[
                        { k: "Obra", v: "Midnight Echoes" },
                        { k: "Autor", v: "Tú · 100%" },
                        { k: "Fecha", v: "27/05/2026" },
                        { k: "Red", v: "Polygon" },
                      ].map(({ k, v }) => (
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
                      Convenio de Berna · Validez en 181 países
                    </div>
                  </div>
                </div>

                {/* Copy */}
                <div className="order-1 lg:order-2">
                  <p
                    className="text-xs uppercase tracking-[0.28em] mb-4 font-semibold"
                    style={{ color: "oklch(0.85 0.22 340)" }}
                  >
                    Registro · Derechos de autor
                  </p>
                  <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-5">
                    Tu obra, <span className="text-gradient-brand">protegida para siempre</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-7 max-w-xl">
                    Generamos un certificado blockchain inmutable con sello de tiempo
                    que acredita tu autoría con validez legal internacional. Sin papeleos,
                    sin esperas, sin intermediarios.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Certificación en minutos con hash único y verificable",
                      "Validez legal bajo el Convenio de Berna (181 países)",
                      "Descarga tu certificado PDF en cualquier momento",
                      "Protege letras, melodías, masters y demos",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-foreground/85">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://www.musicdibs.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                  >
                    Registrar mi obra
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
                    Distribución global
                  </p>
                  <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-5">
                    Tu música en <span className="text-gradient-brand">+220 plataformas</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-7 max-w-xl">
                    Lanza tus canciones en Spotify, Apple Music, TikTok, YouTube Music,
                    Amazon Music y más, desde un único panel. Conserva el 95% de tus
                    derechos y royalties.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Subida ilimitada de singles, EPs y álbumes",
                      "Programación de fecha de lanzamiento global",
                      "Royalties al 95% para el artista",
                      "Estadísticas unificadas de todas las plataformas",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-foreground/85">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://www.musicdibs.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-magenta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
                  >
                    Distribuir mi música
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="relative">
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
                          Lanzamiento global
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">en curso</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Spotify", c: "#1DB954" },
                        { name: "Apple Music", c: "#FA243C" },
                        { name: "TikTok", c: "#25F4EE" },
                        { name: "YouTube Music", c: "#FF0033" },
                        { name: "Amazon Music", c: "#00A8E1" },
                      ].map(({ name, c }) => (
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
                              background: `${c}22`,
                              border: `1px solid ${c}55`,
                            }}
                          >
                            <Disc3 className="h-4 w-4" style={{ color: c }} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                            <p className="text-[10px] text-muted-foreground">Activo</p>
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
                          <Heart className="h-3.5 w-3.5 text-white" />
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
                        className="aspect-[3/4] rounded-xl mb-3 overflow-hidden relative"
                        style={{
                          background:
                            "linear-gradient(135deg, #F58529, #DD2A7B 50%, #8134AF)",
                        }}
                      >
                        <img
                          src={urbanArtistInstagram}
                          alt="Artista urbano promocionado en Instagram Reels"
                          loading="lazy"
                          width={768}
                          height={1024}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white/95 font-semibold">
                          Tu single en Reels
                        </div>
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
                        className="aspect-[3/4] rounded-xl mb-3 overflow-hidden relative"
                        style={{
                          background:
                            "linear-gradient(135deg, #25F4EE 0%, #000000 50%, #FE2C55 100%)",
                        }}
                      >
                        <img
                          src={urbanArtistTiktok}
                          alt="Artista urbana promocionada en TikTok"
                          loading="lazy"
                          width={768}
                          height={1024}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white/95 font-semibold">
                          Trend con tu sonido
                        </div>
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
                    Promoción · TikTok & Instagram
                  </p>
                  <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-foreground mb-5">
                    Haz que tu música <span className="text-gradient-brand">se vuelva viral</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-7 max-w-xl">
                    Crea o mejora tus canciones, genera contenido visual con
                    IA y promociona tu música a través de los canales oficiales de
                    Musicdibs en TikTok e Instagram.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3 text-sm text-foreground/85">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                      <span>
                        Publicación en{" "}
                        <a
                          href="https://www.instagram.com/musicdibs/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: "oklch(0.85 0.22 340)" }}
                        >
                          @musicdibs
                        </a>{" "}
                        (Instagram) y{" "}
                        <a
                          href="https://www.tiktok.com/@musicdibs_"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: "oklch(0.85 0.22 340)" }}
                        >
                          @musicdibs_
                        </a>{" "}
                        (TikTok)
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-foreground/85">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                      Creatividades adaptadas a Reels y formato vertical
                    </li>
                    <li className="flex items-start gap-3 text-sm text-foreground/85">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.85 0.22 340)" }} />
                      Audiencias afines para multiplicar tus reproducciones
                    </li>
                  </ul>
                  <a
                    href="https://www.musicdibs.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
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
