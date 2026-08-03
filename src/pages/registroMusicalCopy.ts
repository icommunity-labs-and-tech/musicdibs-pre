export type RegistroLang = "es" | "en" | "pt-BR";

export interface RegistroCopy {
  seoTitle: string;
  seoDesc: string;
  ldName: string;
  ldServiceType: string;
  ldDescription: string;
  navCta: string;
  navSecondary: string;
  heroBadge: string;
  heroTitle1: string;
  heroTitleAccent: string;
  heroSubtitle: string;
  heroCta: string;
  heroBenefits: string[];
  heroExplore: string;
  heroExploreLink: string;
  panelLabel: string;
  panelTrackLabel: string;
  panelTrackMeta: string;
  timeline: { label: string; value: string; meta: string }[];
  badgeOk: string;
  badgeActive: string;
  servicesEyebrow: string;
  servicesTitle1: string;
  servicesTitleAccent: string;
  services: { sub: string; title: string; desc: string }[];
  distributeIn: string;
  morePlatforms: string;
  testimonialsEyebrow: string;
  testimonialsTitle1: string;
  testimonialsTitleAccent: string;
  testimonialsSubtitle: string;
  regEyebrow: string;
  regTitle1: string;
  regTitleAccent: string;
  regDesc: string;
  regBullets: string[];
  regCta: string;
  certTitle: string;
  certVerified: string;
  certFields: { k: string; v: string }[];
  certBerne: string;
  distEyebrow: string;
  distTitle1: string;
  distTitleAccent: string;
  distDesc: string;
  distBullets: string[];
  distCta: string;
  royaltiesBadgeTop: string;
  royaltiesBadgeBottom: string;
  releaseTitle: string;
  releaseStatus: string;
  platformActive: string;
  promoEyebrow: string;
  promoTitle1: string;
  promoTitleAccent: string;
  promoBadge: string;
  promoDesc: string;
  promoBulletPublish: { pre: string; mid: string; post: string };
  promoBullets: string[];
  promoCta: string;
  altInstagram: string;
  altTiktok: string;
}

