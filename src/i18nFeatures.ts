import { useTranslation } from "react-i18next";

/** Copy for the public /features page (ES, EN, PT-BR). */
export type FeaturesCopy = typeof COPY_ES;

const COPY_ES = {
  seo: {
    title: "Funcionalidades: Crea, Protege, Distribuye y Promociona tu Música",
    description:
      "Todo lo que necesita un artista independiente en una sola plataforma: AI Music Studio, registro blockchain, distribución a 220+ plataformas y promoción con IA. Desde €6,90/mes.",
  },
  hero: {
    badge: "Stack completo para artistas independientes",
    titleA: "Crea. Protege.",
    titleB: "Distribuye. Promociona.",
    subtitle:
      "El único stack completo para músicos independientes en el mercado hispanohablante. Crea canciones con IA, registra tu propiedad intelectual, distribuye a todo el mundo y genera contenido visual — todo desde un solo lugar.",
    ctaPrimary: "Empezar gratis",
    ctaSecondary: "Ver distribución",
  },
  pillars: [
    {
      id: "create",
      badge: "CREA",
      title: "AI Music Studio",
      subtitle: "Crea canciones profesionales desde cero",
      description:
        "Sube tu voz a capella y nuestra IA construye toda la producción alrededor: afinación, instrumentación, arreglos y mezcla profesional en minutos. O genera música completa desde un prompt de texto.",
      features: [
        { label: "Voz + producción completa", desc: "Sube tu voz, la IA hace el resto" },
        { label: "Generación desde texto", desc: "Describe tu canción, la IA la crea" },
        { label: "AI Mastering", desc: "Listo para Spotify y Apple Music" },
        { label: "Generación de letras", desc: "Letras en español, inglés y portugués" },
      ],
      subroutes: [
        { label: "Crear canción", href: "/ai-studio/create" },
        { label: "Voz a canción", href: "/ai-studio/vocal" },
        { label: "AI Mastering", href: "/ai-studio/enhance" },
        { label: "Inspiración", href: "/ai-studio/inspire" },
      ],
      cta: "Abrir AI Studio",
    },
    {
      id: "protect",
      badge: "PROTEGE",
      title: "Registro Blockchain de IP",
      subtitle: "Prueba legal de autoría instantánea",
      description:
        "Registra tus obras en blockchain con un certificado digital inmutable. Hash criptográfico + timestamp. Válido como prueba legal en más de 175 países bajo el Convenio de Berna, el Tratado OMPI y el reglamento eIDAS.",
      features: [
        { label: "Certificación en <15 segundos", desc: "Proceso 100% automatizado" },
        { label: "Válido en 175+ países", desc: "Berna, OMPI y eIDAS" },
        { label: "Hash criptográfico", desc: "Inmutable e infalsificable" },
        { label: "Certificado descargable", desc: "PDF con evidencia blockchain" },
      ],
      subroutes: [
        { label: "Registrar obra", href: "/registro-obras-musicales" },
        { label: "Validez legal", href: "/legal-validity" },
        { label: "Verificar certificado", href: "/verify" },
        { label: "Register a song (EN)", href: "/register-a-song" },
      ],
      cta: "Registrar mi música",
    },
    {
      id: "distribute",
      badge: "DISTRIBUYE",
      title: "Distribución Musical Global",
      subtitle: "220+ plataformas. Sin comisión de Musicdibs sobre tus royalties. Sin permanencia.",
      description:
        "Distribuye tu música a Spotify, Apple Music, TikTok, YouTube Music, Amazon y 220+ plataformas globales. Musicdibs no cobra ninguna comisión sobre tus royalties de streaming. Alta en 24–48 horas.",
      features: [
        { label: "220+ plataformas", desc: "Spotify, Apple, TikTok y más" },
        { label: "Sin comisión sobre royalties", desc: "Musicdibs no retiene comisión de streaming" },
        { label: "Alta en 24–48h", desc: "Sin esperas interminables" },
        { label: "YouTube Content ID", desc: "Monetiza cada uso en YouTube" },
      ],
      subroutes: [
        { label: "Distribución musical", href: "/distribution" },
        { label: "YouTube Content ID", href: "/distribution#content-id" },
        { label: "Canal oficial YT (OAC)", href: "/distribution#oac" },
      ],
      cta: "Distribuir mi música",
    },
    {
      id: "promote",
      badge: "PROMOCIONA",
      title: "Promoción con IA",
      subtitle: "Contenido visual y presencia en redes, automatizados",
      description:
        "Genera portadas profesionales, posts, flyers, stories y vídeos cortos para redes sociales con IA. Y si quieres más alcance, publicamos tu música en los canales propios de Musicdibs: TikTok (245k) e Instagram (100k).",
      features: [
        { label: "Portadas con IA", desc: "Listas para cualquier plataforma" },
        { label: "Vídeos y Reels con IA", desc: "TikTok, Instagram y YouTube Shorts" },
        { label: "Post y stories IA", desc: "Diseños listos para publicar" },
        { label: "Canales propios", desc: "TikTok 245k · Instagram 100k" },
      ],
      subroutes: [
        { label: "Portadas IA", href: "/ai-studio/covers" },
        { label: "Vídeos IA", href: "/ai-studio/video" },
        { label: "Material promo", href: "/ai-studio/promo-material" },
        { label: "Promoción activa", href: "/promocion-musical" },
      ],
      cta: "Crear contenido",
    },
  ],
  compare: {
    title: "Musicdibs vs la competencia",
    subtitle: "El único stack que cubre los cuatro pilares: crear, proteger, distribuir y promocionar.",
    tableHeader: "Funcionalidad",
    rows: [
      "Distribución a 220+ plataformas",
      "Sin comisión de Musicdibs sobre royalties de streaming",
      "Registro blockchain IP",
      "Validez legal global (175+ países)",
      "Certificación en <15 segundos",
      "Generación música con IA",
      "AI Mastering integrado",
      "Portadas con IA",
      "Vídeos promocionales con IA",
      "Canales sociales propios",
      "YouTube Content ID",
      "Sin permanencia",
      "Mercado hispanohablante",
    ],
  },
  closingCta: {
    title: "Todo lo que necesitas para vivir de tu música",
    subtitle: "Más de 100.000 artistas ya usan Musicdibs. Empieza gratis y escala cuando quieras.",
    ctaPrimary: "Crear cuenta gratis",
    ctaSecondary: "Ver preguntas frecuentes",
    footnote: "Desde €6,90/mes · Sin permanencia · 3 créditos gratis al registrarte",
  },
};

