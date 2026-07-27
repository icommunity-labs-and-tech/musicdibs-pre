import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Music2, Mic, Shield, Globe2, Megaphone, Zap, Users, Wand2, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const BASE_URL = "https://www.musicdibs.com";
const PATH = "/creador-de-musica";
const URL = `${BASE_URL}${PATH}`;

const FEATURES = [
  { icon: Sparkles, title: "Creación por prompts", desc: "Describes el género, la letra y el mood — el creador de música devuelve una canción completa en minutos." },
  { icon: Mic, title: "Voces IA en cualquier estilo", desc: "Masculinas, femeninas, rap, coros o cinematográficas. Multiidioma con acento natural." },
  { icon: Music2, title: "Instrumentales y stems", desc: "Arreglos completos y stems editables para remezclar y masterizar." },
  { icon: Wand2, title: "Mastering con IA", desc: "Loudness y balance tonal listos para streaming en un clic." },
  { icon: Shield, title: "Copyright integrado", desc: "Cada canción recibe un certificado blockchain con timestamp que prueba tu autoría." },
  { icon: Globe2, title: "Publica en 220+ plataformas", desc: "Distribuye a Spotify, Apple Music, TikTok y más desde el mismo panel." },
];

const USE_CASES = [
  { title: "Creadores de contenido", desc: "Música original que puedes monetizar sin problemas en YouTube, TikTok y Reels." },
  { title: "Artistas independientes", desc: "Prototipa canciones rápido, quédate con lo que funciona y publícalo con tu nombre." },
  { title: "Podcasts", desc: "Intros, outros y transiciones en segundos con propiedad clara." },
  { title: "Publicidad y marcas", desc: "Jingles y sonic branding a medida sin líos de licencias." },
  { title: "Videojuegos y cine", desc: "Loops y cues en el estilo exacto que necesita cada escena." },
  { title: "Educación musical", desc: "Enseña composición con ejemplos instantáneos y editables." },
];

const COMPARE = [
  { feature: "Tiempo de setup", trad: "Horas instalando DAW y plugins", mdb: "0 — funciona en el navegador" },
  { feature: "Conocimientos", trad: "Años de producción", mdb: "Un prompt escrito" },
  { feature: "Coste inicial", trad: "Cientos en software", mdb: "Desde gratis" },
  { feature: "Prueba de copyright", trad: "Servicio externo", mdb: "Incluido" },
  { feature: "Distribución", trad: "Proveedor aparte", mdb: "Incluida" },
];

const FAQ = [
  { q: "¿Qué es un creador de música con IA?", a: "Un creador de música con IA genera canciones originales completas —instrumentación, voces, letra— a partir de un prompt escrito. Musicdibs es un creador de música pensado para lanzamientos reales: las canciones que generas se pueden registrar en blockchain y distribuir a plataformas de streaming sin salir de la app." },
  { q: "¿Puedo usar las canciones comercialmente?", a: "Sí. Las canciones que creas en Musicdibs son tuyas. Puedes monetizarlas en YouTube y TikTok, licenciarlas para anuncios o publicarlas en Spotify y Apple Music. Musicdibs no cobra comisión sobre tus royalties de streaming." },
  { q: "¿Necesito experiencia produciendo música?", a: "No. Describes la canción en lenguaje natural. Los usuarios avanzados pueden editar stems, añadir sus propias voces o refinar con las herramientas Inspire y Enhance del AI Studio." },
  { q: "¿Cómo se compara con Suno y Udio?", a: "Musicdibs cubre la misma parte creativa y añade lo que Suno y Udio no tienen: certificado de copyright en blockchain, distribución a 220+ plataformas, portadas con IA, vídeos promocionales y herramientas para managers." },
  { q: "¿Cuánto se tarda en crear una canción?", a: "El primer borrador está listo en menos de 3 minutos. Añadir voces, remasterizar y generar portada suele llevar 5–10 minutos en total." },
];

