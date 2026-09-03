import { useTranslation } from "react-i18next";

/** Copy for the public /ia-music-studio landing page (ES, EN, PT-BR). */
export type LandingStudioCopy = typeof COPY_ES;

const COPY_ES = {
  seo: {
    title: "Musicdibs IA Music Studio · Crea, masteriza y domina con IA",
    description:
      "Estudio musical con IA para crear canciones desde cero, masterizar, generar material promocional y diseñar artistas virtuales en minutos.",
    ogDescription: "Crea. Perfecciona. Domina con IA. El estudio musical definitivo.",
  },
  hero: {
    badge: "Nuevo · IA Music Studio",
    titleA: "Crea y Mejora tu música",
    titleB: "con IA",
    subtitle:
      "El estudio musical definitivo con Inteligencia Artificial. Crea y mejora tus canciones, masteriza de forma profesional, genera material promocional y diseña tus propios artistas virtuales en minutos.",
    ctaPrimary: "Probar IA Music Studio GRATIS",
    ctaSecondary: "Ver cómo funciona",
    stat1: "Canciones creadas",
    stat2: "Valoración artistas",
    stat3: "Propiedad legal",
  },
  generator: {
    title: "Generador de canciones",
    label: "Describe tu canción",
    prompt:
      "Un tema de Synthwave de los 80 con sintetizadores nostálgicos y un ritmo bailable a 120 BPM",
    play: "Reproducir",
    pause: "Pausar",
  },
  voice: {
    badge: "Voz a producción · IA",
    titleA: "Tú pones la voz.",
    titleB: "La IA crea el hit.",
    subtitle:
      "¿Cantas? Sube tu voz a capela y nuestra IA construye toda la producción a tu alrededor: afinación profesional, instrumentación, arreglos y mezcla profesional en minutos. Tú pones la semilla, el AI Music Studio hace la magia.",
    step1Title: "Sube tu voz",
    step1Desc: "Una toma rápida desde el móvil es suficiente.",
    step2Title: "La IA produce",
    step2Desc: "Genera instrumentación, arreglos y mezcla a medida.",
    step3Title: "Listo para publicar",
    step3Desc: "Exporta tu track terminado en minutos.",
    cta: "Crear mi canción",
    soundHint: "🔊 Activa el sonido y escucha la magia",
    unmute: "Activar sonido",
    mute: "Silenciar",
  },
  promo: {
    badge: "Material promocional con IA",
    titleA: "Crea todo el material visual de",
    titleB: "tu lanzamiento",
    titleC: ", en minutos.",
    subtitle:
      "Genera portadas, posts, flyers y vídeos cortos para promocionar tu música en redes. Todo desde Musicdibs.",
    divider: "Portadas y piezas para tu lanzamiento",
    cta: "Crear mi material promocional",
    ctaNote: "Portadas, posts, flyers y vídeos generados con IA en minutos.",
    coverBadge: "Portada",
  },
  howItWorks: {
    prev: "Anterior",
    next: "Siguiente",
    goToStep: "Ir al paso",
    steps: [
      {
        badge: "Paso 1 · Empieza",
        title: "🚀 Regístrate y entra en AI Music Studio",
        description:
          "Dentro del AI Music Studio encontrarás todas las funciones para crear y mejorar tu música.",
      },
      {
        badge: "Paso 2 · Crear",
        title: "Crea tu canción desde una idea o mejora tu voz",
        description:
          "Escribe la idea de tu canción o sube una grabación de tu voz. La IA se encarga del resto.",
        fromIdea: "Desde una idea",
        ideaExample: "\"Un tema synthwave con voz femenina y bajo potente a 120 BPM…\"",
        fromVoice: "Desde tu voz",
      },
      {
        badge: "Paso 3 · Masterizar",
        title: "Masterización profesional con un clic",
        description:
          "Sube tu mezcla y obtén un master con calidad de estudio listo para publicar.",
        mastered: "Masterizado",
        before: "Antes",
        after: "Después",
        eq: "EQ balanceado",
      },
      {
        badge: "Paso 4 · Material visual",
        title: "Genera todo el material promocional",
        description:
          "Portadas, posts, reels, flyers y vídeos creados automáticamente a partir de tu canción.",
      },
      {
        badge: "Paso 5 · Artistas virtuales",
        title: "Diseña tus propios artistas con IA",
        description:
          "Crea avatares de artistas únicos, personaliza su estilo y úsalos en tus campañas.",
        aiGenerated: "IA generado",
      },
    ],
  },
  closing: {
    partA: "Y cuando tu canción esté lista…",
    partB: "también puedes",
    partC: "registrar sus derechos de autor",
    partD: "y",
    partE: "distribuirla internacionalmente",
    partF: "con",
  },
};

