import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Globe2,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ScrollText,
  Lock,
  Volume2,
  Music2,
  Award,
} from "lucide-react";

/* ----------------------------- Tokens ----------------------------- */
// Electric purple (#A855F7-ish), deep blue, neon green
const PURPLE = "#A855F7";
const PURPLE_GLOW = "rgba(168, 85, 247, 0.55)";
const PURPLE_SOFT = "rgba(168, 85, 247, 0.18)";
const BG = "#0d0d11";
const BG_SOFT = "#15151c";
const NEON = "#39FF8B";
const BLUE = "#3B82F6";

/* ----------------------------- Data ----------------------------- */
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

const PLATFORMS = ["Spotify", "Apple Music", "TikTok", "Amazon Music", "YouTube Music", "Deezer", "Tidal", "Pandora"];

/* ----------------------------- Page ----------------------------- */
const RegistroMusicalPage = () => {
  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <SEO
        title="Registro Musical — Protege, Distribuye y Promociona tu Música"
        description="Registra la propiedad intelectual de tus canciones, distribúyelas en +220 plataformas globales y haz crecer tu audiencia con Musicdibs."
        path="/registro-musical"
      />
      <Navbar />

      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
        {/* glow backdrop */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 50% 40% at 20% 10%, ${PURPLE_SOFT}, transparent 70%),
              radial-gradient(ellipse 40% 35% at 90% 30%, rgba(59,130,246,0.15), transparent 70%),
              radial-gradient(ellipse 30% 25% at 60% 90%, rgba(57,255,139,0.08), transparent 70%)
            `,
          }}
        />
        {/* subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
            {/* Left: copy */}
            <div className="animate-fade-in">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] mb-6"
                style={{
                  background: PURPLE_SOFT,
                  border: `1px solid ${PURPLE_SOFT}`,
                  color: PURPLE,
                }}
              >
                <Sparkles className="h-3 w-3" />
                Nuevo · Todo en uno
              </div>

              <h1
                className="font-display font-bold text-[2.6rem] sm:text-5xl lg:text-[3.6rem] leading-[1.05] tracking-tight text-white"
                style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}
              >
                Protege, distribuye y promociona tu música a nivel{" "}
                <span
                  style={{
                    color: PURPLE,
                    textShadow: `0 0 30px ${PURPLE_GLOW}`,
                  }}
                >
                  global
                </span>
                .
              </h1>

              <p className="mt-6 text-lg text-white/65 max-w-xl leading-relaxed">
                Registra tus derechos de autor, lanza en +220 plataformas y haz
                crecer tu audiencia con Musicdibs.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all hover:scale-[1.03]"
                  style={{
                    background: PURPLE,
                    color: "#fff",
                    boxShadow: `0 0 0 1px ${PURPLE}, 0 10px 40px -8px ${PURPLE_GLOW}, 0 0 60px -10px ${PURPLE_GLOW}`,
                  }}
                >
                  Empezar ahora gratis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#servicios"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/5"
                  style={{ border: `1px solid rgba(255,255,255,0.15)` }}
                >
                  Ver demo de registro
                </a>
              </div>

              {/* small trust line */}
              <div className="mt-8 flex items-center gap-5 text-xs text-white/45">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: NEON }} />
                  Validez legal
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: NEON }} />
                  Blockchain
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: NEON }} />
                  +220 plataformas
                </span>
              </div>
            </div>

            {/* Right: License Certificate Mockup */}
            <div className="relative animate-fade-in">
              {/* halo */}
              <div
                className="absolute -inset-10 rounded-[2rem] blur-3xl opacity-70 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${PURPLE_GLOW}, transparent 60%), radial-gradient(circle at 80% 70%, rgba(59,130,246,0.4), transparent 60%)`,
                }}
              />

              <div
                className="relative rounded-[1.5rem] p-7 backdrop-blur-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: `0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
                }}
              >
                {/* header chips */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "rgba(57,255,139,0.1)",
                      color: NEON,
                      border: `1px solid rgba(57,255,139,0.25)`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: NEON, boxShadow: `0 0 8px ${NEON}` }} />
                    Registered
                  </span>
                </div>

                {/* certificate body */}
                <div
                  className="rounded-2xl p-6 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${BG_SOFT} 0%, #1a1428 100%)`,
                    border: "1px solid rgba(168,85,247,0.18)",
                  }}
                >
                  {/* seal */}
                  <div className="absolute top-5 right-5">
                    <div
                      className="relative h-16 w-16 rounded-full flex items-center justify-center"
                      style={{
                        background: `conic-gradient(from 0deg, ${PURPLE}, ${BLUE}, ${PURPLE})`,
                        boxShadow: `0 0 30px -4px ${PURPLE_GLOW}`,
                      }}
                    >
                      <div
                        className="absolute inset-1 rounded-full flex items-center justify-center"
                        style={{ background: BG_SOFT }}
                      >
                        <Award className="h-7 w-7" style={{ color: PURPLE }} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">
                    Music License Certificate
                  </p>
                  <h3 className="text-xl font-bold text-white pr-20 leading-tight">
                    Midnight Echoes
                  </h3>
                  <p className="text-sm text-white/55 mt-1">por A. Morales</p>

                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-white/40 uppercase tracking-wider text-[10px] mb-1">ID Registro</p>
                      <p className="font-mono text-white/90">0xA1f9…c4d2</p>
                    </div>
                    <div>
                      <p className="text-white/40 uppercase tracking-wider text-[10px] mb-1">Fecha</p>
                      <p className="text-white/90">Hoy · 14:32</p>
                    </div>
                    <div>
                      <p className="text-white/40 uppercase tracking-wider text-[10px] mb-1">Red</p>
                      <p className="text-white/90">Polygon · iBS</p>
                    </div>
                    <div>
                      <p className="text-white/40 uppercase tracking-wider text-[10px] mb-1">Estado</p>
                      <p className="font-semibold" style={{ color: NEON }}>Verificado</p>
                    </div>
                  </div>

                  {/* sig line */}
                  <div className="mt-6 pt-5 border-t border-white/5 flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" style={{ color: PURPLE }} />
                    <span className="text-[11px] text-white/55">
                      Firmado y sellado en blockchain
                    </span>
                  </div>
                </div>

                {/* mini distribution row */}
                <div className="mt-4 flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4" style={{ color: PURPLE }} />
                    <span className="text-xs text-white/75">Distribuyendo a 220 plataformas</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: NEON }}>
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
              style={{ color: PURPLE }}
            >
              Servicios
            </p>
            <h2 className="font-bold text-3xl sm:text-[2.5rem] leading-[1.15] text-white">
              Todo lo que tu música necesita,{" "}
              <span style={{ color: PURPLE, textShadow: `0 0 20px ${PURPLE_GLOW}` }}>
                en un solo lugar
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map(({ Icon, sub, title, desc }) => (
              <div
                key={title}
                className="group relative rounded-2xl p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)";
                  e.currentTarget.style.boxShadow = `0 20px 60px -20px ${PURPLE_GLOW}, 0 0 0 1px rgba(168,85,247,0.35)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* icon */}
                <div
                  className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6 transition-transform group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${PURPLE_SOFT}, rgba(59,130,246,0.15))`,
                    border: `1px solid rgba(168,85,247,0.3)`,
                    boxShadow: `0 0 30px -8px ${PURPLE_GLOW}`,
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: PURPLE }} />
                </div>

                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2 font-semibold">
                  {sub}
                </p>
                <h3 className="font-bold text-xl text-white mb-3 leading-tight">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>

                <div
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: PURPLE }}
                >
                  Saber más <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>

          {/* platforms ribbon */}
          <div
            id="plataformas"
            className="mt-16 rounded-2xl px-6 py-5 backdrop-blur-xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">
                Distribuimos en
              </span>
              {PLATFORMS.map((p) => (
                <span key={p} className="text-sm text-white/70 font-medium inline-flex items-center gap-1.5">
                  <Music2 className="h-3.5 w-3.5" style={{ color: PURPLE }} />
                  {p}
                </span>
              ))}
              <span className="text-sm font-semibold" style={{ color: NEON }}>
                +212 más
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= FINAL CTA ============================= */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div
            className="relative rounded-[2rem] px-6 sm:px-14 py-16 text-center overflow-hidden backdrop-blur-xl"
            style={{
              background: `linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.08))`,
              border: `1px solid rgba(168,85,247,0.25)`,
              boxShadow: `0 30px 100px -30px ${PURPLE_GLOW}`,
            }}
          >
            {/* orbs */}
            <div
              className="absolute -top-24 -left-16 h-72 w-72 rounded-full opacity-50 pointer-events-none animate-pulse"
              style={{ background: `radial-gradient(circle, ${PURPLE_GLOW}, transparent 70%)` }}
            />
            <div
              className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-40 pointer-events-none"
              style={{ background: `radial-gradient(circle, rgba(59,130,246,0.5), transparent 70%)` }}
            />

            <div className="relative">
              <Volume2 className="h-10 w-10 mx-auto mb-6" style={{ color: PURPLE }} />
              <h2 className="font-bold text-3xl sm:text-[2.5rem] leading-tight text-white">
                ¿Listo para proteger y{" "}
                <span style={{ color: PURPLE, textShadow: `0 0 25px ${PURPLE_GLOW}` }}>
                  potenciar tu música?
                </span>
              </h2>
              <p className="mt-5 text-white/65 max-w-xl mx-auto">
                Únete a miles de artistas que ya confían en Musicdibs para
                proteger, distribuir y promocionar sus obras.
              </p>
              <Link
                to="/login"
                className="mt-10 inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-sm font-semibold transition-all hover:scale-[1.04]"
                style={{
                  background: PURPLE,
                  color: "#fff",
                  boxShadow: `0 0 0 1px ${PURPLE}, 0 15px 50px -10px ${PURPLE_GLOW}, 0 0 80px -15px ${PURPLE_GLOW}`,
                }}
              >
                Unirme a Musicdibs hoy
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RegistroMusicalPage;
