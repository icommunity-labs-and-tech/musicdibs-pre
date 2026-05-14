import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { CompetitorComparison } from "@/components/CompetitorComparison";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, ScrollText, Globe, Gavel, Lightbulb, ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

type Lang = "es" | "en" | "pt-BR";

const COPY: Record<Lang, {
  seoTitle: string; seoDesc: string;
  badge: string; h1: string; subtitle: string; cta: string;
  introTitle: string; intro: string[];
  rightsTitle: string; rights: { title: string; desc: string }[];
  howTitle: string; how: string[];
  optionsTitle: string; optionsIntro: string;
  options: { name: string; pros: string; cons: string }[];
  myths: { q: string; a: string }[]; mythsTitle: string;
  closingTitle: string; closingDesc: string; closingCta: string;
}> = {
  es: {
    seoTitle: "Derechos de Autor en Música: Guía Completa 2026",
    seoDesc: "Cómo proteger los derechos de autor de tu música paso a paso. Registro tradicional vs blockchain, costes, validez legal y plazos en 2026.",
    badge: "Guía 2026",
    h1: "Derechos de autor en música: guía 2026",
    subtitle: "Todo lo que necesitas saber para proteger tu música legalmente. Qué derechos tienes, cómo registrarlos y cuál es el camino más rápido y barato.",
    cta: "Registrar una obra ahora",
    introTitle: "¿Qué son los derechos de autor en música?",
    intro: [
      "Los derechos de autor protegen automáticamente cualquier obra musical original desde el momento de su creación, sin necesidad de trámite previo. Sin embargo, esa protección automática es difícil de probar en un conflicto sin una fecha cierta y un archivo original verificable.",
      "Por eso, registrar la obra — sea en un registro oficial, en una entidad de gestión o mediante un sello de tiempo blockchain — es lo que convierte tu autoría en una prueba sólida ante un juez, una plataforma digital o un colaborador.",
    ],
    rightsTitle: "Qué derechos tienes sobre tu música",
    rights: [
      { title: "Derecho moral", desc: "Reconocimiento de la autoría e integridad de la obra. Es irrenunciable e inalienable: nadie puede comprártelo ni quitártelo." },
      { title: "Derecho de reproducción", desc: "Controlar copias físicas o digitales de tu obra (CDs, descargas, archivos de audio)." },
      { title: "Derecho de comunicación pública", desc: "Decidir si tu música suena en radio, conciertos, plataformas de streaming, bares o redes sociales." },
      { title: "Derecho de transformación", desc: "Autorizar versiones, remixes, adaptaciones, sincronizaciones audiovisuales o traducciones de la letra." },
    ],
    howTitle: "Cómo registrar tus derechos paso a paso",
    how: [
      "Crea el archivo final que quieres proteger (audio, letra, partitura).",
      "Identifica con claridad a todos los autores y porcentajes de autoría.",
      "Elige cómo registrarlo: registro oficial, blockchain o ambos.",
      "Guarda el certificado y el archivo original en lugar seguro.",
      "Si tu obra se comercializa, dala de alta en una entidad de gestión (SGAE, AGEDI…) para cobrar regalías.",
    ],
    optionsTitle: "3 formas de registrar tu música en 2026",
    optionsIntro: "No existe una única opción válida. Cada una tiene ventajas y limitaciones — incluso son combinables.",
    options: [
      { name: "Registro de la Propiedad Intelectual", pros: "Reconocimiento institucional clásico y aceptado por todos los tribunales españoles.", cons: "Lento (3-12 meses), presencial o con certificado digital, coste medio (13,80 € + tasas), poca utilidad internacional directa." },
      { name: "Sello de tiempo blockchain (Musicdibs)", pros: "Instantáneo, barato (desde 2,99 €), válido en +180 países por el Convenio de Berna, verificación pública online.", cons: "Tecnología nueva — algunos jueces todavía no la conocen, aunque la regulación eIDAS la respalda." },
      { name: "Entidad de gestión (SGAE, AGEDI)", pros: "Imprescindible para cobrar regalías por difusión pública y streaming.", cons: "No es propiamente un registro de autoría: requiere demostrar previamente que la obra es tuya." },
    ],
    mythsTitle: "Mitos sobre los derechos de autor",
    myths: [
      { q: "\"Si lo subo a YouTube, ya está protegido\"", a: "Falso. Subir a una plataforma sirve como evidencia débil de fecha, pero no es un registro y la plataforma puede borrar tu cuenta perdiendo la prueba." },
      { q: "\"Mandarme un email a mí mismo es un registro\"", a: "Falso. El email no garantiza fecha cierta — los servidores y los metadatos pueden alterarse." },
      { q: "\"Solo necesito proteger la letra\"", a: "Falso. La música y la letra son obras independientes. Si solo proteges una, la otra queda desprotegida." },
      { q: "\"El blockchain no tiene validez legal\"", a: "Falso. El reglamento eIDAS de la UE y el Convenio de Berna reconocen los sellos de tiempo electrónicos como prueba." },
    ],
    closingTitle: "Protege tu música en 5 minutos",
    closingDesc: "Empieza con un registro blockchain rápido y barato. Si más adelante quieres añadir el registro oficial, ambos son compatibles.",
    closingCta: "Registrar mi obra",
  },
  en: {
    seoTitle: "How to Copyright a Song in 2026: Complete Guide",
    seoDesc: "How to copyright your music step by step. Traditional registration vs blockchain timestamping — costs, legal validity and timelines in 2026.",
    badge: "2026 guide",
    h1: "How to copyright a song in 2026",
    subtitle: "Everything you need to protect your music legally. What rights you own, how to register them and which path is fastest and cheapest.",
    cta: "Register a song now",
    introTitle: "What is music copyright?",
    intro: [
      "Copyright automatically protects any original musical work from the moment it is created — no paperwork required. The catch: that automatic protection is hard to prove in a dispute without a certain date and a verifiable original file.",
      "That's why registering the work — at a government office, a collecting society or with a blockchain timestamp — is what turns your authorship into solid evidence before a judge, a streaming platform or a collaborator.",
    ],
    rightsTitle: "What rights you have over your music",
    rights: [
      { title: "Moral rights", desc: "Recognition of authorship and integrity of the work. Inalienable: nobody can buy them from you or take them away." },
      { title: "Reproduction rights", desc: "Control physical or digital copies of your work (CDs, downloads, audio files)." },
      { title: "Public communication rights", desc: "Decide whether your music plays on radio, concerts, streaming platforms, venues or social media." },
      { title: "Transformation rights", desc: "Authorize covers, remixes, adaptations, audiovisual sync or lyric translations." },
    ],
    howTitle: "How to copyright your music step by step",
    how: [
      "Create the final file you want to protect (audio, lyrics, score).",
      "Clearly identify all authors and their authorship share.",
      "Choose how to register it: government office, blockchain or both.",
      "Store the certificate and original file in a safe place.",
      "If your work is commercialized, register with a collecting society (ASCAP, BMI, PRS…) to collect royalties.",
    ],
    optionsTitle: "3 ways to copyright your music in 2026",
    optionsIntro: "There is no single valid option. Each has trade-offs — and they're combinable.",
    options: [
      { name: "Government copyright office (USCO, IPO)", pros: "Classic institutional recognition, accepted by every court.", cons: "Slow (3-12 months), bureaucratic, mid-cost ($45+ USCO), country-specific by default." },
      { name: "Blockchain timestamp (Musicdibs)", pros: "Instant, cheap (from €2.99), valid in 180+ countries via the Berne Convention, public online verification.", cons: "New technology — some judges aren't familiar yet, though EU eIDAS regulation backs it." },
      { name: "Collecting society (ASCAP, BMI, PRS)", pros: "Essential to collect royalties from broadcast and streaming.", cons: "Not a true authorship registry: you must prove ownership beforehand." },
    ],
    mythsTitle: "Myths about music copyright",
    myths: [
      { q: "\"If I upload it to YouTube, it's protected\"", a: "False. Uploading to a platform is weak date evidence, not a registration, and the platform can delete your account along with the proof." },
      { q: "\"Mailing the song to myself is a copyright\"", a: "False. The 'poor man's copyright' doesn't guarantee a certain date — postmarks and email metadata can be tampered with." },
      { q: "\"I only need to protect the lyrics\"", a: "False. Music and lyrics are independent works. Protecting only one leaves the other exposed." },
      { q: "\"Blockchain has no legal validity\"", a: "False. EU eIDAS regulation and the Berne Convention recognize electronic timestamps as evidence." },
    ],
    closingTitle: "Copyright your song in 5 minutes",
    closingDesc: "Start with a fast and cheap blockchain registration. If you later want to add an official copyright filing, both are fully compatible.",
    closingCta: "Register my song",
  },
  "pt-BR": {
    seoTitle: "Direitos Autorais na Música: Guia Completo 2026",
    seoDesc: "Como proteger os direitos autorais da sua música passo a passo. Registro tradicional vs blockchain — custos, validade legal e prazos em 2026.",
    badge: "Guia 2026",
    h1: "Direitos autorais na música: guia 2026",
    subtitle: "Tudo o que você precisa para proteger sua música legalmente. Quais direitos você tem, como registrá-los e qual é o caminho mais rápido e barato.",
    cta: "Registrar uma obra agora",
    introTitle: "O que são direitos autorais na música?",
    intro: [
      "Os direitos autorais protegem automaticamente qualquer obra musical original desde o momento da sua criação, sem necessidade de trâmite prévio. O problema: essa proteção automática é difícil de provar em um conflito sem uma data certa e um arquivo original verificável.",
      "Por isso, registrar a obra — em um registro oficial, em uma entidade de gestão ou via carimbo de tempo blockchain — é o que transforma sua autoria em prova sólida diante de um juiz, de uma plataforma digital ou de um colaborador.",
    ],
    rightsTitle: "Quais direitos você tem sobre sua música",
    rights: [
      { title: "Direito moral", desc: "Reconhecimento da autoria e integridade da obra. É irrenunciável e inalienável: ninguém pode comprar nem tirar de você." },
      { title: "Direito de reprodução", desc: "Controlar cópias físicas ou digitais da sua obra (CDs, downloads, arquivos de áudio)." },
      { title: "Direito de comunicação pública", desc: "Decidir se sua música toca em rádio, shows, plataformas de streaming, bares ou redes sociais." },
      { title: "Direito de transformação", desc: "Autorizar versões, remixes, adaptações, sincronização audiovisual ou traduções da letra." },
    ],
    howTitle: "Como registrar seus direitos passo a passo",
    how: [
      "Crie o arquivo final que deseja proteger (áudio, letra, partitura).",
      "Identifique claramente todos os autores e seus percentuais de autoria.",
      "Escolha como registrar: oficial, blockchain ou ambos.",
      "Guarde o certificado e o arquivo original em local seguro.",
      "Se sua obra for comercializada, registre em uma entidade de gestão (ECAD, ABRAMUS…) para receber royalties.",
    ],
    optionsTitle: "3 formas de registrar sua música em 2026",
    optionsIntro: "Não existe uma única opção válida. Cada uma tem vantagens e limitações — inclusive são combináveis.",
    options: [
      { name: "Registro oficial (Biblioteca Nacional, EDA)", pros: "Reconhecimento institucional clássico, aceito por todos os tribunais brasileiros.", cons: "Lento (3-12 meses), presencial ou com certificado digital, custo médio (R$ 80+), pouca utilidade internacional direta." },
      { name: "Carimbo de tempo blockchain (Musicdibs)", pros: "Instantâneo, barato (a partir de R$ 19), válido em +180 países pela Convenção de Berna, verificação pública online.", cons: "Tecnologia nova — alguns juízes ainda não a conhecem, embora a regulamentação eIDAS a respalde." },
      { name: "Entidade de gestão (ECAD, ABRAMUS)", pros: "Imprescindível para receber royalties por execução pública e streaming.", cons: "Não é propriamente um registro de autoria: exige comprovar antes que a obra é sua." },
    ],
    mythsTitle: "Mitos sobre direitos autorais",
    myths: [
      { q: "\"Se eu subir no YouTube, já está protegido\"", a: "Falso. Subir em uma plataforma serve como evidência fraca de data, mas não é um registro e a plataforma pode apagar sua conta perdendo a prova." },
      { q: "\"Mandar um e-mail para mim mesmo é um registro\"", a: "Falso. O e-mail não garante data certa — servidores e metadados podem ser alterados." },
      { q: "\"Só preciso proteger a letra\"", a: "Falso. Música e letra são obras independentes. Se você protege só uma, a outra fica desprotegida." },
      { q: "\"Blockchain não tem validade legal\"", a: "Falso. O regulamento eIDAS da UE e a Convenção de Berna reconhecem os carimbos de tempo eletrônicos como prova." },
    ],
    closingTitle: "Proteja sua música em 5 minutos",
    closingDesc: "Comece com um registro blockchain rápido e barato. Se quiser somar o registro oficial mais tarde, ambos são compatíveis.",
    closingCta: "Registrar minha obra",
  },
};

