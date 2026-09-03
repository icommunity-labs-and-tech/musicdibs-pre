import { useTranslation } from "react-i18next";

/** Copy for the public /promocion-musical page (ES, EN, PT-BR). */
export type PromocionMusicalCopy = typeof COPY_ES;

const COPY_ES = {
  seo: {
    title: "Distribución y promoción musical · Lanza tu música al mundo | Musicdibs",
    description:
      "Distribuye tu música en +220 plataformas globales y promociónala en la red de Musicdibs con cientos de miles de seguidores reales en Instagram.",
    ogTitle: "Distribución y promoción musical · Musicdibs",
    ogDescription:
      "Distribución global ilimitada + promoción orgánica en redes. Todo en un solo lugar.",
  },
  navbar: {
    cta: "Empezar ahora",
  },
  hero: {
    badge: "Distribución global + Promoción en redes",
    titleA: "Lanza tu música al mundo y",
    titleB: "llega a miles de fans",
    subtitle:
      "Distribuye tus canciones en más de {platforms} y, al mismo tiempo, impúlsalas en los canales de Musicdibs, con una audiencia de {followers} especializados en el sector musical.",
    platforms: "220 plataformas globales",
    followers: "cientos de miles de seguidores reales",
    cta: "Empezar ahora",
    distribution: {
      badge: "Distribución",
      title: "+220 plataformas globales",
      chips: ["Regalías", "Estadísticas", "Lanzamientos"],
    },
    promotion: {
      badge: "Promoción",
      title: "Cientos de miles de fans reales",
    },
  },
  pillars: {
    badge: "Dos servicios. Un solo lugar.",
    titleA: "Los",
    titleHighlight: "dos pilares",
    titleB: "de tu lanzamiento",
    subtitle: "Distribuir sin promocionar es publicar al vacío. Promocionar sin distribuir es no existir.",
    subtitleHighlight: "Nosotros hacemos las dos.",
    row1: {
      badge: "Distribución",
      title: "Lleva tu música a todo el mundo",
      description: "Lanza en {platforms} y conserva {royalties}. Un solo panel para gestionarlo todo.",
      platforms: "+220 plataformas digitales",
      royalties: "el 100% de las regalías",
      stat1Value: "+220",
      stat1Label: "Plataformas",
      stat2Value: "100%",
      stat2Label: "Regalías para ti",
      stat3Value: "∞",
      stat3Label: "Lanzamientos",
      features: [
        "Spotify, Apple Music, Amazon, YouTube Music…",
        "Estadísticas en tiempo real",
        "Lanzamientos ilimitados",
      ],
    },
    row2: {
      badge: "Promoción",
      title: "Conecta con audiencia real",
      description: "Te hacemos visible ante una comunidad de {audience} y profesionales del sector.",
      audience: "cientos de miles de melómanos",
      stat1Value: "+500k",
      stat1Label: "Seguidores RRSS",
      stat2Value: "100%",
      stat2Label: "Audiencia real",
      stat3Value: "2",
      stat3Label: "Canales activos",
      instagramPrefix: "Instagram",
      instagramHandle: "@musicdibs",
      tiktokPrefix: "+ TikTok",
      tiktokHandle: "@musicdibs_",
      feature2: "Promoción curada por expertos",
      feature3: "Crecimiento orgánico medible",
    },
    cta: "Empezar ahora",
    ctaNote: "Sin permanencia · Cancela cuando quieras",
  },
  ecosystem: {
    badge: "Todo el poder de Musicdibs",
    titleA: "Mucho más que distribución y",
    titleHighlight: "promoción",
    subtitle: "Descubre el resto de herramientas diseñadas para potenciar tu carrera musical en cada etapa.",
    cta: "Explora todas las herramientas",
  },
  finalCta: {
    titleA: "¿Listo para llevar tu música al",
    titleHighlight: "siguiente nivel",
    titleEnd: "?",
    subtitle: "Distribuye en +220 plataformas y promociónala con nuestra red en un solo clic.",
    cta: "Distribuir y promocionar mi música",
  },
  carousel: {
    goToSlide: (n: number) => `Ir a la diapositiva ${n}`,
  },
  slides: [
    {
      badge: "Registro Musical",
      title: "Registra tus canciones y protege tus",
      highlight: "derechos de autor",
      desc: "Evidencia blockchain con fecha, autoría y certificado verificable con validez legal en +180 países.",
      bullets: [
        "Registro en blockchain inmutable",
        "Derechos de autor con validez legal",
        "Certificado verificable internacional",
      ],
    },
    {
      badge: "AI Music Studio",
      title: "Crea y mejora canciones con",
      highlight: "inteligencia artificial",
      desc: "Genera ideas nuevas o lleva tus demos al siguiente nivel con modelos de última generación.",
      bullets: [
        "Composición asistida por IA",
        "Mejora calidad de tus pistas",
        "Variaciones y remezclas en segundos",
      ],
    },
    {
      badge: "Sube y profesionaliza",
      title: "Convierte tus demos en",
      highlight: "música profesional",
      desc: "Sube tu material y obtén versiones limpias, equilibradas y listas para sonar como un disco editado.",
      bullets: [
        "Procesado de audio profesional",
        "Mezcla y limpieza automática",
        "Resultados listos para distribuir",
      ],
    },
    {
      badge: "Masterización",
      title: "Máster final con sonido",
      highlight: "de estudio",
      desc: "Masterización inteligente adaptada a streaming, radio y plataformas digitales sin perder dinámica.",
      bullets: [
        "Optimizado para Spotify y YouTube",
        "Loudness adaptado a cada plataforma",
        "Calidad broadcast en un clic",
      ],
    },
    {
      badge: "Contenido promocional",
      title: "Genera portadas, vídeos y",
      highlight: "creatividades virales",
      desc: "Todo el material visual que necesitas para lanzar tu canción y destacar en redes sociales.",
      bullets: [
        "Portadas únicas con IA",
        "Vídeos para Reels y TikTok",
        "Creatividades para campañas",
      ],
    },
    {
      badge: "Artistas virtuales",
      title: "Crea perfiles e identidades",
      highlight: "con IA",
      desc: "Diseña artistas virtuales completos, con estética, biografía y catálogo coherente desde cero.",
      bullets: [
        "Identidad visual coherente",
        "Estilo, voz y biografía a medida",
        "Catálogo musical asociado",
      ],
    },
  ],
};