const COPY_EN: FeaturesCopy = {
  seo: {
    title: "Features: Create, Protect, Distribute and Promote your Music",
    description:
      "Everything an independent artist needs on one platform: AI Music Studio, blockchain registration, distribution to 220+ platforms and AI-powered promotion. From €6.90/month.",
  },
  hero: {
    badge: "The complete stack for independent artists",
    titleA: "Create. Protect.",
    titleB: "Distribute. Promote.",
    subtitle:
      "The only complete stack for independent musicians in the Spanish-speaking market. Create songs with AI, register your intellectual property, distribute worldwide and generate visual content — all from one place.",
    ctaPrimary: "Start for free",
    ctaSecondary: "See distribution",
  },
  pillars: [
    {
      id: "create",
      badge: "CREATE",
      title: "AI Music Studio",
      subtitle: "Create professional songs from scratch",
      description:
        "Upload your a cappella voice and our AI builds the whole production around it: tuning, instrumentation, arrangements and a professional mix in minutes. Or generate full songs from a text prompt.",
      features: [
        { label: "Voice + full production", desc: "Upload your voice, AI does the rest" },
        { label: "Generation from text", desc: "Describe your song, AI creates it" },
        { label: "AI Mastering", desc: "Ready for Spotify and Apple Music" },
        { label: "Lyrics generation", desc: "Lyrics in Spanish, English and Portuguese" },
      ],
      subroutes: [
        { label: "Create a song", href: "/ai-studio/create" },
        { label: "Voice to song", href: "/ai-studio/vocal" },
        { label: "AI Mastering", href: "/ai-studio/enhance" },
        { label: "Inspiration", href: "/ai-studio/inspire" },
      ],
      cta: "Open AI Studio",
    },
    {
      id: "protect",
      badge: "PROTECT",
      title: "Blockchain IP Registration",
      subtitle: "Instant legal proof of authorship",
      description:
        "Register your works on the blockchain with an immutable digital certificate. Cryptographic hash + timestamp. Valid as legal proof in more than 175 countries under the Berne Convention, the WIPO Treaty and eIDAS regulation.",
      features: [
        { label: "Certification in <15 seconds", desc: "100% automated process" },
        { label: "Valid in 175+ countries", desc: "Berne, WIPO and eIDAS" },
        { label: "Cryptographic hash", desc: "Immutable and tamper-proof" },
        { label: "Downloadable certificate", desc: "PDF with blockchain evidence" },
      ],
      subroutes: [
        { label: "Register a work", href: "/registro-obras-musicales" },
        { label: "Legal validity", href: "/legal-validity" },
        { label: "Verify certificate", href: "/verify" },
        { label: "Register a song (EN)", href: "/register-a-song" },
      ],
      cta: "Register my music",
    },
    {
      id: "distribute",
      badge: "DISTRIBUTE",
      title: "Global Music Distribution",
      subtitle: "220+ platforms. No Musicdibs commission on your royalties. No commitment.",
      description:
        "Distribute your music to Spotify, Apple Music, TikTok, YouTube Music, Amazon and 220+ global platforms. Musicdibs charges no commission on your streaming royalties. Live in 24–48 hours.",
      features: [
        { label: "220+ platforms", desc: "Spotify, Apple, TikTok and more" },
        { label: "No commission on royalties", desc: "Musicdibs keeps no streaming commission" },
        { label: "Live in 24–48h", desc: "No endless waiting" },
        { label: "YouTube Content ID", desc: "Monetise every use on YouTube" },
      ],
      subroutes: [
        { label: "Music distribution", href: "/distribution" },
        { label: "YouTube Content ID", href: "/distribution#content-id" },
        { label: "Official YT channel (OAC)", href: "/distribution#oac" },
      ],
      cta: "Distribute my music",
    },
    {
      id: "promote",
      badge: "PROMOTE",
      title: "AI-Powered Promotion",
      subtitle: "Visual content and social presence, automated",
      description:
        "Generate professional covers, posts, flyers, stories and short videos for social media with AI. And if you want more reach, we publish your music on Musicdibs' own channels: TikTok (245k) and Instagram (100k).",
      features: [
        { label: "AI covers", desc: "Ready for any platform" },
        { label: "AI videos and Reels", desc: "TikTok, Instagram and YouTube Shorts" },
        { label: "AI posts and stories", desc: "Designs ready to publish" },
        { label: "Own channels", desc: "TikTok 245k · Instagram 100k" },
      ],
      subroutes: [
        { label: "AI covers", href: "/ai-studio/covers" },
        { label: "AI videos", href: "/ai-studio/video" },
        { label: "Promo material", href: "/ai-studio/promo-material" },
        { label: "Active promotion", href: "/promocion-musical" },
      ],
      cta: "Create content",
    },
  ],
  compare: {
    title: "Musicdibs vs the competition",
    subtitle: "The only stack that covers all four pillars: create, protect, distribute and promote.",
    tableHeader: "Feature",
    rows: [
      "Distribution to 220+ platforms",
      "No Musicdibs commission on streaming royalties",
      "Blockchain IP registration",
      "Global legal validity (175+ countries)",
      "Certification in <15 seconds",
      "AI music generation",
      "Integrated AI Mastering",
      "AI covers",
      "AI promo videos",
      "Own social channels",
      "YouTube Content ID",
      "No commitment",
      "Spanish-speaking market",
    ],
  },
  closingCta: {
    title: "Everything you need to make a living from your music",
    subtitle: "Over 100,000 artists already use Musicdibs. Start for free and scale whenever you want.",
    ctaPrimary: "Create free account",
    ctaSecondary: "See FAQ",
    footnote: "From €6.90/month · No commitment · 3 free credits when you sign up",
  },
};

