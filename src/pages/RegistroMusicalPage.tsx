import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Globe2,
  Megaphone,
  FileCheck,
  Upload,
  Rocket,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Music2,
} from "lucide-react";

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: "Registro de Obra",
    desc: "Protege tu propiedad intelectual de forma digital, segura y con validez legal inmediata.",
  },
  {
    Icon: Globe2,
    title: "Distribución Global",
    desc: "Lleva tu música a más de 220 plataformas digitales (Spotify, Apple Music, TikTok, Amazon, etc.).",
  },
  {
    Icon: Megaphone,
    title: "Promoción Musicdibs",
    desc: "Impulsa tus lanzamientos en nuestros canales oficiales y llega a una comunidad de miles de oyentes y profesionales.",
  },
];

const STEPS = [
  {
    Icon: Upload,
    title: "Sube y registra",
    desc: "Subes tu tema y registras tus derechos de autor en minutos, con certificación blockchain.",
  },
  {
    Icon: Globe2,
    title: "Distribuimos por ti",
    desc: "Nosotros nos encargamos de distribuirla a todo el mundo en más de 220 plataformas.",
  },
  {
    Icon: Rocket,
    title: "Promoción activada",
    desc: "Activamos la maquinaria de promoción en los canales oficiales de Musicdibs.",
  },
];

const STATS = [
  { value: "+220", label: "Plataformas" },
  { value: "100%", label: "Seguro y legal" },
  { value: "Miles", label: "de oyentes alcanzados" },
];

const RegistroMusicalPage = () => {
  return (
    <div className="min-h-screen page-bg">
      <SEO
        title="Registro Musical — Protege, Distribuye y Promociona tu Música"
        description="Registra la propiedad intelectual de tus canciones, distribúyelas en +220 plataformas globales y haz crecer tu audiencia con Musicdibs."
        path="/registro-musical"
      />
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 20% 10%, oklch(0.68 0.27 322 / 0.25), transparent 60%), radial-gradient(ellipse at 85% 30%, oklch(0.6 0.3 285 / 0.22), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-foreground/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-magenta-glow mb-6">
                <Sparkles className="h-3 w-3" />
                Todo en un mismo lugar
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
                Protege, distribuye y{" "}
                <span className="text-gradient-brand">promociona tu música</span>{" "}
                en un solo lugar.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                Registra la propiedad intelectual de tus canciones, llega a más
                de 220 plataformas globales y haz crecer tu audiencia con los
                canales de Musicdibs.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 shadow-[var(--shadow-magenta)] hover:scale-105 transition-transform"
                >
                  <Link to="/login">
                    Empieza ahora gratis
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-7"
                >
                  <a href="#como-funciona">Saber más</a>
                </Button>
              </div>
            </div>

            {/* Visual mockup */}
            <div className="relative animate-fade-in">
              <div
                className="absolute -inset-6 rounded-3xl opacity-50 blur-2xl pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.5), oklch(0.6 0.3 285 / 0.5))",
                }}
              />
              <div className="relative glass rounded-3xl p-6 sm:p-8 overflow-hidden">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-magenta-glow">
                    Certificado · Blockchain
                  </span>
                </div>

                <div className="rounded-2xl border border-border bg-deep/40 p-5 mb-4">
                  <div className="flex items-start gap-4">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.3), oklch(0.6 0.25 285 / 0.3))",
                        boxShadow: "0 0 24px -4px oklch(0.68 0.27 322 / 0.6)",
                      }}
                    >
                      <FileCheck className="h-6 w-6 text-pink" style={{ color: "oklch(0.85 0.22 340)" }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">Mi Nueva Canción.mp3</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                        0xA1f9…c4d2 · Sellado hoy
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        Propiedad intelectual verificada
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {["Spotify", "Apple Music", "TikTok"].map((p) => (
                    <div
                      key={p}
                      className="rounded-xl border border-border bg-deep/40 p-3 text-center"
                    >
                      <Music2 className="h-4 w-4 mx-auto mb-1.5 text-magenta-glow" />
                      <p className="text-[11px] font-medium">{p}</p>
                      <p className="text-[10px] text-green-500 mt-0.5">Activo</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-border bg-deep/40 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-magenta-glow" />
                    <span className="text-xs font-medium">Promoción en redes</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-green-500">
                    En curso
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="caracteristicas" className="relative py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.22em] text-magenta-glow mb-3">
              Características
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
              Todo lo que necesita tu música, en un solo flujo
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="group relative glass rounded-2xl p-7 card-hover transition-all"
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-5 transition-all group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.25), oklch(0.6 0.25 285 / 0.25))",
                    boxShadow: "0 0 20px -4px oklch(0.68 0.27 322 / 0.6)",
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: "oklch(0.85 0.22 340)" }} />
                </span>
                <h3 className="font-display font-semibold text-xl mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="relative py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.22em] text-magenta-glow mb-3">
              Cómo funciona
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
              De tu estudio al mundo en 3 pasos
            </h2>
          </div>

          <div className="relative grid md:grid-cols-3 gap-6">
            {STEPS.map(({ Icon, title, desc }, idx) => (
              <div
                key={title}
                className="relative glass rounded-2xl p-7 text-center"
              >
                <span
                  className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold font-display"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.68 0.27 322), oklch(0.6 0.3 285))",
                    color: "oklch(0.98 0.01 295)",
                    boxShadow: "0 0 20px -2px oklch(0.68 0.27 322 / 0.8)",
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  className="mt-3 inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.25), oklch(0.6 0.25 285 / 0.25))",
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: "oklch(0.85 0.22 340)" }} />
                </span>
                <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="glass rounded-3xl px-6 sm:px-10 py-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-magenta/10 via-transparent to-pink/10 pointer-events-none" />
            <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-display font-bold text-4xl sm:text-5xl text-gradient-brand">
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative glass rounded-3xl px-6 sm:px-12 py-14 text-center overflow-hidden glow-magenta">
            <div
              className="absolute -top-24 -left-16 h-64 w-64 rounded-full opacity-60 orb pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.68 0.27 322 / 0.55), transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-50 orb pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.6 0.3 285 / 0.5), transparent 70%)",
                animationDelay: "1.5s",
              }}
            />
            <div className="relative">
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
                ¿Listo para llevar tu música al{" "}
                <span className="text-gradient-brand">siguiente nivel?</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Únete a miles de artistas que ya protegen, distribuyen y
                promocionan su música con Musicdibs.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 rounded-full px-8 shadow-[var(--shadow-magenta)] hover:scale-105 transition-transform"
              >
                <Link to="/login">
                  Registrar mi canción hoy
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RegistroMusicalPage;
