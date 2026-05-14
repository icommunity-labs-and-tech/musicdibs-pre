import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { CompetitorComparison } from "@/components/CompetitorComparison";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, Clock, Globe, FileCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type Lang = "es" | "en" | "pt-BR";

const COPY: Record<Lang, {
  seoTitle: string; seoDesc: string;
  badge: string; h1: string; subtitle: string; ctaPrimary: string; ctaSecondary: string;
  whyTitle: string; why: { title: string; desc: string }[];
  stepsTitle: string; steps: { title: string; desc: string }[];
  vsTitle: string; vsIntro: string;
  vsRows: { feature: string; trad: string; mdb: string }[];
  faqTitle: string; faq: { q: string; a: string }[];
  closingTitle: string; closingDesc: string; closingCta: string;
}> = {
  es: {
    seoTitle: "Registro de Obras Musicales en Blockchain",
    seoDesc: "Registra tus canciones con certificación blockchain en minutos. Prueba legal de autoría válida en España y +60 países. Desde 2,99 €.",
    badge: "Registro de propiedad intelectual",
    h1: "Registro de obras musicales en blockchain",
    subtitle: "Protege la autoría de tus canciones con un certificado blockchain válido legalmente. Sin papeleo, sin esperas, en menos de 5 minutos.",
    ctaPrimary: "Registrar mi obra",
    ctaSecondary: "Ver validez legal",
    whyTitle: "¿Por qué registrar tu música con Musicdibs?",
    why: [
      { title: "Validez legal internacional", desc: "Certificado reconocido por el Convenio de Berna en más de 180 países, con sello de tiempo blockchain inalterable." },
      { title: "Registro en minutos", desc: "Sube el archivo, paga y recibe tu certificado. No hay listas de espera ni trámites burocráticos." },
      { title: "Coste imbatible", desc: "Desde 2,99 € por obra. Sin cuotas de mantenimiento ni renovaciones obligatorias." },
      { title: "Prueba técnica indeleble", desc: "Tu obra queda anclada en blockchain con su huella digital única — imposible de falsificar o modificar." },
    ],
    stepsTitle: "Cómo registrar una canción paso a paso",
    steps: [
      { title: "1. Sube el archivo original", desc: "Audio, partitura, letra o vídeo. Aceptamos los formatos más comunes hasta 100 MB por archivo." },
      { title: "2. Identifica autores y participantes", desc: "Indica los compositores, letristas, productores y porcentajes de autoría de cada uno." },
      { title: "3. Firma y paga", desc: "Confirma con tu firma digital verificada por iBS y completa el pago. Desde 2,99 €." },
      { title: "4. Recibe tu certificado blockchain", desc: "En pocos minutos descargas el certificado PDF con hash, timestamp y enlace de verificación pública." },
    ],
    vsTitle: "Registro tradicional vs Musicdibs blockchain",
    vsIntro: "El Registro de la Propiedad Intelectual sigue siendo válido, pero hay alternativas más rápidas y baratas con la misma fuerza probatoria.",
    vsRows: [
      { feature: "Tiempo de registro", trad: "3 a 12 meses", mdb: "Menos de 5 minutos" },
      { feature: "Coste por obra", trad: "13,80 € + tasas", mdb: "Desde 2,99 €" },
      { feature: "Validez internacional", trad: "Solo España (extensión por convenios)", mdb: "+180 países (Convenio de Berna)" },
      { feature: "Verificación pública", trad: "Solicitud presencial o por correo", mdb: "Instantánea online con un clic" },
      { feature: "Modificación posterior", trad: "Imposible o muy lenta", mdb: "Imposible (inmutable por diseño)" },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      { q: "¿Es legal registrar una canción en blockchain?", a: "Sí. La normativa europea (eIDAS) y el Convenio de Berna reconocen los sellos de tiempo electrónicos como prueba de fecha cierta. El certificado de Musicdibs constituye una evidencia técnica admisible en juicio." },
      { q: "¿Sustituye al Registro de la Propiedad Intelectual?", a: "Lo complementa. Para muchos autores es suficiente porque demuestra autoría y fecha. Si tu obra entra en disputa, ambos registros son compatibles." },
      { q: "¿Qué pasa si pierdo el archivo original?", a: "El certificado guarda la huella digital (hash) del archivo, no el archivo en sí. Necesitas el original para verificar coincidencia. Recomendamos guardar siempre una copia segura." },
      { q: "¿Puedo registrar una letra sin la música?", a: "Sí. Puedes registrar letras, partituras, demos, masters, vídeos o cualquier archivo que represente tu obra creativa." },
      { q: "¿Quién valida la autoría declarada?", a: "El sistema certifica fecha y existencia del archivo, no la veracidad de la autoría declarada — igual que cualquier registro. La autoría se prueba con el archivo original más documentación complementaria." },
    ],
    closingTitle: "Empieza a proteger tu música hoy",
    closingDesc: "Únete a miles de artistas que ya registran sus obras con la prueba de autoría más rápida del mercado.",
    closingCta: "Crear cuenta gratis",
  },
  en: {
    seoTitle: "Register Songs on Blockchain — Music Copyright Made Easy",
    seoDesc: "Register your songs with blockchain-certified proof of authorship in minutes. Legally valid in 180+ countries via the Berne Convention. From €2.99.",
    badge: "Intellectual property registration",
    h1: "Register your songs on blockchain",
    subtitle: "Protect your music with legally valid blockchain proof of authorship. No paperwork, no waiting — done in under 5 minutes.",
    ctaPrimary: "Register my song",
    ctaSecondary: "See legal validity",
    whyTitle: "Why register your music with Musicdibs?",
    why: [
      { title: "International legal validity", desc: "Certificate recognized by the Berne Convention across 180+ countries, with a tamper-proof blockchain timestamp." },
      { title: "Registered in minutes", desc: "Upload the file, pay and get your certificate. No queues, no bureaucracy." },
      { title: "Unbeatable cost", desc: "From €2.99 per work. No maintenance fees, no mandatory renewals." },
      { title: "Indelible technical proof", desc: "Your work is anchored on-chain with its unique digital fingerprint — impossible to forge or alter." },
    ],
    stepsTitle: "How to register a song step by step",
    steps: [
      { title: "1. Upload the original file", desc: "Audio, score, lyrics or video. We accept all common formats up to 100 MB per file." },
      { title: "2. Identify authors and contributors", desc: "List composers, lyricists, producers and the authorship share for each." },
      { title: "3. Sign and pay", desc: "Confirm with your iBS-verified digital signature and complete payment. From €2.99." },
      { title: "4. Receive your blockchain certificate", desc: "Within minutes you download the PDF certificate with hash, timestamp and a public verification link." },
    ],
    vsTitle: "Traditional copyright registration vs Musicdibs blockchain",
    vsIntro: "Government copyright offices remain valid, but there are faster and cheaper alternatives with equivalent evidentiary weight.",
    vsRows: [
      { feature: "Registration time", trad: "3 to 12 months", mdb: "Under 5 minutes" },
      { feature: "Cost per work", trad: "$45+ (USCO) / €13.80+ (EU)", mdb: "From €2.99" },
      { feature: "International validity", trad: "Country-specific (treaties extend it)", mdb: "180+ countries (Berne Convention)" },
      { feature: "Public verification", trad: "By mail or in person", mdb: "Instant online, one click" },
      { feature: "Post-registration changes", trad: "Impossible or very slow", mdb: "Impossible (immutable by design)" },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "Is it legal to register a song on blockchain?", a: "Yes. EU regulation (eIDAS) and the Berne Convention recognize electronic timestamps as proof of a certain date. The Musicdibs certificate is technical evidence admissible in court." },
      { q: "Does it replace official copyright registration?", a: "It complements it. For most authors it is enough because it proves authorship and date. If your work is ever disputed, both registrations are compatible." },
      { q: "What if I lose the original file?", a: "The certificate stores the file's digital fingerprint (hash), not the file itself. You need the original to verify a match. Always keep a safe backup." },
      { q: "Can I register lyrics without the music?", a: "Yes. You can register lyrics, scores, demos, masters, videos or any file that represents your creative work." },
      { q: "Who validates the declared authorship?", a: "The system certifies the date and existence of the file, not the truthfulness of the declared authorship — same as any registry. Authorship is proven with the original file plus supporting documentation." },
    ],
    closingTitle: "Start protecting your music today",
    closingDesc: "Join thousands of artists who already register their works with the fastest proof of authorship on the market.",
    closingCta: "Create free account",
  },
  "pt-BR": {
    seoTitle: "Registro de Obras Musicais em Blockchain",
    seoDesc: "Registre suas músicas com certificação blockchain em minutos. Prova legal de autoria válida no Brasil e em mais de 180 países. A partir de R$ 19.",
    badge: "Registro de propriedade intelectual",
    h1: "Registro de obras musicais em blockchain",
    subtitle: "Proteja a autoria das suas músicas com um certificado blockchain legalmente válido. Sem burocracia, sem espera, em menos de 5 minutos.",
    ctaPrimary: "Registrar minha obra",
    ctaSecondary: "Ver validade legal",
    whyTitle: "Por que registrar sua música com a Musicdibs?",
    why: [
      { title: "Validade legal internacional", desc: "Certificado reconhecido pela Convenção de Berna em mais de 180 países, com carimbo de tempo blockchain inalterável." },
      { title: "Registro em minutos", desc: "Envie o arquivo, pague e receba seu certificado. Sem filas nem burocracia." },
      { title: "Custo imbatível", desc: "A partir de R$ 19 por obra. Sem mensalidades nem renovações obrigatórias." },
      { title: "Prova técnica indelével", desc: "Sua obra é ancorada na blockchain com sua impressão digital única — impossível de falsificar ou alterar." },
    ],
    stepsTitle: "Como registrar uma música passo a passo",
    steps: [
      { title: "1. Envie o arquivo original", desc: "Áudio, partitura, letra ou vídeo. Aceitamos os formatos mais comuns até 100 MB por arquivo." },
      { title: "2. Identifique autores e participantes", desc: "Indique compositores, letristas, produtores e a porcentagem de autoria de cada um." },
      { title: "3. Assine e pague", desc: "Confirme com sua assinatura digital verificada pela iBS e finalize o pagamento. A partir de R$ 19." },
      { title: "4. Receba seu certificado blockchain", desc: "Em poucos minutos você baixa o certificado em PDF com hash, timestamp e link de verificação pública." },
    ],
    vsTitle: "Registro tradicional vs Musicdibs blockchain",
    vsIntro: "Os registros oficiais (Biblioteca Nacional, ECAD) seguem válidos, mas há alternativas mais rápidas e baratas com a mesma força probatória.",
    vsRows: [
      { feature: "Tempo de registro", trad: "3 a 12 meses", mdb: "Menos de 5 minutos" },
      { feature: "Custo por obra", trad: "R$ 80+ (Biblioteca Nacional)", mdb: "A partir de R$ 19" },
      { feature: "Validade internacional", trad: "Brasil (extensão por convenções)", mdb: "+180 países (Convenção de Berna)" },
      { feature: "Verificação pública", trad: "Presencial ou por correio", mdb: "Instantânea online, um clique" },
      { feature: "Alteração posterior", trad: "Impossível ou muito lenta", mdb: "Impossível (imutável por design)" },
    ],
    faqTitle: "Perguntas frequentes",
    faq: [
      { q: "É legal registrar uma música em blockchain?", a: "Sim. A regulamentação europeia (eIDAS) e a Convenção de Berna reconhecem carimbos de tempo eletrônicos como prova de data certa. O certificado da Musicdibs é evidência técnica admissível em juízo." },
      { q: "Substitui o registro oficial de direitos autorais?", a: "Complementa. Para muitos autores é suficiente porque comprova autoria e data. Em caso de disputa, ambos os registros são compatíveis." },
      { q: "E se eu perder o arquivo original?", a: "O certificado guarda a impressão digital (hash) do arquivo, não o arquivo em si. Você precisa do original para verificar a coincidência. Recomendamos sempre manter um backup seguro." },
      { q: "Posso registrar uma letra sem a música?", a: "Sim. Você pode registrar letras, partituras, demos, masters, vídeos ou qualquer arquivo que represente sua obra criativa." },
      { q: "Quem valida a autoria declarada?", a: "O sistema certifica a data e a existência do arquivo, não a veracidade da autoria declarada — como qualquer registro. A autoria é provada com o arquivo original mais documentação complementar." },
    ],
    closingTitle: "Comece a proteger sua música hoje",
    closingDesc: "Junte-se a milhares de artistas que já registram suas obras com a prova de autoria mais rápida do mercado.",
    closingCta: "Criar conta grátis",
  },
};

