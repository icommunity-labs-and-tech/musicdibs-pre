import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Mic,
  FileText,
  Music2,
  Wand2,
  Globe2,
  Shield,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  Users,
  Zap,
  Workflow,
  Rocket,
} from "lucide-react";

const BASE_URL = "https://www.musicdibs.com";
const PATH = "/generador-canciones-ia";
const FULL_URL = `${BASE_URL}${PATH}`;

const TRUST = [
  { icon: Users, label: "+100.000 artistas" },
  { icon: Shield, label: "Protección certificada en blockchain" },
  { icon: Globe2, label: "Distribución global" },
  { icon: Zap, label: "Flujo potenciado por IA" },
];

const FLOW = [
  { icon: Sparkles, title: "Crea", desc: "Genera canciones completas, letras y voces desde un solo prompt." },
  { icon: Shield, title: "Protege", desc: "Prueba de autoría certificada en blockchain en minutos." },
  { icon: Globe2, title: "Distribuye", desc: "Publica en Spotify, Apple Music y +150 plataformas." },
  { icon: Megaphone, title: "Promociona", desc: "Portadas, vídeos y campañas sociales generadas con IA." },
];

const FEATURES = [
  { icon: Mic, title: "Voces con IA", desc: "Voces sintéticas de calidad estudio en cualquier estilo o idioma." },
  { icon: FileText, title: "Letras con IA", desc: "Letras originales co-escritas con IA en segundos." },
  { icon: Music2, title: "Generación de canciones", desc: "Instrumentales y arreglos completos a partir de un prompt." },
  { icon: Wand2, title: "Masterización musical", desc: "Masterización automática optimizada para streaming." },
  { icon: Globe2, title: "Distribución", desc: "Lanzamiento mundial con cobro de royalties." },
  { icon: Shield, title: "Protección de copyright", desc: "Sello blockchain inmutable en cada track." },
  { icon: Megaphone, title: "Herramientas de promoción IA", desc: "Portadas, clips de vídeo y creatividades generadas para ti." },
  { icon: Workflow, title: "Flujo todo-en-uno", desc: "Crea, protege, publica y promociona sin salir de la app." },
];

const COMPARE = [
  { feature: "Tiempo hasta la primera canción", trad: "Días o semanas", mdb: "Menos de 5 minutos" },
  { feature: "Herramientas necesarias", trad: "DAW + plugins + distribuidor + abogado", mdb: "Una sola plataforma" },
  { feature: "Prueba de copyright", trad: "Registro externo", mdb: "Certificado blockchain integrado" },
  { feature: "Distribución", trad: "Servicio aparte con tarifas", mdb: "Incluida" },
  { feature: "Material promocional", trad: "Contratar diseñadores", mdb: "Generado con IA en segundos" },
  { feature: "Curva de aprendizaje", trad: "Pronunciada", mdb: "Basada en prompts" },
];

const FAQ = [
  {
    q: "¿Cómo funciona un generador de canciones con IA?",
    a: "Describes la canción que quieres — género, mood, temática de la letra, estilo vocal — y la IA genera un track completo con instrumentación, voces y letras. Musicdibs combina varios modelos especializados para que cada capa de la canción se produzca con calidad de estudio.",
  },
  {
    q: "¿Puedo monetizar la música generada con IA?",
    a: "Sí. Las canciones creadas en Musicdibs se pueden distribuir a plataformas de streaming y te quedas con el 100% de los royalties. Mientras seas dueño del prompt y de la generación, la obra resultante es tuya para comercializarla.",
  },
  {
    q: "¿Puedo distribuir canciones IA en Spotify?",
    a: "Sí. Musicdibs distribuye en Spotify, Apple Music, Amazon Music, YouTube Music, TikTok, Deezer, Tidal y más de 150 tiendas en todo el mundo directamente desde el panel.",
  },
  {
    q: "¿De quién es la propiedad de las canciones generadas con IA?",
    a: "En Musicdibs eres dueño de las canciones que generas. Conservas los derechos de autoría y puedes registrarlas en blockchain para acreditar fecha y autoría de tu creación, lo cual es admisible como prueba técnica en la mayoría de jurisdicciones.",
  },
  {
    q: "¿Puedo proteger música generada con IA?",
    a: "Sí. Cada track puede registrarse en blockchain con un sello temporal inalterable, reconocido por el Convenio de Berna en más de 180 países. Recibes un certificado descargable con un enlace público de verificación.",
  },
];

