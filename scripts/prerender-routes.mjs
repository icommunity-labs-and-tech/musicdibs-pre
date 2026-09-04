#!/usr/bin/env node
/**
 * Single source of truth for the SEO-prerendered landing routes.
 *
 * Shared by:
 *  - scripts/prerender-seo.mjs          (writes dist/<route>/index.html)
 *  - scripts/capture-prerender-bodies.mjs (captures the real rendered body)
 */

/** Slug used for the body snapshot file of a route path. */
export const snapshotFileName = (routePath) =>
  (routePath.replace(/^\//, "").replace(/\/$/, "") || "index").replace(/\//g, "__") + ".html";

export const BASE_URL = "https://musicdibs.com";
export const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/27fdd7c8-3e07-4d0d-886d-53859f68e5de";

/**
 * Each route gets a full set of meta.
 * Add new SEO landings here — keep sorted by priority desc, then alpha.
 */
export const ROUTES = [

  // ── PORTUGUESE (pt-BR) MIRRORS OF SHARED PAGES ─────────────────────────────
  {
    path: "/pt/features",
    locale: "pt-BR",
    title: "Funcionalidades: Crie, Proteja, Distribua e Promova a sua Música | Musicdibs",
    description: "Tudo o que um artista independente precisa em uma única plataforma: AI Music Studio, registro em blockchain, distribuição para mais de 220 plataformas e promoção com IA. A partir de €6,90/mês.",
  },
  {
    path: "/pt/distribution",
    locale: "pt-BR",
    title: "Distribuição Musical | Musicdibs",
    description: "Distribua sua música em mais de 220 plataformas digitais. A Musicdibs não cobra nenhuma comissão sobre seus royalties de streaming.",
  },
  {
    path: "/pt/legal-validity",
    locale: "pt-BR",
    title: "Validade Legal | Musicdibs",
    description: "Certificação em blockchain com validade legal internacional para proteger suas obras musicais em mais de 175 países.",
  },
  {
    path: "/pt/marketing",
    locale: "pt-BR",
    title: "Marketing e Promoção | Musicdibs",
    description: "Impulsione sua música com serviços profissionais de capas, vídeos e promoção nas redes sociais.",
  },
  {
    path: "/pt/partners",
    locale: "pt-BR",
    title: "Cresça com a Musicdibs | Musicdibs",
    description: "Acordos comerciais e soluções de marca branca para entidades do ecossistema musical que desejam integrar nossa tecnologia blockchain de certificação de autoria.",
  },
  {
    path: "/pt/promocion-musical",
    locale: "pt-BR",
    title: "Distribuição e promoção musical · Leve sua música ao mundo | Musicdibs",
    description: "Distribua sua música em mais de 220 plataformas globais e promova-a na rede da Musicdibs com centenas de milhares de seguidores reais no Instagram.",
  },
  {
    path: "/pt/tools/metadata-finder",
    locale: "pt-BR",
    title: "Buscador de ISRC e UPC grátis · Musicdibs",
    description: "Encontre o código ISRC de uma gravação ou o UPC/EAN de um álbum em segundos. Ferramenta gratuita para artistas, produtores e managers que distribuem música.",
  },

  // ── FEATURES HUB ────────────────────────────────────────────────────────────
  {
    path: "/features",
    locale: "es",
    title: "Funcionalidades: Crea, Protege, Distribuye y Promociona tu Música | Musicdibs",
    description: "Todo lo que necesita un artista independiente: AI Music Studio, registro blockchain de IP, distribución a 220+ plataformas y promoción con IA. Sin permanencia. Desde €6,90/mes.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      url: "https://musicdibs.com",
      description: "Plataforma todo-en-uno para artistas independientes: crea música con IA, registra propiedad intelectual en blockchain, distribuye a 220+ plataformas y promociona con contenido generado por IA.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "6.90",
        highPrice: "399.90",
        priceCurrency: "EUR",
        offerCount: "5",
      },
      featureList: [
        "Generación de música completa con IA",
        "Registro blockchain de propiedad intelectual",
        "Distribución a 220+ plataformas de streaming",
        "Sin comisión de Musicdibs sobre los royalties de streaming del artista",
        "AI Mastering automático",
        "Generación de portadas con IA",
        "Generación de vídeos promocionales con IA",
        "YouTube Content ID",
        "Validez legal en 175+ países",
      ],
    },
  },

  // ── REGISTRO / IP PROTECTION ────────────────────────────────────────────────
  {
    path: "/registro-obras-musicales",
    locale: "es",
    title: "Registro de Obras Musicales: Registra tu Canción Hoy | Musicdibs",
    description: "Cómo registrar una canción en España en minutos: certificado blockchain con prueba legal de autoría válida en +175 países. Sin gestiones ni esperas. 1ª canción gratis.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Registro de Obras Musicales en Blockchain",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Certificación blockchain de obras musicales con validez legal internacional según Convenio de Berna y eIDAS.",
      areaServed: "Worldwide",
      serviceType: "Intellectual Property Registration",
    },
  },
  {
    path: "/derechos-autor-musica",
    locale: "es",
    title: "Derechos de Autor de la Música: Cómo Registrarlos Hoy | Musicdibs",
    description: "Registra los derechos de autor de tu música en minutos: certificado blockchain con validez legal en +175 países. Comparativa con el registro tradicional y costes reales. 1ª canción gratis.",
  },
  {
    path: "/registro-musical",
    locale: "es",
    title: "Registro Musical Online con Blockchain | Musicdibs",
    description: "Registra tu música online con tecnología blockchain. Certificado digital inmutable, timestamp criptográfico y validez legal en más de 175 países. Rápido, asequible y sin burocracia.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Registro Musical Online",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Registro de obras musicales con certificado blockchain y validez legal internacional.",
      serviceType: "Music Copyright Registration",
    },
  },
  {
    path: "/music-distribution",
    locale: "en",
    title: "Music Distribution & Blockchain Copyright Registration | Musicdibs",
    description: "Register your music on blockchain and distribute it to Spotify, Apple Music and 220+ platforms. Immutable certificate, legal validity in 175+ countries, no commission on your royalties.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Music Distribution and Copyright Registration",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Blockchain copyright registration and worldwide music distribution for independent artists.",
      serviceType: "Music Distribution",
    },
  },
  {
    path: "/register-a-song",
    locale: "en",
    title: "Register a Song Online in Minutes — First Song Free | Musicdibs",
    description: "Register a song, register music or a full album online with blockchain proof of authorship. Instant certificate, legally valid in 175+ countries, no paperwork. First song free.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Register a Song Online",
      description: "Step-by-step guide to register a song with blockchain certification on Musicdibs.",
      step: [
        { "@type": "HowToStep", text: "Upload your audio file or music project to Musicdibs." },
        { "@type": "HowToStep", text: "Your file is hashed and timestamped on the blockchain." },
        { "@type": "HowToStep", text: "Download your legally-valid certificate of authorship." },
      ],
    },
  },
  {
    path: "/copyright-a-song",
    locale: "en",
    title: "How to Copyright a Song in 3 Steps (2026 Guide) | Musicdibs",
    description: "Copyright a song today: 3 steps, proof of authorship in minutes, valid in 175+ countries. Blockchain timestamping vs the US Copyright Office on cost and speed. First song free.",
  },
  {
    path: "/certificado-blockchain",
    locale: "es",
    title: "Certificado blockchain de tu música: prueba tu autoría | Musicdibs",
    description: "Cómo se prueba que una canción es tuya: huella digital SHA-512, sello de tiempo en blockchain y certificado verificable. Primera canción gratis.",
  },



  // ── DISTRIBUCIÓN ────────────────────────────────────────────────────────────
  {
    path: "/distribution",
    locale: "en",
    title: "Music Distribution to 220+ Platforms — No Commission on Royalties | Musicdibs",
    description: "Distribute your music to Spotify, Apple Music, TikTok and 220+ platforms. Musicdibs does not charge any commission on your streaming royalties. Live in 24–48h. No lock-in. YouTube Content ID available. Real-time analytics.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Music Distribution",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Global music distribution to 220+ streaming platforms with no Musicdibs commission on streaming royalties.",
      serviceType: "Music Distribution",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
        description: "Monthly plan including distribution, registration and AI tools",
      },
    },
  },
  {
    path: "/promocion-musical",
    locale: "es",
    title: "Promoción Musical con IA: Portadas, Vídeos y Redes Sociales | Musicdibs",
    description: "Genera portadas, posts, flyers y vídeos para redes sociales con IA. Promociona tu música en TikTok (245k) e Instagram (100k) de Musicdibs. Todo integrado.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Promoción Musical con IA",
      provider: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Generación de contenido promocional musical con inteligencia artificial: portadas, vídeos, posts y flyers.",
      serviceType: "Music Marketing",
    },
  },

  // ── AI STUDIO ───────────────────────────────────────────────────────────────
  {
    path: "/ia-music-studio",
    locale: "es",
    title: "AI Music Studio: Crea Canciones Completas con IA | Musicdibs",
    description: "Genera canciones profesionales con IA desde una descripción o tu propia voz. Instrumentación, arreglos, mezcla y masterización automática. Exporta listo para streaming.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs AI Music Studio",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      description: "Herramienta de generación musical con IA: crea canciones completas a partir de texto o voz.",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      },
    },
  },
  {
    path: "/ai-studio",
    locale: "es",
    title: "AI Studio: Herramientas de IA para Músicos y Creadores | Musicdibs",
    description: "Suite completa de herramientas de IA para música: crea canciones, genera letras, masteriza tracks, diseña portadas y produce vídeos. Todo en un solo lugar.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs AI Studio",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      url: `${BASE_URL}/ai-studio`,
      image: `${BASE_URL}/og-image.png`,
      description: "Suite de inteligencia artificial para la creación, producción y promoción musical.",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "1240",
        bestRating: "5",
        worstRating: "1",
      },
    },
  },
  {
    path: "/ai-studio/create",
    locale: "es",
    title: "Genera Canciones Completas con IA desde Cero | Musicdibs AI Studio",
    description: "Crea canciones originales con IA: define el género, estilo y mood. La IA genera la melodía, instrumentación, arreglos y mezcla completa en minutos.",
  },
  {
    path: "/ai-studio/vocal",
    locale: "es",
    title: "Sube tu Voz y Genera una Canción Profesional | Musicdibs AI Studio",
    description: "Sube tu voz a capella y nuestra IA construye toda la producción: afinación, instrumentación y mezcla profesional. Tú pones la semilla, la IA hace la magia.",
  },
  {
    path: "/ai-studio/edit",
    locale: "es",
    title: "Edita y Mejora tu Música con IA | Musicdibs AI Studio",
    description: "Edita, remasteriza y perfecciona tus producciones musicales con herramientas de IA. Mejora stems, ajusta mezclas y exporta con calidad profesional.",
  },
  {
    path: "/ai-studio/inspire",
    locale: "es",
    title: "Inspiración Musical con IA: Ideas y Estructuras de Canciones | Musicdibs",
    description: "Supera el bloqueo creativo con IA. Genera ideas de canciones, progresiones de acordes, estructuras y letras para tu próximo hit en segundos.",
  },
  {
    path: "/ai-studio/enhance",
    locale: "es",
    title: "AI Mastering: Masteriza tu Música con IA para Streaming | Musicdibs",
    description: "Masterización automática con IA lista para Spotify, Apple Music y todas las plataformas. Mejora volumen, claridad y potencia de tus canciones en segundos.",
  },
  {
    path: "/ai-studio/video",
    locale: "es",
    title: "Genera Vídeos Musicales con IA en Minutos | Musicdibs AI Studio",
    description: "Crea vídeos cortos y clips musicales con IA para TikTok, Instagram Reels y YouTube Shorts. Animaciones sincronizadas con tu música. Sin software de edición.",
  },
  {
    path: "/ai-studio/covers",
    locale: "es",
    title: "Portadas de Álbumes con IA: Diseños Profesionales al Instante | Musicdibs",
    description: "Genera portadas profesionales para tus lanzamientos con IA. Estilos personalizados, listos para Spotify, Apple Music y todas las plataformas en segundos.",
  },
  {
    path: "/ai-studio/promo-material",
    locale: "es",
    title: "Material Promocional Musical con IA: Posts, Flyers y Stories | Musicdibs",
    description: "Genera posts, stories, flyers y material promocional para tu música con IA. Formatos listos para Instagram, TikTok y todas las redes sociales.",
  },

  // ── GENERADORES SEO LANDING PAGES ──────────────────────────────────────────
  {
    path: "/ai-song-generator",
    locale: "en",
    title: "AI Song Generator: Create & Distribute Music with AI | Musicdibs",
    description: "Create complete songs with AI from a description or your own voice. Professional instrumentation, mixing and mastering. Register and distribute to 220+ platforms from one place.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs AI Song Generator",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      description: "AI-powered music generation tool: create complete songs from text prompts or voice recordings.",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      },
    },
  },
  {
    path: "/generador-canciones-ia",
    locale: "es",
    title: "Generador de Canciones con IA: Crea, Registra y Distribuye | Musicdibs",
    description: "Genera canciones completas con IA desde una descripción o tu voz. Instrumentación profesional, mezcla y masterización automática. Registra y distribuye en 220+ plataformas.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Musicdibs Generador de Canciones con IA",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      url: `${BASE_URL}/generador-canciones-ia`,
      image: `${BASE_URL}/og-image.png`,
      description: "Generador de música con inteligencia artificial: crea canciones completas desde texto o voz.",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "6.90",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "1240",
        bestRating: "5",
        worstRating: "1",
      },
    },
  },

  // ── INFO / SOPORTE ──────────────────────────────────────────────────────────
  {
    path: "/faq",
    locale: "es",
    title: "Preguntas Frecuentes sobre Registro, Distribución e IA | Musicdibs",
    description: "Respuestas a las dudas más comunes sobre registro blockchain de música, distribución a Spotify, créditos y AI Studio en Musicdibs.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Cuánto tiempo tarda el registro blockchain?",
          acceptedAnswer: { "@type": "Answer", text: "El registro en blockchain es instantáneo, menos de 15 segundos. Recibes el certificado digital inmediatamente." },
        },
        {
          "@type": "Question",
          name: "¿Tiene validez legal el certificado de Musicdibs?",
          acceptedAnswer: { "@type": "Answer", text: "Sí. El certificado tiene validez legal en más de 175 países bajo el Convenio de Berna, el Tratado OMPI y el reglamento eIDAS en la UE." },
        },
        {
          "@type": "Question",
          name: "¿Puedo distribuir mi música en Spotify con Musicdibs?",
          acceptedAnswer: { "@type": "Answer", text: "Sí. Musicdibs distribuye a 220+ plataformas incluyendo Spotify, Apple Music, TikTok y YouTube Music. Musicdibs no cobra ninguna comisión sobre tus royalties de streaming." },
        },
      ],
    },
  },
  {
    path: "/legal-validity",
    locale: "es",
    title: "Validez Legal del Registro Blockchain de Música | Musicdibs",
    description: "Marco legal del registro de obras musicales en blockchain: eIDAS, Convenio de Berna, OMPI y admisibilidad como prueba en procedimientos judiciales.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Validez Legal del Registro Blockchain de Música",
      author: { "@type": "Organization", name: "Musicdibs" },
      publisher: { "@type": "Organization", name: "Musicdibs", url: BASE_URL },
      description: "Análisis del marco legal que respalda el registro blockchain como prueba de autoría musical.",
    },
  },
  {
    path: "/marketing",
    locale: "es",
    title: "Marketing Musical Profesional: Portadas, Vídeos y Promoción | Musicdibs",
    description: "Servicios profesionales de marketing musical: diseño de portadas, vídeos promocionales y gestión de redes sociales. Impulsa tu carrera artística con Musicdibs.",
  },
  {
    path: "/partners",
    locale: "es",
    title: "Partners y Colaboraciones | Musicdibs",
    description: "Programa de partners de Musicdibs: sellos, academias de música, estudios y profesionales del sector. Soluciones white-label y licencias personalizadas.",
  },
  {
    path: "/contact",
    locale: "es",
    title: "Contacto | Musicdibs",
    description: "Contacta con el equipo de Musicdibs para soporte, consultas de distribución, presupuestos enterprise o colaboraciones. Respuesta en menos de 24h.",
  },
  {
    path: "/verify",
    locale: "es",
    title: "Verificar Certificado Blockchain de Obra Musical | Musicdibs",
    description: "Verifica la autenticidad de cualquier certificado Musicdibs. Comprueba el hash blockchain, el timestamp y la identidad del autor registrado.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Verificador de Certificados Musicdibs",
      description: "Herramienta para verificar la autenticidad de certificados blockchain de obras musicales.",
      applicationCategory: "UtilityApplication",
    },
  },

  // ── LEGAL ───────────────────────────────────────────────────────────────────
  {
    path: "/cookies",
    locale: "es",
    title: "Política de Cookies | Musicdibs",
    description: "Política de cookies de Musicdibs: qué cookies usamos, para qué sirven y cómo gestionarlas desde tu navegador.",
  },
  {
    path: "/terms",
    locale: "es",
    title: "Términos y Condiciones de Uso | Musicdibs",
    description: "Términos y condiciones de uso de Musicdibs. Condiciones del servicio de registro blockchain, distribución musical y herramientas de IA.",
  },
  {
    path: "/privacy",
    locale: "es",
    title: "Política de Privacidad y Protección de Datos | Musicdibs",
    description: "Política de privacidad de Musicdibs: cómo recopilamos, tratamos y protegemos tus datos personales según GDPR y la normativa española.",
  },

  // ── PILLAR / COMPARISON LANDINGS ───────────────────────────────────────────
  {
    path: "/all-in-one-music-platform",
    locale: "en",
    title: "All-in-One Music Platform for Independent Artists | Musicdibs",
    description: "One platform for the full music release workflow: AI-assisted creation, blockchain copyright protection, distribution to 200+ platforms and built-in promotion.",
  },
  {
    path: "/musicdibs-vs-distrokid",
    locale: "en",
    title: "Musicdibs vs DistroKid: Complete Workflow vs Distribution | Musicdibs",
    description: "DistroKid is great at distribution. See what's missing — and how Musicdibs covers creation, protection, distribution and promotion in one place.",
  },
  {
    path: "/musicdibs-vs-udio",
    locale: "en",
    title: "Musicdibs vs Udio: AI Song Generation Plus Copyright and Distribution",
    description: "Udio generates AI songs. Musicdibs generates them, blockchain-certifies your copyright and distributes to Spotify and 220+ platforms. Honest 2026 comparison.",
  },
  {
    path: "/music-maker",
    locale: "en",
    title: "AI Music Maker: Create, Copyright and Release Songs in Minutes | Musicdibs",
    description: "The all-in-one AI music maker: generate full songs with AI vocals and lyrics, protect your copyright on blockchain, and release to Spotify and 220+ platforms.",
  },
  {
    path: "/creador-de-musica",
    locale: "es",
    title: "Creador de Música con IA: Crea, Registra y Publica Canciones en Minutos | Musicdibs",
    description: "El creador de música con IA todo-en-uno: genera canciones completas con voces y letras, registra tu copyright en blockchain y publica en Spotify y +220 plataformas.",
  },


  // ── NEWS INDEX ─────────────────────────────────────────────────────────────
  {
    path: "/news",
    locale: "es",
    title: "Blog y Novedades sobre Música, IA y Distribución | Musicdibs",
    description: "Noticias, guías y tutoriales sobre distribución musical, registro blockchain, IA aplicada a la música y crecimiento de artistas independientes.",
  },
];