const COPY_PT: FeaturesCopy = {
  seo: {
    title: "Funcionalidades: Crie, Proteja, Distribua e Promova a sua Música",
    description:
      "Tudo o que um artista independente precisa em uma única plataforma: AI Music Studio, registro em blockchain, distribuição para mais de 220 plataformas e promoção com IA. A partir de €6,90/mês.",
  },
  hero: {
    badge: "Stack completo para artistas independentes",
    titleA: "Crie. Proteja.",
    titleB: "Distribua. Promova.",
    subtitle:
      "O único stack completo para músicos independentes no mercado de língua espanhola. Crie músicas com IA, registre sua propriedade intelectual, distribua para o mundo todo e gere conteúdo visual — tudo em um só lugar.",
    ctaPrimary: "Começar grátis",
    ctaSecondary: "Ver distribuição",
  },
  pillars: [
    {
      id: "create",
      badge: "CRIAR",
      title: "AI Music Studio",
      subtitle: "Crie músicas profissionais do zero",
      description:
        "Envie sua voz a cappella e nossa IA constrói toda a produção ao redor: afinação, instrumentação, arranjos e mixagem profissional em minutos. Ou gere músicas completas a partir de um prompt de texto.",
      features: [
        { label: "Voz + produção completa", desc: "Envie sua voz, a IA faz o resto" },
        { label: "Geração a partir de texto", desc: "Descreva sua música, a IA cria" },
        { label: "AI Mastering", desc: "Pronto para Spotify e Apple Music" },
        { label: "Geração de letras", desc: "Letras em espanhol, inglês e português" },
      ],
      subroutes: [
        { label: "Criar música", href: "/ai-studio/create" },
        { label: "Voz para música", href: "/ai-studio/vocal" },
        { label: "AI Mastering", href: "/ai-studio/enhance" },
        { label: "Inspiração", href: "/ai-studio/inspire" },
      ],
      cta: "Abrir AI Studio",
    },
    {
      id: "protect",
      badge: "PROTEGER",
      title: "Registro em Blockchain de PI",
      subtitle: "Prova legal de autoria instantânea",
      description:
        "Registre suas obras na blockchain com um certificado digital imutável. Hash criptográfico + timestamp. Válido como prova legal em mais de 175 países sob a Convenção de Berna, o Tratado da OMPI e o regulamento eIDAS.",
      features: [
        { label: "Certificação em <15 segundos", desc: "Processo 100% automatizado" },
        { label: "Válido em mais de 175 países", desc: "Berna, OMPI e eIDAS" },
        { label: "Hash criptográfico", desc: "Imutável e inviolável" },
        { label: "Certificado para download", desc: "PDF com evidência em blockchain" },
      ],
      subroutes: [
        { label: "Registrar obra", href: "/registro-obras-musicales" },
        { label: "Validade legal", href: "/legal-validity" },
        { label: "Verificar certificado", href: "/verify" },
        { label: "Register a song (EN)", href: "/register-a-song" },
      ],
      cta: "Registrar minha música",
    },
    {
      id: "distribute",
      badge: "DISTRIBUIR",
      title: "Distribuição Musical Global",
      subtitle: "220+ plataformas. Sem comissão da Musicdibs sobre seus royalties. Sem fidelidade.",
      description:
        "Distribua sua música para Spotify, Apple Music, TikTok, YouTube Music, Amazon e mais de 220 plataformas globais. A Musicdibs não cobra nenhuma comissão sobre seus royalties de streaming. Publicação em 24–48 horas.",
      features: [
        { label: "220+ plataformas", desc: "Spotify, Apple, TikTok e mais" },
        { label: "Sem comissão sobre royalties", desc: "A Musicdibs não retém comissão de streaming" },
        { label: "Publicação em 24–48h", desc: "Sem esperas intermináveis" },
        { label: "YouTube Content ID", desc: "Monetize cada uso no YouTube" },
      ],
      subroutes: [
        { label: "Distribuição musical", href: "/distribution" },
        { label: "YouTube Content ID", href: "/distribution#content-id" },
        { label: "Canal oficial YT (OAC)", href: "/distribution#oac" },
      ],
      cta: "Distribuir minha música",
    },
    {
      id: "promote",
      badge: "PROMOVER",
      title: "Promoção com IA",
      subtitle: "Conteúdo visual e presença nas redes, automatizados",
      description:
        "Gere capas profissionais, posts, flyers, stories e vídeos curtos para redes sociais com IA. E se quiser mais alcance, publicamos sua música nos canais próprios da Musicdibs: TikTok (245k) e Instagram (100k).",
      features: [
        { label: "Capas com IA", desc: "Prontas para qualquer plataforma" },
        { label: "Vídeos e Reels com IA", desc: "TikTok, Instagram e YouTube Shorts" },
        { label: "Posts e stories com IA", desc: "Designs prontos para publicar" },
        { label: "Canais próprios", desc: "TikTok 245k · Instagram 100k" },
      ],
      subroutes: [
        { label: "Capas com IA", href: "/ai-studio/covers" },
        { label: "Vídeos com IA", href: "/ai-studio/video" },
        { label: "Material promocional", href: "/ai-studio/promo-material" },
        { label: "Promoção ativa", href: "/promocion-musical" },
      ],
      cta: "Criar conteúdo",
    },
  ],
  compare: {
    title: "Musicdibs vs a concorrência",
    subtitle: "O único stack que cobre os quatro pilares: criar, proteger, distribuir e promover.",
    tableHeader: "Funcionalidade",
    rows: [
      "Distribuição para 220+ plataformas",
      "Sem comissão da Musicdibs sobre royalties de streaming",
      "Registro de PI em blockchain",
      "Validade legal global (175+ países)",
      "Certificação em <15 segundos",
      "Geração de música com IA",
      "AI Mastering integrado",
      "Capas com IA",
      "Vídeos promocionais com IA",
      "Canais sociais próprios",
      "YouTube Content ID",
      "Sem fidelidade",
      "Mercado de língua espanhola",
    ],
  },
  closingCta: {
    title: "Tudo o que você precisa para viver da sua música",
    subtitle: "Mais de 100.000 artistas já usam a Musicdibs. Comece grátis e escale quando quiser.",
    ctaPrimary: "Criar conta grátis",
    ctaSecondary: "Ver perguntas frequentes",
    footnote: "A partir de €6,90/mês · Sem fidelidade · 3 créditos grátis ao se cadastrar",
  },
};

const DICT: Record<string, FeaturesCopy> = {
  es: COPY_ES,
  en: COPY_EN,
  "pt-BR": COPY_PT,
};

export function useFeaturesCopy(): FeaturesCopy {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "es";
  if (DICT[lang]) return DICT[lang];
  if (lang.startsWith("pt")) return COPY_PT;
  if (lang.startsWith("en")) return COPY_EN;
  return COPY_ES;
}