const COPY_EN: PromocionMusicalCopy = {
  seo: {
    title: "Music distribution and promotion · Take your music to the world | Musicdibs",
    description:
      "Distribute your music on +220 global platforms and promote it across Musicdibs' network with hundreds of thousands of real Instagram followers.",
    ogTitle: "Music distribution and promotion · Musicdibs",
    ogDescription:
      "Unlimited global distribution + organic social promotion. All in one place.",
  },
  navbar: {
    cta: "Get started",
  },
  hero: {
    badge: "Global distribution + Social promotion",
    titleA: "Take your music to the world and",
    titleB: "reach thousands of fans",
    subtitle:
      "Distribute your songs on more than {platforms} and, at the same time, boost them across Musicdibs' channels, with an audience of {followers} specialised in the music industry.",
    platforms: "220 global platforms",
    followers: "hundreds of thousands of real followers",
    cta: "Get started",
    distribution: {
      badge: "Distribution",
      title: "+220 global platforms",
      chips: ["Royalties", "Statistics", "Releases"],
    },
    promotion: {
      badge: "Promotion",
      title: "Hundreds of thousands of real fans",
    },
  },
  pillars: {
    badge: "Two services. One place.",
    titleA: "The",
    titleHighlight: "two pillars",
    titleB: "of your release",
    subtitle: "Distributing without promoting is publishing into the void. Promoting without distributing means you don't exist.",
    subtitleHighlight: "We do both.",
    row1: {
      badge: "Distribution",
      title: "Take your music everywhere",
      description: "Release on {platforms} and keep {royalties}. A single dashboard to manage it all.",
      platforms: "+220 digital platforms",
      royalties: "100% of your royalties",
      stat1Value: "+220",
      stat1Label: "Platforms",
      stat2Value: "100%",
      stat2Label: "Royalties for you",
      stat3Value: "∞",
      stat3Label: "Releases",
      features: [
        "Spotify, Apple Music, Amazon, YouTube Music…",
        "Real-time statistics",
        "Unlimited releases",
      ],
    },
    row2: {
      badge: "Promotion",
      title: "Connect with a real audience",
      description: "We make you visible to a community of {audience} and industry professionals.",
      audience: "hundreds of thousands of music lovers",
      stat1Value: "+500k",
      stat1Label: "Social followers",
      stat2Value: "100%",
      stat2Label: "Real audience",
      stat3Value: "2",
      stat3Label: "Active channels",
      instagramPrefix: "Instagram",
      instagramHandle: "@musicdibs",
      tiktokPrefix: "+ TikTok",
      tiktokHandle: "@musicdibs_",
      feature2: "Promotion curated by experts",
      feature3: "Measurable organic growth",
    },
    cta: "Get started",
    ctaNote: "No commitment · Cancel anytime",
  },
  ecosystem: {
    badge: "The full power of Musicdibs",
    titleA: "Much more than distribution and",
    titleHighlight: "promotion",
    subtitle: "Discover the rest of the tools designed to boost your music career at every stage.",
    cta: "Explore all the tools",
  },
  finalCta: {
    titleA: "Ready to take your music to the",
    titleHighlight: "next level",
    titleEnd: "?",
    subtitle: "Distribute on +220 platforms and promote it with our network in one click.",
    cta: "Distribute and promote my music",
  },
  carousel: {
    goToSlide: (n: number) => `Go to slide ${n}`,
  },
  slides: [
    {
      badge: "Music Registration",
      title: "Register your songs and protect your",
      highlight: "copyright",
      desc: "Blockchain evidence with date, authorship and a verifiable certificate with legal validity in +180 countries.",
      bullets: [
        "Immutable blockchain registration",
        "Legally valid copyright",
        "Internationally verifiable certificate",
      ],
    },
    {
      badge: "AI Music Studio",
      title: "Create and improve songs with",
      highlight: "artificial intelligence",
      desc: "Generate new ideas or take your demos to the next level with state-of-the-art models.",
      bullets: [
        "AI-assisted composition",
        "Improve the quality of your tracks",
        "Variations and remixes in seconds",
      ],
    },
    {
      badge: "Upload and professionalise",
      title: "Turn your demos into",
      highlight: "professional music",
      desc: "Upload your material and get clean, balanced versions ready to sound like a released record.",
      bullets: [
        "Professional audio processing",
        "Automatic mixing and cleanup",
        "Results ready to distribute",
      ],
    },
    {
      badge: "Mastering",
      title: "Final master with",
      highlight: "studio sound",
      desc: "Intelligent mastering tailored to streaming, radio and digital platforms without losing dynamics.",
      bullets: [
        "Optimised for Spotify and YouTube",
        "Loudness adapted to each platform",
        "Broadcast quality in one click",
      ],
    },
    {
      badge: "Promo content",
      title: "Generate covers, videos and",
      highlight: "viral creatives",
      desc: "All the visual material you need to release your song and stand out on social media.",
      bullets: [
        "Unique AI-generated covers",
        "Videos for Reels and TikTok",
        "Creatives for your campaigns",
      ],
    },
    {
      badge: "Virtual artists",
      title: "Create profiles and identities",
      highlight: "with AI",
      desc: "Design complete virtual artists, with aesthetics, biography and a coherent catalogue from scratch.",
      bullets: [
        "Coherent visual identity",
        "Style, voice and biography tailored to you",
        "Associated music catalogue",
      ],
    },
  ],
};