export const REGISTRO_COPY: Record<RegistroLang, RegistroCopy> = {
  es: {
    seoTitle: "Registro Musical · Protege y distribuye tu música",
    seoDesc:
      "Registra la propiedad intelectual de tus canciones, distribúyelas en +220 plataformas globales y haz crecer tu audiencia con Musicdibs.",
    ldName: "Registro Musical y Distribución con Musicdibs",
    ldServiceType: "Registro de propiedad intelectual musical y distribución digital",
    ldDescription:
      "Registra la propiedad intelectual de tus canciones en blockchain y distribúyelas en más de 220 plataformas globales como Spotify, Apple Music, TikTok, Amazon Music y YouTube Music, sin comisiones sobre tus royalties de streaming.",
    navCta: "🚀 Pruébalo gratis",
    navSecondary: "Iniciar sesión",
    heroBadge: "TODO EN UNO",
    heroTitle1: "Protege y distribuye tu música a nivel",
    heroTitleAccent: "global",
    heroSubtitle:
      "Registra tus derechos de autor en minutos, lanza en +220 plataformas y quédate con tus ingresos: Musicdibs no cobra ninguna comisión sobre tus royalties de streaming. Mantén tu libertad como artista.",
    heroCta: "🚀 Registrar y distribuir mi música",
    heroExplore: "¿Prefieres explorar primero?",
    heroExploreLink: "Crear una cuenta gratis →",
    heroChips: ["Validez legal", "Blockchain", "+220 plataformas"],
    panelLabel: "musicdibs · panel",
    panelTrackLabel: "Tu nuevo single",
    panelTrackMeta: "3:42 · Electrónica",
    timeline: [
      { label: "Registro", value: "Propiedad Intelectual", meta: "Blockchain · Validez legal" },
      { label: "Distribución", value: "+220 plataformas", meta: "Spotify · Apple · TikTok · YouTube" },
      { label: "Promoción", value: "+12.4k oyentes", meta: "Crecimiento +28% esta semana" },
    ],
    badgeOk: "OK",
    badgeActive: "Activo",
    servicesEyebrow: "Servicios",
    servicesTitle1: "Todo lo que tu música necesita,",
    servicesTitleAccent: "en un solo lugar",
    services: [
      {
        sub: "Registro Digital de Obra",
        title: "Protege tu propiedad intelectual",
        desc: "De forma rápida, segura y legalmente vinculante. Certificación blockchain en minutos.",
      },
      {
        sub: "Distribución a +220 Plataformas",
        title: "Tu música en todo el mundo",
        desc: "Spotify, Apple Music, TikTok, Amazon y muchas más, desde un solo panel.",
      },
      {
        sub: "Promoción Musicdibs",
        title: "Llega a miles de oyentes",
        desc: "Crea canciones y actívalas en los canales oficiales de Musicdibs.",
      },
    ],
    distributeIn: "Distribuimos en",
    morePlatforms: "+ 215 más",
    testimonialsEyebrow: "Reseñas · Artistas",
    testimonialsTitle1: "Qué dicen los",
    testimonialsTitleAccent: "artistas de nosotros",
    testimonialsSubtitle:
      "Miles de músicos confían en Musicdibs para proteger su obra. Escucha sus experiencias.",
    regEyebrow: "Registro · Derechos de autor",
    regTitle1: "Tu obra,",
    regTitleAccent: "protegida para siempre",
    regDesc:
      "Generamos un certificado blockchain inmutable con sello de tiempo que acredita tu autoría con validez legal internacional. Sin papeleos, sin esperas, sin intermediarios.",
    regBullets: [
      "Certificación en minutos con hash único y verificable",
      "Validez legal bajo el Convenio de Berna (181 países)",
      "Descarga tu certificado PDF en cualquier momento",
      "Protege letras, melodías, masters y demos",
    ],
    regCta: "Registrar mi obra",
    certTitle: "Certificado Blockchain",
    certVerified: "Verificado",
    certFields: [
      { k: "Obra", v: "Midnight Echoes" },
      { k: "Autor", v: "Tú · 100%" },
      { k: "Fecha", v: "27/05/2026" },
      { k: "Red", v: "Polygon" },
    ],
    certBerne: "Convenio de Berna · Validez en 181 países",
    distEyebrow: "Distribución global",
    distTitle1: "Tu música en",
    distTitleAccent: "+220 plataformas",
    distDesc:
      "Lanza tus canciones en Spotify, Apple Music, TikTok, YouTube Music, Amazon Music y más, desde un único panel. Musicdibs no cobra ninguna comisión sobre tus royalties de streaming.",
    distBullets: [
      "Subida ilimitada de singles, EPs y álbumes",
      "Programación de fecha de lanzamiento global",
      "Sin comisión de Musicdibs sobre royalties de streaming",
      "Estadísticas unificadas de todas las plataformas",
    ],
    distCta: "Distribuir mi música",
    royaltiesBadgeTop: "Sin comisión sobre tus",
    royaltiesBadgeBottom: "Royalties",
    releaseTitle: "Lanzamiento global",
    releaseStatus: "en curso",
    platformActive: "Activo",
    promoEyebrow: "Promoción · TikTok & Instagram",
    promoTitle1: "Haz que tu música",
    promoTitleAccent: "se vuelva viral",
    promoBadge: "Comparte tus canciones con +200k de seguidores",
    promoDesc:
      "Crea o mejora tus canciones, genera contenido visual con IA y promociona tu música a través de los canales oficiales de Musicdibs en TikTok e Instagram.",
    promoBulletPublish: { pre: "Publicación en", mid: "(Instagram) y", post: "(TikTok)" },
    promoBullets: [
      "Creatividades adaptadas a Reels y formato vertical",
      "Audiencias afines para multiplicar tus reproducciones",
    ],
    promoCta: "Promocionar mi música",
    altInstagram: "Promoción de tu música en Instagram con +100k seguidores",
    altTiktok: "Promoción de tu música en TikTok con +245k seguidores",
  },

  en: {
    seoTitle: "Music Registration · Protect and distribute your music",
    seoDesc:
      "Register the copyright of your songs, distribute them to 220+ global platforms and grow your audience with Musicdibs.",
    ldName: "Music Registration and Distribution with Musicdibs",
    ldServiceType: "Music copyright registration and digital distribution",
    ldDescription:
      "Register the copyright of your songs on blockchain and distribute them to more than 220 global platforms such as Spotify, Apple Music, TikTok, Amazon Music and YouTube Music, with no commission on your streaming royalties.",
    navCta: "🚀 Try it free",
    navSecondary: "Log in",
    heroBadge: "ALL IN ONE",
    heroTitle1: "Protect and distribute your music",
    heroTitleAccent: "worldwide",
    heroSubtitle:
      "Register your copyright in minutes, release on 220+ platforms and keep your earnings: Musicdibs charges no commission on your streaming royalties. Keep your freedom as an artist.",
    heroCta: "🚀 Register and distribute my music",
    heroExplore: "Would you rather explore first?",
    heroExploreLink: "Create a free account →",
    heroChips: ["Legal validity", "Blockchain", "220+ platforms"],
    panelLabel: "musicdibs · dashboard",
    panelTrackLabel: "Your new single",
    panelTrackMeta: "3:42 · Electronic",
    timeline: [
      { label: "Registration", value: "Copyright", meta: "Blockchain · Legally valid" },
      { label: "Distribution", value: "220+ platforms", meta: "Spotify · Apple · TikTok · YouTube" },
      { label: "Promotion", value: "+12.4k listeners", meta: "Growth +28% this week" },
    ],
    badgeOk: "OK",
    badgeActive: "Active",
    servicesEyebrow: "Services",
    servicesTitle1: "Everything your music needs,",
    servicesTitleAccent: "in one place",
    services: [
      {
        sub: "Digital Work Registration",
        title: "Protect your copyright",
        desc: "Fast, secure and legally binding. Blockchain certification in minutes.",
      },
      {
        sub: "Distribution to 220+ Platforms",
        title: "Your music all over the world",
        desc: "Spotify, Apple Music, TikTok, Amazon and many more, from a single dashboard.",
      },
      {
        sub: "Musicdibs Promotion",
        title: "Reach thousands of listeners",
        desc: "Create songs and push them out through Musicdibs' official channels.",
      },
    ],
    distributeIn: "We distribute to",
    morePlatforms: "+ 215 more",
    testimonialsEyebrow: "Reviews · Artists",
    testimonialsTitle1: "What artists",
    testimonialsTitleAccent: "say about us",
    testimonialsSubtitle:
      "Thousands of musicians trust Musicdibs to protect their work. Hear their experiences.",
    regEyebrow: "Registration · Copyright",
    regTitle1: "Your work,",
    regTitleAccent: "protected forever",
    regDesc:
      "We generate an immutable blockchain certificate with a timestamp that proves your authorship with international legal validity. No paperwork, no waiting, no middlemen.",
    regBullets: [
      "Certification in minutes with a unique, verifiable hash",
      "Legal validity under the Berne Convention (181 countries)",
      "Download your PDF certificate whenever you need it",
      "Protect lyrics, melodies, masters and demos",
    ],
    regCta: "Register my work",
    certTitle: "Blockchain Certificate",
    certVerified: "Verified",
    certFields: [
      { k: "Work", v: "Midnight Echoes" },
      { k: "Author", v: "You · 100%" },
      { k: "Date", v: "27/05/2026" },
      { k: "Network", v: "Polygon" },
    ],
    certBerne: "Berne Convention · Valid in 181 countries",
    distEyebrow: "Global distribution",
    distTitle1: "Your music on",
    distTitleAccent: "220+ platforms",
    distDesc:
      "Release your songs on Spotify, Apple Music, TikTok, YouTube Music, Amazon Music and more, from a single dashboard. Musicdibs charges no commission on your streaming royalties.",
    distBullets: [
      "Unlimited uploads of singles, EPs and albums",
      "Schedule your global release date",
      "No Musicdibs commission on streaming royalties",
      "Unified analytics across every platform",
    ],
    distCta: "Distribute my music",
    royaltiesBadgeTop: "No commission on your",
    royaltiesBadgeBottom: "Royalties",
    releaseTitle: "Global release",
    releaseStatus: "in progress",
    platformActive: "Active",
    promoEyebrow: "Promotion · TikTok & Instagram",
    promoTitle1: "Make your music",
    promoTitleAccent: "go viral",
    promoBadge: "Share your songs with 200k+ followers",
    promoDesc:
      "Create or enhance your songs, generate visual content with AI and promote your music through Musicdibs' official TikTok and Instagram channels.",
    promoBulletPublish: { pre: "Published on", mid: "(Instagram) and", post: "(TikTok)" },
    promoBullets: [
      "Creatives tailored to Reels and vertical format",
      "Relevant audiences to multiply your plays",
    ],
    promoCta: "Promote my music",
    altInstagram: "Promote your music on Instagram with 100k+ followers",
    altTiktok: "Promote your music on TikTok with 245k+ followers",
  },

  "pt-BR": {
    seoTitle: "Registro Musical · Proteja e distribua sua música",
    seoDesc:
      "Registre os direitos autorais das suas músicas, distribua em +220 plataformas globais e faça sua audiência crescer com a Musicdibs.",
    ldName: "Registro Musical e Distribuição com a Musicdibs",
    ldServiceType: "Registro de direitos autorais musicais e distribuição digital",
    ldDescription:
      "Registre os direitos autorais das suas músicas em blockchain e distribua em mais de 220 plataformas globais como Spotify, Apple Music, TikTok, Amazon Music e YouTube Music, sem comissões sobre os seus royalties de streaming.",
    navCta: "🚀 Teste grátis",
    navSecondary: "Entrar",
    heroBadge: "TUDO EM UM",
    heroTitle1: "Proteja e distribua sua música em nível",
    heroTitleAccent: "global",
    heroSubtitle:
      "Registre seus direitos autorais em minutos, lance em +220 plataformas e fique com a sua receita: a Musicdibs não cobra nenhuma comissão sobre os seus royalties de streaming. Mantenha sua liberdade como artista.",
    heroCta: "🚀 Registrar e distribuir minha música",
    heroExplore: "Prefere explorar primeiro?",
    heroExploreLink: "Criar uma conta grátis →",
    heroChips: ["Validade legal", "Blockchain", "+220 plataformas"],
    panelLabel: "musicdibs · painel",
    panelTrackLabel: "Seu novo single",
    panelTrackMeta: "3:42 · Eletrônica",
    timeline: [
      { label: "Registro", value: "Direitos autorais", meta: "Blockchain · Validade legal" },
      { label: "Distribuição", value: "+220 plataformas", meta: "Spotify · Apple · TikTok · YouTube" },
      { label: "Promoção", value: "+12,4 mil ouvintes", meta: "Crescimento +28% esta semana" },
    ],
    badgeOk: "OK",
    badgeActive: "Ativo",
    servicesEyebrow: "Serviços",
    servicesTitle1: "Tudo o que sua música precisa,",
    servicesTitleAccent: "em um só lugar",
    services: [
      {
        sub: "Registro Digital da Obra",
        title: "Proteja seus direitos autorais",
        desc: "De forma rápida, segura e juridicamente válida. Certificação blockchain em minutos.",
      },
      {
        sub: "Distribuição em +220 Plataformas",
        title: "Sua música no mundo todo",
        desc: "Spotify, Apple Music, TikTok, Amazon e muitas outras, em um único painel.",
      },
      {
        sub: "Promoção Musicdibs",
        title: "Alcance milhares de ouvintes",
        desc: "Crie músicas e ative-as nos canais oficiais da Musicdibs.",
      },
    ],
    distributeIn: "Distribuímos em",
    morePlatforms: "+ 215 outras",
    testimonialsEyebrow: "Avaliações · Artistas",
    testimonialsTitle1: "O que os",
    testimonialsTitleAccent: "artistas dizem de nós",
    testimonialsSubtitle:
      "Milhares de músicos confiam na Musicdibs para proteger suas obras. Ouça suas experiências.",
    regEyebrow: "Registro · Direitos autorais",
    regTitle1: "Sua obra,",
    regTitleAccent: "protegida para sempre",
    regDesc:
      "Geramos um certificado blockchain imutável com carimbo de tempo que comprova sua autoria com validade legal internacional. Sem burocracia, sem esperas, sem intermediários.",
    regBullets: [
      "Certificação em minutos com hash único e verificável",
      "Validade legal pela Convenção de Berna (181 países)",
      "Baixe seu certificado em PDF a qualquer momento",
      "Proteja letras, melodias, masters e demos",
    ],
    regCta: "Registrar minha obra",
    certTitle: "Certificado Blockchain",
    certVerified: "Verificado",
    certFields: [
      { k: "Obra", v: "Midnight Echoes" },
      { k: "Autor", v: "Você · 100%" },
      { k: "Data", v: "27/05/2026" },
      { k: "Rede", v: "Polygon" },
    ],
    certBerne: "Convenção de Berna · Validade em 181 países",
    distEyebrow: "Distribuição global",
    distTitle1: "Sua música em",
    distTitleAccent: "+220 plataformas",
    distDesc:
      "Lance suas músicas no Spotify, Apple Music, TikTok, YouTube Music, Amazon Music e mais, a partir de um único painel. A Musicdibs não cobra nenhuma comissão sobre os seus royalties de streaming.",
    distBullets: [
      "Upload ilimitado de singles, EPs e álbuns",
      "Agendamento da data de lançamento global",
      "Sem comissão da Musicdibs sobre royalties de streaming",
      "Estatísticas unificadas de todas as plataformas",
    ],
    distCta: "Distribuir minha música",
    royaltiesBadgeTop: "Sem comissão sobre seus",
    royaltiesBadgeBottom: "Royalties",
    releaseTitle: "Lançamento global",
    releaseStatus: "em andamento",
    platformActive: "Ativo",
    promoEyebrow: "Promoção · TikTok & Instagram",
    promoTitle1: "Faça sua música",
    promoTitleAccent: "viralizar",
    promoBadge: "Compartilhe suas músicas com +200 mil seguidores",
    promoDesc:
      "Crie ou melhore suas músicas, gere conteúdo visual com IA e promova sua música pelos canais oficiais da Musicdibs no TikTok e no Instagram.",
    promoBulletPublish: { pre: "Publicação em", mid: "(Instagram) e", post: "(TikTok)" },
    promoBullets: [
      "Criativos adaptados a Reels e formato vertical",
      "Audiências afins para multiplicar suas reproduções",
    ],
    promoCta: "Promover minha música",
    altInstagram: "Promoção da sua música no Instagram com +100 mil seguidores",
    altTiktok: "Promoção da sua música no TikTok com +245 mil seguidores",
  },
};
