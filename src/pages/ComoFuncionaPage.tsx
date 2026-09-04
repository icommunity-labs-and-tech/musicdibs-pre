import { Helmet } from "react-helmet-async";
import "@/styles/landing-ai-studio.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BackgroundScene } from "@/components/landing/BackgroundScene";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SocialBanner } from "@/components/landing/SocialBanner";
import {
  UploadCloud,
  ShieldCheck,
  Sparkles,
  Globe2,
  FileCheck2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type ComoLang = "es" | "en" | "pt-BR";

interface ComoCopy {
  seoTitle: string;
  seoDesc: string;
  badge: string;
  h1: string;
  heroSub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  stepsTitle: string;
  stepsSub: string;
  steps: { title: string; desc: string }[];
  getTitle: string;
  getItems: string[];
  finalTitle: string;
  finalSub: string;
  finalCta: string;
}

const COPY: Record<ComoLang, ComoCopy> = {
  es: {
    seoTitle: "Cómo funciona Musicdibs: registro blockchain e IA musical",
    seoDesc:
      "Descubre paso a paso cómo registrar tu música con certificado blockchain, crear canciones con IA y distribuirlas sin comisiones sobre tus royalties.",
    badge: "Cómo funciona",
    h1: "Así de fácil es proteger y crear tu música",
    heroSub:
      "Musicdibs combina registro de propiedad intelectual en blockchain con un estudio de IA completo. En menos de 5 minutos tu obra queda protegida con evidencia legal.",
    ctaPrimary: "🚀 Registra tu 1ª canción gratis",
    ctaSecondary: "Ver precios",
    stepsTitle: "Paso a paso",
    stepsSub: "De la idea al certificado blockchain en cuatro pasos.",
    steps: [
      {
        title: "1. Crea tu cuenta gratis",
        desc: "Regístrate en segundos con tu email o con Google. Recibirás 1 crédito de bienvenida para registrar tu primera obra sin coste.",
      },
      {
        title: "2. Sube tu obra",
        desc: "Sube el audio, la letra o la partitura de tu canción. Añade coautores y reparte los porcentajes de propiedad entre todos.",
      },
      {
        title: "3. Obtén tu certificado blockchain",
        desc: "Sellamos la huella digital de tu obra en blockchain con fecha y hora certificadas. Recibes un PDF con validez probatoria en más de 180 países.",
      },
      {
        title: "4. Crea y distribuye con IA",
        desc: "Usa el AI Music Studio para generar canciones, portadas y vídeos, y distribuye tu música en Spotify, Apple Music y más de 150 plataformas.",
      },
    ],
    getTitle: "Qué consigues con Musicdibs",
    getItems: [
      "Certificado blockchain con evidencia de autoría y fecha cierta",
      "Musicdibs no cobra ninguna comisión sobre tus royalties de streaming",
      "AI Music Studio: genera música, letras, portadas y vídeos con IA",
      "Distribución mundial en más de 150 plataformas digitales",
      "Panel de managers y protección para coautorías",
    ],
    finalTitle: "Empieza hoy, gratis",
    finalSub:
      "Tu primera obra registrada con certificado blockchain es gratis. Sin tarjeta.",
    finalCta: "🚀 Registrar mi canción gratis",
  },
  en: {
    seoTitle: "How Musicdibs works: blockchain registration & AI music",
    seoDesc:
      "Step by step: register your music with a blockchain certificate, create songs with AI and distribute them with no commission on your streaming royalties.",
    badge: "How it works",
    h1: "Protecting and creating your music is this easy",
    heroSub:
      "Musicdibs combines blockchain intellectual property registration with a full AI studio. In under 5 minutes your work is protected with legal evidence.",
    ctaPrimary: "🚀 Register your 1st song free",
    ctaSecondary: "See pricing",
    stepsTitle: "Step by step",
    stepsSub: "From idea to blockchain certificate in four steps.",
    steps: [
      {
        title: "1. Create your free account",
        desc: "Sign up in seconds with your email or Google. You'll get 1 welcome credit to register your first work at no cost.",
      },
      {
        title: "2. Upload your work",
        desc: "Upload the audio, lyrics or score of your song. Add co-authors and split ownership percentages between everyone.",
      },
      {
        title: "3. Get your blockchain certificate",
        desc: "We seal your work's digital fingerprint on the blockchain with certified date and time. You receive a PDF with evidentiary validity in 180+ countries.",
      },
      {
        title: "4. Create and distribute with AI",
        desc: "Use the AI Music Studio to generate songs, covers and videos, and distribute your music on Spotify, Apple Music and 150+ platforms.",
      },
    ],
    getTitle: "What you get with Musicdibs",
    getItems: [
      "Blockchain certificate with proof of authorship and certified date",
      "Musicdibs does not charge any commission on your streaming royalties",
      "AI Music Studio: generate music, lyrics, covers and videos with AI",
      "Worldwide distribution on 150+ digital platforms",
      "Managers dashboard and co-authorship protection",
    ],
    finalTitle: "Start today, for free",
    finalSub:
      "Your first registered work with a blockchain certificate is free. No card required.",
    finalCta: "🚀 Register my song free",
  },
  "pt-BR": {
    seoTitle: "Como funciona o Musicdibs: registro blockchain e música com IA",
    seoDesc:
      "Veja o passo a passo: registre sua música com certificado blockchain, crie canções com IA e distribua sem comissão sobre seus royalties de streaming.",
    badge: "Como funciona",
    h1: "Proteger e criar sua música é assim tão fácil",
    heroSub:
      "O Musicdibs combina registro de propriedade intelectual em blockchain com um estúdio de IA completo. Em menos de 5 minutos sua obra fica protegida com evidência legal.",
    ctaPrimary: "🚀 Registre sua 1ª música grátis",
    ctaSecondary: "Ver preços",
    stepsTitle: "Passo a passo",
    stepsSub: "Da ideia ao certificado blockchain em quatro passos.",
    steps: [
      {
        title: "1. Crie sua conta grátis",
        desc: "Cadastre-se em segundos com seu e-mail ou Google. Você recebe 1 crédito de boas-vindas para registrar sua primeira obra sem custo.",
      },
      {
        title: "2. Envie sua obra",
        desc: "Envie o áudio, a letra ou a partitura da sua música. Adicione coautores e divida os percentuais de propriedade entre todos.",
      },
      {
        title: "3. Receba seu certificado blockchain",
        desc: "Selamos a impressão digital da sua obra em blockchain com data e hora certificadas. Você recebe um PDF com validade probatória em mais de 180 países.",
      },
      {
        title: "4. Crie e distribua com IA",
        desc: "Use o AI Music Studio para gerar músicas, capas e vídeos, e distribua sua música no Spotify, Apple Music e mais de 150 plataformas.",
      },
    ],
    getTitle: "O que você ganha com o Musicdibs",
    getItems: [
      "Certificado blockchain com prova de autoria e data certa",
      "O Musicdibs não cobra nenhuma comissão sobre seus royalties de streaming",
      "AI Music Studio: gere músicas, letras, capas e vídeos com IA",
      "Distribuição mundial em mais de 150 plataformas digitais",
      "Painel para managers e proteção de coautorias",
    ],
    finalTitle: "Comece hoje, de graça",
    finalSub:
      "Seu primeiro registro com certificado blockchain é grátis. Sem cartão.",
    finalCta: "🚀 Registrar minha música grátis",
  },
};

const STEP_ICONS = [UploadCloud, FileCheck2, ShieldCheck, Sparkles];

export default function ComoFuncionaPage() {
  const { i18n } = useTranslation();
  const lang: ComoLang = (["es", "en", "pt-BR"].includes(i18n.language)
    ? i18n.language
    : "es") as ComoLang;
  const c = COPY[lang];
  const canonicalUrl = "https://musicdibs.com/como-funciona";

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{c.seoTitle}</title>
        <meta name="description" content={c.seoDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={c.seoTitle} />
        <meta property="og:description" content={c.seoDesc} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: c.stepsTitle,
            description: c.seoDesc,
            step: c.steps.map((s, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              name: s.title,
              text: s.desc,
            })),
          })}
        </script>
      </Helmet>
      <div className="landing-ai-studio">
        <main className="relative min-h-screen overflow-hidden font-sans text-[oklch(0.98_0.01_295)] pb-16">
        <BackgroundScene />
        <Navbar ctaText={c.ctaPrimary} />
        <div className="relative pt-28 sm:pt-36">
          {/* Hero */}
          <section className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.98_0.01_295/0.15)] bg-[oklch(0.98_0.01_295/0.06)] px-4 py-1.5 text-xs sm:text-sm font-medium text-[oklch(0.98_0.01_295/0.85)]">
              <ShieldCheck className="h-4 w-4" />
              {c.badge}
            </span>
            <h1 className="mt-6 text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              {c.h1}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[oklch(0.98_0.01_295/0.75)] max-w-2xl mx-auto">
              {c.heroSub}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://musicdibs.com/login?tab=register"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm sm:text-base font-semibold text-primary-foreground shadow-[var(--shadow-magenta)] transition-transform hover:scale-105"
                style={{
                  background:
                    "linear-gradient(135deg, #8B5CF6 0%, oklch(0.68 0.27 322) 100%)",
                }}
              >
                {c.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/registro-musical"
                className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.98_0.01_295/0.2)] px-6 py-3 text-sm sm:text-base font-medium text-[oklch(0.98_0.01_295/0.85)] hover:bg-[oklch(0.98_0.01_295/0.06)] transition-colors"
              >
                {c.ctaSecondary}
              </Link>
            </div>
          </section>

          {/* Steps */}
          <section className="mx-auto max-w-5xl px-4 sm:px-6 mt-20 sm:mt-28">
            <h2 className="text-2xl sm:text-4xl font-bold text-center">{c.stepsTitle}</h2>
            <p className="mt-3 text-center text-[oklch(0.98_0.01_295/0.7)]">{c.stepsSub}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {c.steps.map((step, i) => {
                const Icon = STEP_ICONS[i] ?? Sparkles;
                return (
                  <article
                    key={step.title}
                    className="rounded-2xl border border-[oklch(0.98_0.01_295/0.1)] bg-[oklch(0.14_0.06_295/0.55)] backdrop-blur-md p-6"
                  >
                    <div
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
                      style={{
                        background:
                          "linear-gradient(135deg, #8B5CF6 0%, oklch(0.68 0.27 322) 100%)",
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-[oklch(0.98_0.01_295/0.72)] leading-relaxed">
                      {step.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          {/* What you get */}
          <section className="mx-auto max-w-3xl px-4 sm:px-6 mt-20 sm:mt-28">
            <div className="rounded-3xl border border-[oklch(0.98_0.01_295/0.1)] bg-[oklch(0.14_0.06_295/0.55)] backdrop-blur-md p-8 sm:p-10">
              <div className="flex items-center gap-3">
                <Globe2 className="h-6 w-6 text-[oklch(0.8_0.2_322)]" />
                <h2 className="text-xl sm:text-2xl font-bold">{c.getTitle}</h2>
              </div>
              <ul className="mt-6 space-y-3">
                {c.getItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm sm:text-base text-[oklch(0.98_0.01_295/0.85)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.75_0.18_160)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Final CTA */}
          <section className="mx-auto max-w-3xl px-4 sm:px-6 mt-20 sm:mt-28 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold">{c.finalTitle}</h2>
            <p className="mt-3 text-[oklch(0.98_0.01_295/0.72)]">{c.finalSub}</p>
            <a
              href="https://musicdibs.com/login?tab=register"
              className="mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-semibold text-primary-foreground shadow-[var(--shadow-magenta)] transition-transform hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, #8B5CF6 0%, oklch(0.68 0.27 322) 100%)",
              }}
            >
              {c.finalCta}
              <ArrowRight className="h-4 w-4" />
            </a>
          </section>
        </div>
        <SocialBanner />
        <Footer />
        </main>
      </div>
    </>
  );
}