const COPY_PT: PromocionMusicalCopy = {
  seo: {
    title: "Distribuição e promoção musical · Leve sua música ao mundo | Musicdibs",
    description:
      "Distribua sua música em mais de 220 plataformas globais e promova-a na rede da Musicdibs com centenas de milhares de seguidores reais no Instagram.",
    ogTitle: "Distribuição e promoção musical · Musicdibs",
    ogDescription:
      "Distribuição global ilimitada + promoção orgânica nas redes. Tudo em um só lugar.",
  },
  navbar: {
    cta: "Começar agora",
  },
  hero: {
    badge: "Distribuição global + Promoção nas redes",
    titleA: "Leve sua música ao mundo e",
    titleB: "alcance milhares de fãs",
    subtitle:
      "Distribua suas músicas em mais de {platforms} e, ao mesmo tempo, impulsione-as nos canais da Musicdibs, com uma audiência de {followers} especializados no setor musical.",
    platforms: "220 plataformas globais",
    followers: "centenas de milhares de seguidores reais",
    cta: "Começar agora",
    distribution: {
      badge: "Distribuição",
      title: "+220 plataformas globais",
      chips: ["Royalties", "Estatísticas", "Lançamentos"],
    },
    promotion: {
      badge: "Promoção",
      title: "Centenas de milhares de fãs reais",
    },
  },
  pillars: {
    badge: "Dois serviços. Um só lugar.",
    titleA: "Os",
    titleHighlight: "dois pilares",
    titleB: "do seu lançamento",
    subtitle: "Distribuir sem promover é publicar no vazio. Promover sem distribuir é não existir.",
    subtitleHighlight: "Nós fazemos os dois.",
    row1: {
      badge: "Distribuição",
      title: "Leve sua música para o mundo todo",
      description: "Lance em {platforms} e mantenha {royalties}. Um único painel para gerenciar tudo.",
      platforms: "+220 plataformas digitais",
      royalties: "100% dos royalties",
      stat1Value: "+220",
      stat1Label: "Plataformas",
      stat2Value: "100%",
      stat2Label: "Royalties para você",
      stat3Value: "∞",
      stat3Label: "Lançamentos",
      features: [
        "Spotify, Apple Music, Amazon, YouTube Music…",
        "Estatísticas em tempo real",
        "Lançamentos ilimitados",
      ],
    },
    row2: {
      badge: "Promoção",
      title: "Conecte-se com uma audiência real",
      description: "Deixamos você visível para uma comunidade de {audience} e profissionais do setor.",
      audience: "centenas de milhares de amantes de música",
      stat1Value: "+500k",
      stat1Label: "Seguidores nas redes",
      stat2Value: "100%",
      stat2Label: "Audiência real",
      stat3Value: "2",
      stat3Label: "Canais ativos",
      instagramPrefix: "Instagram",
      instagramHandle: "@musicdibs",
      tiktokPrefix: "+ TikTok",
      tiktokHandle: "@musicdibs_",
      feature2: "Promoção curada por especialistas",
      feature3: "Crescimento orgânico mensurável",
    },
    cta: "Começar agora",
    ctaNote: "Sem fidelidade · Cancele quando quiser",
  },
  ecosystem: {
    badge: "Todo o poder da Musicdibs",
    titleA: "Muito mais do que distribuição e",
    titleHighlight: "promoção",
    subtitle: "Descubra as demais ferramentas criadas para impulsionar sua carreira musical em cada etapa.",
    cta: "Explore todas as ferramentas",
  },
  finalCta: {
    titleA: "Pronto para levar sua música ao",
    titleHighlight: "próximo nível",
    titleEnd: "?",
    subtitle: "Distribua em mais de 220 plataformas e promova-a com a nossa rede em um clique.",
    cta: "Distribuir e promover minha música",
  },
  carousel: {
    goToSlide: (n: number) => `Ir para o slide ${n}`,
  },
  slides: [
    {
      badge: "Registro Musical",
      title: "Registre suas músicas e proteja seus",
      highlight: "direitos autorais",
      desc: "Evidência em blockchain com data, autoria e certificado verificável com validade legal em mais de 180 países.",
      bullets: [
        "Registro em blockchain imutável",
        "Direitos autorais com validade legal",
        "Certificado verificável internacionalmente",
      ],
    },
    {
      badge: "AI Music Studio",
      title: "Crie e melhore músicas com",
      highlight: "inteligência artificial",
      desc: "Gere novas ideias ou leve seus demos ao próximo nível com modelos de última geração.",
      bullets: [
        "Composição assistida por IA",
        "Melhore a qualidade das suas faixas",
        "Variações e remixes em segundos",
      ],
    },
    {
      badge: "Envie e profissionalize",
      title: "Transforme seus demos em",
      highlight: "música profissional",
      desc: "Envie seu material e obtenha versões limpas, equilibradas e prontas para soar como um disco lançado.",
      bullets: [
        "Processamento de áudio profissional",
        "Mixagem e limpeza automática",
        "Resultados prontos para distribuir",
      ],
    },
    {
      badge: "Masterização",
      title: "Master final com som",
      highlight: "de estúdio",
      desc: "Masterização inteligente adaptada para streaming, rádio e plataformas digitais sem perder a dinâmica.",
      bullets: [
        "Otimizado para Spotify e YouTube",
        "Loudness adaptado a cada plataforma",
        "Qualidade de broadcast em um clique",
      ],
    },
    {
      badge: "Conteúdo promocional",
      title: "Gere capas, vídeos e",
      highlight: "criativos virais",
      desc: "Todo o material visual que você precisa para lançar sua música e se destacar nas redes sociais.",
      bullets: [
        "Capas exclusivas com IA",
        "Vídeos para Reels e TikTok",
        "Criativos para campanhas",
      ],
    },
    {
      badge: "Artistas virtuais",
      title: "Crie perfis e identidades",
      highlight: "com IA",
      desc: "Crie artistas virtuais completos, com estética, biografia e catálogo coerente do zero.",
      bullets: [
        "Identidade visual coerente",
        "Estilo, voz e biografia sob medida",
        "Catálogo musical associado",
      ],
    },
  ],
};

const DICT: Record<string, PromocionMusicalCopy> = {
  es: COPY_ES,
  en: COPY_EN,
  "pt-BR": COPY_PT,
};

export function usePromocionMusicalCopy(): PromocionMusicalCopy {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "es";
  if (DICT[lang]) return DICT[lang];
  if (lang.startsWith("pt")) return COPY_PT;
  if (lang.startsWith("en")) return COPY_EN;
  return COPY_ES;
}