const CreadorDeMusicaPage = () => {
  const seoTitle = "Creador de Música con IA: Crea, Registra y Publica Canciones en Minutos | Musicdibs";
  const seoDesc =
    "El creador de música con IA todo-en-uno: genera canciones completas con voces y letras, registra tu copyright en blockchain y publica en Spotify y 220+ plataformas.";

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Musicdibs Creador de Música IA",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    url: URL,
    image: "https://www.musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
    description: seoDesc,
    offers: { "@type": "AggregateOffer", lowPrice: "0", highPrice: "399.90", priceCurrency: "EUR", offerCount: "5" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 137 },
    featureList: FEATURES.map((f) => f.title),
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Musicdibs", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Creador de Música", item: URL },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO title={seoTitle} description={seoDesc} path={PATH} type="website" lang="es" jsonLd={[softwareSchema, faqSchema, breadcrumbSchema]} />
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-primary text-sm font-medium">Creador de música con IA</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-brand bg-clip-text text-transparent">
              El creador de música con IA pensado para publicar de verdad
            </h1>
            <p className="text-page-fg-muted text-lg md:text-xl max-w-3xl mx-auto mb-10">
              Genera canciones completas con voces y letras, obtén un certificado de copyright en blockchain y
              publica en Spotify y +220 plataformas — desde una sola cuenta.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">Empieza gratis <ArrowRight className="w-5 h-5" /></span>
                </Button>
              </Link>
              <Link to="/generador-canciones-ia">
                <Button variant="outline" size="xl" className="font-semibold">Ver el generador de canciones</Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-10 text-page-fg-subtle text-sm">
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> +100.000 artistas</span>
              <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Copyright en blockchain</span>
              <span className="flex items-center gap-2"><Globe2 className="w-4 h-4" /> +220 plataformas</span>
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Canciones en minutos</span>
            </div>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-primary-foreground">Todo lo que un creador de música debe hacer</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-6">
                    <div className="w-11 h-11 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-primary-foreground mb-2">{f.title}</h3>
                    <p className="text-page-fg-muted text-sm leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-primary-foreground">Quién usa el creador de música de Musicdibs</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {USE_CASES.map((u, i) => (
                <div key={i} className="bg-page-surface border border-page-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-primary-foreground mb-2">{u.title}</h3>
                  <p className="text-page-fg-muted text-sm leading-relaxed">{u.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10 text-primary-foreground">Herramientas tradicionales vs Musicdibs</h2>
            <div className="overflow-x-auto rounded-2xl bg-page-surface border border-page-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-page-border">
                    <th className="text-left px-5 py-4 text-page-fg-subtle font-bold text-xs uppercase tracking-wide">Aspecto</th>
                    <th className="px-4 py-4 text-center text-page-fg-muted font-bold">DAW + plugins</th>
                    <th className="px-4 py-4 text-center bg-primary/10 border-x border-primary/30 text-primary-foreground font-bold">Musicdibs</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r, i) => (
                    <tr key={i} className={`border-b border-page-border last:border-b-0 ${i % 2 === 0 ? "bg-primary-foreground/[0.02]" : ""}`}>
                      <td className="px-5 py-4 text-page-fg-muted font-medium">{r.feature}</td>
                      <td className="px-4 py-4 text-center text-page-fg-muted">{r.trad}</td>
                      <td className="px-4 py-4 text-center bg-primary/5 border-x border-primary/20 text-page-fg">{r.mdb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-20 bg-page-surface border border-page-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-foreground mb-6 text-center">Por qué los artistas eligen Musicdibs</h2>
            <ul className="space-y-3 max-w-2xl mx-auto">
              <li className="flex gap-3 text-page-fg-muted"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> Sin comisión sobre tus royalties de streaming.</li>
              <li className="flex gap-3 text-page-fg-muted"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> Certificado blockchain con timestamp para cada canción.</li>
              <li className="flex gap-3 text-page-fg-muted"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> Portadas, vídeos y creatividades sociales con IA desde la misma cuenta.</li>
              <li className="flex gap-3 text-page-fg-muted"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> Panel de manager multi-artista para sellos y agencias.</li>
            </ul>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10 text-primary-foreground">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {FAQ.map((f, i) => (
                <div key={i} className="bg-page-surface border border-page-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-primary-foreground mb-3">{f.q}</h3>
                  <p className="text-page-fg-muted leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="text-center bg-gradient-to-r from-primary/10 to-brand/10 border border-primary/20 rounded-2xl p-12">
            <Megaphone className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">Crea una canción. Publícala hoy.</h2>
            <p className="text-page-fg-muted mb-8 max-w-xl mx-auto">Empieza gratis. Sin tarjeta. Distribuye tu primer single mañana.</p>
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">Probar el creador de música <ArrowRight className="w-5 h-5" /></span>
              </Button>
            </Link>
          </section>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default CreadorDeMusicaPage;