const GeneradorCancionesIAPage = () => {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Generador de canciones con IA para creadores",
    url: FULL_URL,
    description:
      "Crea, protege y distribuye música generada con IA desde una sola plataforma. Voces IA, letras, masterización, copyright blockchain y distribución global.",
    inLanguage: "es",
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Musicdibs Generador de canciones IA",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: FULL_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "1240" },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Musicdibs", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Generador de canciones IA", item: FULL_URL },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title="Generador de canciones con IA"
        description="Crea, protege y distribuye música generada con IA desde una sola plataforma. Voces IA, letras, masterización, copyright blockchain y distribución global."
        path={PATH}
        type="website"
        locale="es"
        jsonLd={[webPageSchema, softwareSchema, faqSchema, breadcrumbSchema]}
      />
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-pink-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-white/80 text-sm font-medium">Crea. Protege. Distribuye. Promociona.</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-br from-white via-pink-200 to-purple-300 bg-clip-text text-transparent leading-tight animate-fade-in">
            Generador de canciones con IA para creadores
          </h1>
          <p className="text-white/70 text-lg md:text-2xl max-w-3xl mx-auto mb-10 animate-fade-in">
            Crea, protege y distribuye música generada con IA desde una sola plataforma.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-16 animate-fade-in">
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  Crea tu primera canción con IA <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button variant="hero" size="xl" className="font-semibold">
                Ver cómo funciona
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="px-6 py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST.map((t, i) => (
            <div key={i} className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                <t.icon className="w-5 h-5 text-pink-400" />
              </div>
              <span className="text-white/80 text-sm md:text-base font-medium">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">De la idea al lanzamiento en minutos</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Un solo flujo. Cuatro pasos. Cero fricción.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {FLOW.map((f, i) => (
              <div
                key={i}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-pink-500/40 transition-all hover-scale"
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-pink-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-24 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Todo lo que necesitas, nativo en IA</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Una suite musical completa construida en torno a la IA generativa.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="w-11 h-11 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-6 py-24 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Musicdibs vs flujos tradicionales
            </h2>
            <p className="text-white/60 text-lg">Más rápido. Todo en uno. Nativo en IA. Pensado para creadores.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="text-white/60 text-sm font-medium">Característica</div>
              <div className="text-white/60 text-sm font-medium">Tradicional</div>
              <div className="text-pink-300 text-sm font-bold">Musicdibs</div>
            </div>
            {COMPARE.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-6 py-4 border-b border-white/5 last:border-0 items-center"
              >
                <div className="text-white font-medium text-sm md:text-base">{row.feature}</div>
                <div className="text-white/50 text-sm md:text-base">{row.trad}</div>
                <div className="text-white text-sm md:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  {row.mdb}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {["Más rápido", "Todo en uno", "Nativo en IA", "Pensado para creadores"].map((b) => (
              <span
                key={b}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-200 text-sm font-medium"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Preguntas frecuentes</h2>
            <p className="text-white/60 text-lg">Todo lo que necesitas saber sobre la generación de canciones con IA.</p>
          </div>
          <div className="space-y-4">
            {FAQ.map((f, i) => (
              <details
                key={i}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 open:border-pink-500/30"
              >
                <summary className="flex items-center justify-between cursor-pointer text-white font-semibold text-lg">
                  {f.q}
                  <ArrowRight className="w-5 h-5 text-pink-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-4 text-white/70 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 text-center text-white/60 text-sm">
            Más sobre{" "}
            <Link to="/registro-obras-musicales" className="text-pink-300 hover:text-pink-200 underline">
              registro de obras musicales
            </Link>
            ,{" "}
            <Link to="/derechos-autor-musica" className="text-pink-300 hover:text-pink-200 underline">
              derechos de autor en música
            </Link>
            ,{" "}
            <Link to="/faq" className="text-pink-300 hover:text-pink-200 underline">
              la FAQ completa
            </Link>{" "}
            o{" "}
            <Link to="/" className="text-pink-300 hover:text-pink-200 underline">
              precios y planes
            </Link>
            .
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24">
        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent p-12 md:p-20 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
          <Rocket className="w-12 h-12 text-pink-400 mx-auto mb-6 relative" />
          <h2 className="relative text-3xl md:text-5xl font-bold text-white mb-4">
            Lanza hoy tu primer release potenciado por IA.
          </h2>
          <p className="relative text-white/70 text-lg max-w-2xl mx-auto mb-8">
            Únete a miles de creadores que crean, protegen y publican música con IA.
          </p>
          <div className="relative flex flex-wrap justify-center gap-4">
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  Crea tu primera canción con IA <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
            <Link to="/registro-obras-musicales">
              <Button variant="hero" size="xl" className="font-semibold">
                Protege tu música
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GeneradorCancionesIAPage;