const COPY_EN: LandingStudioCopy = {
  seo: {
    title: "Musicdibs AI Music Studio · Create, master and own it with AI",
    description:
      "AI music studio to create songs from scratch, master them, generate promo material and design virtual artists in minutes.",
    ogDescription: "Create. Perfect. Own it with AI. The ultimate music studio.",
  },
  hero: {
    badge: "New · AI Music Studio",
    titleA: "Create and improve your music",
    titleB: "with AI",
    subtitle:
      "The ultimate AI-powered music studio. Create and improve your songs, master them professionally, generate promo material and design your own virtual artists in minutes.",
    ctaPrimary: "Try AI Music Studio FREE",
    ctaSecondary: "See how it works",
    stat1: "Songs created",
    stat2: "Artist rating",
    stat3: "Legal ownership",
  },
  generator: {
    title: "Song generator",
    label: "Describe your song",
    prompt:
      "An 80s synthwave track with nostalgic synths and a danceable 120 BPM groove",
    play: "Play",
    pause: "Pause",
  },
  voice: {
    badge: "Voice to production · AI",
    titleA: "You bring the voice.",
    titleB: "AI creates the hit.",
    subtitle:
      "Do you sing? Upload your a cappella voice and our AI builds the whole production around it: professional tuning, instrumentation, arrangements and a professional mix in minutes. You plant the seed, AI Music Studio does the magic.",
    step1Title: "Upload your voice",
    step1Desc: "A quick take from your phone is enough.",
    step2Title: "AI produces it",
    step2Desc: "It generates tailored instrumentation, arrangements and mix.",
    step3Title: "Ready to release",
    step3Desc: "Export your finished track in minutes.",
    cta: "Create my song",
    soundHint: "🔊 Turn the sound on and hear the magic",
    unmute: "Turn sound on",
    mute: "Mute",
  },
  promo: {
    badge: "AI promo material",
    titleA: "Create all the visual material for",
    titleB: "your release",
    titleC: ", in minutes.",
    subtitle:
      "Generate covers, posts, flyers and short videos to promote your music on social media. All from Musicdibs.",
    divider: "Covers and assets for your release",
    cta: "Create my promo material",
    ctaNote: "Covers, posts, flyers and videos generated with AI in minutes.",
    coverBadge: "Cover",
  },
  howItWorks: {
    prev: "Previous",
    next: "Next",
    goToStep: "Go to step",
    steps: [
      {
        badge: "Step 1 · Start",
        title: "🚀 Sign up and enter AI Music Studio",
        description:
          "Inside AI Music Studio you'll find every feature to create and improve your music.",
      },
      {
        badge: "Step 2 · Create",
        title: "Create your song from an idea or improve your voice",
        description:
          "Write your song idea or upload a recording of your voice. AI takes care of the rest.",
        fromIdea: "From an idea",
        ideaExample: "\"A synthwave track with female vocals and a powerful bass at 120 BPM…\"",
        fromVoice: "From your voice",
      },
      {
        badge: "Step 3 · Master",
        title: "Professional mastering in one click",
        description:
          "Upload your mix and get a studio-quality master ready to release.",
        mastered: "Mastered",
        before: "Before",
        after: "After",
        eq: "Balanced EQ",
      },
      {
        badge: "Step 4 · Visual material",
        title: "Generate all your promo material",
        description:
          "Covers, posts, reels, flyers and videos created automatically from your song.",
      },
      {
        badge: "Step 5 · Virtual artists",
        title: "Design your own artists with AI",
        description:
          "Create unique artist avatars, customise their style and use them in your campaigns.",
        aiGenerated: "AI generated",
      },
    ],
  },
  closing: {
    partA: "And when your song is ready…",
    partB: "you can also",
    partC: "register its copyright",
    partD: "and",
    partE: "distribute it worldwide",
    partF: "with",
  },
};