const whyIcons = [Shield, Zap, Globe, FileCheck];

interface Props {
  forcedLang?: Lang;
  forcedPath?: string;
  forcedSeoTitle?: string;
  forcedSeoDesc?: string;
}

const SongRegistrationPage = ({ forcedLang, forcedPath, forcedSeoTitle, forcedSeoDesc }: Props = {}) => {
  const { i18n } = useTranslation();
  const lang: Lang = forcedLang ?? ((["es", "en", "pt-BR"].includes(i18n.language) ? i18n.language : "es") as Lang);
  const c = COPY[lang];
  const path = forcedPath ?? "/registro-obras-musicales";
  const seoTitle = forcedSeoTitle ?? c.seoTitle;
  const seoDesc = forcedSeoDesc ?? c.seoDesc;

  const baseUrl = "https://www.musicdibs.com";
  const fullUrl = `${baseUrl}${path}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.h1,
    description: seoDesc,
    inLanguage: lang,
    mainEntityOfPage: { "@type": "WebPage", "@id": fullUrl },
    publisher: {
      "@type": "Organization",
      name: "Musicdibs",
      url: baseUrl,
      logo: { "@type": "ImageObject", url: `${baseUrl}/og-image.png` },
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Musicdibs", item: baseUrl },
      { "@type": "ListItem", position: 2, name: c.h1, item: fullUrl },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={path}
        type="article"
        locale={lang}
        jsonLd={[articleSchema, faqSchema, breadcrumbSchema]}
      />
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-5 py-2 mb-6">
              <Shield className="w-5 h-5 text-pink-400" />
              <span className="text-pink-300 text-sm font-medium">{c.badge}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {c.h1}
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              {c.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    {c.ctaPrimary} <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
              <Link to="/legal-validity">
                <Button variant="hero" size="xl" className="font-semibold">{c.ctaSecondary}</Button>
              </Link>
            </div>
          </header>

          {/* Why */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">{c.whyTitle}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {c.why.map((w, i) => {
                const Icon = whyIcons[i];
                return (
                  <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                    <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-pink-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{w.title}</h3>
                    <p className="text-white/70 leading-relaxed">{w.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Steps */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">{c.stepsTitle}</h2>
            <ol className="space-y-4">
              {c.steps.map((s, i) => (
                <li key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex gap-4">
                  <Clock className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-white/70">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Comparison */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">{c.vsTitle}</h2>
            <p className="text-white/70 text-center mb-10 max-w-2xl mx-auto">{c.vsIntro}</p>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-bold uppercase text-xs">—</th>
                    <th className="text-left p-4 text-white/60 font-bold uppercase text-xs">Tradicional</th>
                    <th className="text-left p-4 text-pink-300 font-bold uppercase text-xs">Musicdibs</th>
                  </tr>
                </thead>
                <tbody>
                  {c.vsRows.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-b-0">
                      <td className="p-4 text-white font-semibold">{r.feature}</td>
                      <td className="p-4 text-white/70">{r.trad}</td>
                      <td className="p-4 text-pink-200 font-semibold">{r.mdb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Competitor comparison block */}
          <CompetitorComparison lang={lang} />

          {/* FAQ */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">{c.faqTitle}</h2>
            <div className="space-y-4">
              {c.faq.map((f, i) => (
                <details key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 group">
                  <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                    {f.q}
                    <CheckCircle2 className="w-5 h-5 text-pink-400 group-open:rotate-45 transition-transform" />
                  </summary>
                  <p className="text-white/70 mt-4 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Closing CTA */}
          <section className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-white/10 rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">{c.closingTitle}</h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">{c.closingDesc}</p>
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  {c.closingCta} <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </section>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default SongRegistrationPage;