const rightIcons = [Shield, ScrollText, Globe, Gavel];

interface Props {
  forcedLang?: Lang;
  forcedPath?: string;
  forcedSeoTitle?: string;
  forcedSeoDesc?: string;
}

const MusicCopyrightPage = ({ forcedLang, forcedPath, forcedSeoTitle, forcedSeoDesc }: Props = {}) => {
  const { i18n } = useTranslation();
  const lang: Lang = forcedLang ?? ((["es", "en", "pt-BR"].includes(i18n.language) ? i18n.language : "es") as Lang);
  const c = COPY[lang];
  const path = forcedPath ?? "/derechos-autor-musica";
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
    mainEntity: c.myths.map((m) => ({
      "@type": "Question",
      name: m.q,
      acceptedAnswer: { "@type": "Answer", text: m.a },
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
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-5 py-2 mb-6">
              <Lightbulb className="w-5 h-5 text-purple-400" />
              <span className="text-purple-300 text-sm font-medium">{c.badge}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {c.h1}
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">{c.subtitle}</p>
            <Link to="/registro-obras-musicales">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  {c.cta} <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </header>

          {/* Intro */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold mb-6 text-white">{c.introTitle}</h2>
            {c.intro.map((p, i) => (
              <p key={i} className="text-white/80 leading-relaxed text-lg mb-4">{p}</p>
            ))}
          </section>

          {/* Rights */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">{c.rightsTitle}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {c.rights.map((r, i) => {
                const Icon = rightIcons[i];
                return (
                  <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{r.title}</h3>
                    <p className="text-white/70 leading-relaxed">{r.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* How */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">{c.howTitle}</h2>
            <ol className="space-y-3 max-w-2xl mx-auto">
              {c.how.map((step, i) => (
                <li key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 flex gap-4 items-start">
                  <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-white/80 leading-relaxed pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Options */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">{c.optionsTitle}</h2>
            <p className="text-white/70 text-center mb-10 max-w-2xl mx-auto">{c.optionsIntro}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {c.options.map((opt, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">{opt.name}</h3>
                  <p className="text-green-300/90 text-sm mb-3"><strong>+ </strong>{opt.pros}</p>
                  <p className="text-white/60 text-sm"><strong>− </strong>{opt.cons}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Competitor comparison block */}
          <CompetitorComparison lang={lang} ctaHref="/registro-obras-musicales" />

          {/* Myths */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">{c.mythsTitle}</h2>
            <div className="space-y-4">
              {c.myths.map((m, i) => (
                <details key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 group">
                  <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                    {m.q}
                    <ChevronDown className="w-5 h-5 text-purple-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="text-white/70 mt-4 leading-relaxed">{m.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Closing */}
          <section className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10 rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">{c.closingTitle}</h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">{c.closingDesc}</p>
            <Link to="/registro-obras-musicales">
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

export default MusicCopyrightPage;