const COPY_PT: LandingStudioCopy = {
  seo: {
    title: "Musicdibs AI Music Studio · Crie, masterize e domine com IA",
    description:
      "Estúdio musical com IA para criar músicas do zero, masterizar, gerar material promocional e criar artistas virtuais em minutos.",
    ogDescription: "Crie. Aperfeiçoe. Domine com IA. O estúdio musical definitivo.",
  },
  hero: {
    badge: "Novo · AI Music Studio",
    titleA: "Crie e melhore sua música",
    titleB: "com IA",
    subtitle:
      "O estúdio musical definitivo com Inteligência Artificial. Crie e melhore suas músicas, masterize de forma profissional, gere material promocional e crie seus próprios artistas virtuais em minutos.",
    ctaPrimary: "Testar o AI Music Studio GRÁTIS",
    ctaSecondary: "Ver como funciona",
    stat1: "Músicas criadas",
    stat2: "Avaliação dos artistas",
    stat3: "Propriedade legal",
  },
  generator: {
    title: "Gerador de músicas",
    label: "Descreva sua música",
    prompt:
      "Uma faixa synthwave dos anos 80 com sintetizadores nostálgicos e uma batida dançante a 120 BPM",
    play: "Reproduzir",
    pause: "Pausar",
  },
  voice: {
    badge: "Voz para produção · IA",
    titleA: "Você põe a voz.",
    titleB: "A IA cria o hit.",
    subtitle:
      "Você canta? Envie sua voz a cappella e nossa IA constrói toda a produção ao seu redor: afinação profissional, instrumentação, arranjos e mixagem profissional em minutos. Você planta a semente, o AI Music Studio faz a mágica.",
    step1Title: "Envie sua voz",
    step1Desc: "Uma gravação rápida pelo celular já é suficiente.",
    step2Title: "A IA produz",
    step2Desc: "Gera instrumentação, arranjos e mixagem sob medida.",
    step3Title: "Pronto para lançar",
    step3Desc: "Exporte sua faixa finalizada em minutos.",
    cta: "Criar minha música",
    soundHint: "🔊 Ative o som e ouça a mágica",
    unmute: "Ativar som",
    mute: "Silenciar",
  },
  promo: {
    badge: "Material promocional com IA",
    titleA: "Crie todo o material visual do",
    titleB: "seu lançamento",
    titleC: ", em minutos.",
    subtitle:
      "Gere capas, posts, flyers e vídeos curtos para divulgar sua música nas redes. Tudo pela Musicdibs.",
    divider: "Capas e peças para o seu lançamento",
    cta: "Criar meu material promocional",
    ctaNote: "Capas, posts, flyers e vídeos gerados com IA em minutos.",
    coverBadge: "Capa",
  },
  howItWorks: {
    prev: "Anterior",
    next: "Próximo",
    goToStep: "Ir para o passo",
    steps: [
      {
        badge: "Passo 1 · Comece",
        title: "🚀 Cadastre-se e entre no AI Music Studio",
        description:
          "Dentro do AI Music Studio você encontra todos os recursos para criar e melhorar sua música.",
      },
      {
        badge: "Passo 2 · Criar",
        title: "Crie sua música a partir de uma ideia ou melhore sua voz",
        description:
          "Escreva a ideia da sua música ou envie uma gravação da sua voz. A IA cuida do resto.",
        fromIdea: "A partir de uma ideia",
        ideaExample: "\"Uma faixa synthwave com voz feminina e baixo potente a 120 BPM…\"",
        fromVoice: "A partir da sua voz",
      },
      {
        badge: "Passo 3 · Masterizar",
        title: "Masterização profissional com um clique",
        description:
          "Envie sua mixagem e receba um master com qualidade de estúdio pronto para lançar.",
        mastered: "Masterizado",
        before: "Antes",
        after: "Depois",
        eq: "EQ balanceado",
      },
      {
        badge: "Passo 4 · Material visual",
        title: "Gere todo o material promocional",
        description:
          "Capas, posts, reels, flyers e vídeos criados automaticamente a partir da sua música.",
      },
      {
        badge: "Passo 5 · Artistas virtuais",
        title: "Crie seus próprios artistas com IA",
        description:
          "Crie avatares de artistas únicos, personalize o estilo e use-os nas suas campanhas.",
        aiGenerated: "Gerado por IA",
      },
    ],
  },
  closing: {
    partA: "E quando sua música estiver pronta…",
    partB: "você também pode",
    partC: "registrar os direitos autorais",
    partD: "e",
    partE: "distribuí-la internacionalmente",
    partF: "com",
  },
};

const DICT: Record<string, LandingStudioCopy> = {
  es: COPY_ES,
  en: COPY_EN,
  "pt-BR": COPY_PT,
};

export function useLandingStudioCopy(): LandingStudioCopy {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "es";
  if (DICT[lang]) return DICT[lang];
  if (lang.startsWith("pt")) return COPY_PT;
  if (lang.startsWith("en")) return COPY_EN;
  return COPY_ES;
}
