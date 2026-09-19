// Traducciones extendidas — AI Studio, Dashboard, Wizard, Legal, FAQ, Pages,
// PromoMaterial y contenido relacionado. Se cargan de forma diferida (dynamic
// import) en lugar de estar en el bundle principal, porque representan ~662KB
// de codigo fuente que NO son necesarios para la home publica ni el navbar/
// footer. Ver incidente de rendimiento 2026-09-19 (Core Web Vitals GSC).
//
// IMPORTANTE: la logica de merge de abajo es una copia exacta de la que
// existia antes en i18n.ts (mismo orden, mismos objetos, mismas condiciones).
// Solo cambia el nombre de la variable contenedora (resources -> extra, un
// objeto vacio con la misma forma) y que, en vez de mutar el objeto que se
// pasa a i18n.init(), el resultado final se aplica via addResourceBundle()
// una vez i18next ya esta inicializado. No se ha alterado ningun valor de
// traduccion ni el orden de las fusiones (merges).

import { legalTranslations } from './i18nLegal';
import { faqTranslations } from './i18nFaq';
import { marketingPageTranslations } from './i18nMarketingPage';
import { aiStudioTranslations } from './i18nAIStudio';
import { wizardTranslations } from './i18nWizard';
import { dashboardTranslations } from './i18nDashboard';
import { pagesTranslations } from './i18nPages';
import { promoMaterialTranslations } from './i18nPromoMaterial';

export function applyExtendedTranslations(i18nInstance: any) {
  // FIX: `extra` debe partir de una COPIA del resource base ya cargado en
  // i18next (no de un objeto vacio), porque el codigo original de merge
  // operaba sobre `resources[lang].translation`, que para entonces ya
  // contenia todo el contenido base (nav, dashboard.sidebar, privacy, etc).
  // Sin esto, el "safety fix" de privacy.dashboard y el deep-merge de
  // dashboard perderian el contenido base existente. Confirmado con test
  // de comparacion byte-a-byte contra la implementacion original.
  const langsToInit = ['es', 'en', 'pt-BR'] as const;
  const extra: Record<string, { translation: Record<string, any> }> = {
    es: { translation: {} },
    en: { translation: {} },
    'pt-BR': { translation: {} },
  };
  langsToInit.forEach((lang) => {
    const existing = i18nInstance.getResourceBundle?.(lang, 'translation');
    extra[lang].translation = existing ? JSON.parse(JSON.stringify(existing)) : {};
  });

const aiStudioRootTranslations: Record<string, { aiStudio: Record<string, any> }> = {
  es: {
    aiStudio: {
      backToDashboard: 'Volver al dashboard',
      poweredBy: 'Suite creativa impulsada por IA',
      pageTitle: 'AI Music Studio',
      pageSubtitle: 'Potencia tu proceso creativo',
      noCredits: 'Sin créditos',
      comingSoon: 'Próximamente',
      creditPerUse: 'crédito por uso',
      creditsPerUse: 'créditos por uso',
      buyCredits: 'Comprar créditos',
      startBtn: 'Abrir',
      previewBtn: 'Vista previa',
      legalTitle: 'Uso responsable y derechos',
      legalText: 'Asegúrate de tener derechos sobre el contenido que subas o generes antes de registrarlo, distribuirlo o publicarlo.',
      modules: {
        createMusic: { title: 'Crea canciones', desc: 'Genera canciones completas o bases instrumentales a partir de una descripción y/o una letra. Si no tienes letra, también te ayudamos.' },
        editModify: { title: 'Masterizado profesional', desc: 'Consigue un sonido optimizado y listo para Spotify: más volumen, claridad y potencia en segundos. Lleva tus canciones al siguiente nivel.' },
        inspire: { title: 'Improvisa y experimenta', desc: 'Crea con 1 solo click canciones aleatorias o temáticas' },
        createVideoclips: { title: 'Videoclips', desc: 'Genera vídeos musicales y fusiónalos con audio de tu historial.' },
        createCovers: { title: 'Material promocional', desc: 'Crea portadas, flyers, posts y todo lo que necesitas para promocionar tu música.' },
        singYourSong: { title: 'Herramientas de Voz', desc: 'Tu estudio vocal IA: clona tu voz, canta en 29 idiomas y mucho más' },
        virtualArtists: { title: 'Mis Artistas Virtuales', desc: 'Guarda la configuración de voz y estilo de tus artistas para crear canciones coherentes.' },
        enhance: { title: 'De maqueta a canción profesional', desc: 'Sube tu voz a capela, melodía, demo o instrumental: crea una producción profesional, añade voz IA a tu instrumental, o genera nuevas versiones.' },
      },
      features: {
        highQuality: { title: 'Alta calidad', desc: 'Resultados listos para iterar, presentar o publicar.' },
        fast: { title: 'Rápido', desc: 'Flujos optimizados para crear en pocos minutos.' },
        creative: { title: 'Creativo', desc: 'Explora ideas, estilos y combinaciones nuevas.' },
        easy: { title: 'Fácil', desc: 'Herramientas guiadas para avanzar sin fricción.' },
      },
      variationNotice: 'Cada generación puede variar. Ajusta tu prompt para mejorar el resultado.',
      knowledgeGuide: 'Guía de conocimiento IA',
      knowledge: {
        title: 'Cómo sacar el máximo a la IA',
        notExactTitle: 'La IA no es exacta',
        notExactDesc: 'Cada generación puede variar ligeramente en letra, estilo o voz.',
        iterateTitle: 'Itera para mejorar',
        iterateDesc: 'Prueba varias versiones y ajusta tu prompt para acercarte al resultado.',
        clearTitle: 'Cuanto más claro, mejor',
        clearDesc: 'Describe género, mood, tempo o referencias.',
        adjustTitle: 'Ajusta, no empieces de cero',
        adjustDesc: 'Pequeños cambios → mejores resultados.',
        importantTitle: 'Importante',
        importantDesc: 'Las variaciones en el resultado NO son errores, son parte del funcionamiento de la IA.',
        gotIt: 'Entendido',
        dontShowAgain: 'No volver a mostrar',
      },
    },
  },
  en: {
    aiStudio: {
      backToDashboard: 'Back to dashboard',
      poweredBy: 'AI-powered creative suite',
      pageTitle: 'AI Music Studio',
      pageSubtitle: 'Empower your creative process',
      noCredits: 'No credits',
      comingSoon: 'Coming soon',
      creditPerUse: 'credit per use',
      creditsPerUse: 'credits per use',
      buyCredits: 'Buy credits',
      startBtn: 'Open',
      previewBtn: 'Preview',
      legalTitle: 'Responsible use and rights',
      legalText: 'Make sure you own the rights to any content you upload or generate before registering, distributing or publishing it.',
      modules: {
        createMusic: { title: 'Create from scratch', desc: 'Generate songs or instrumentals from a text description.' },
        editModify: { title: 'Professional AI Mastering', desc: 'Get a Spotify-ready sound: more volume, clarity and power in seconds.' },
        inspire: { title: 'Give songs', desc: 'Want to surprise someone? Generate a song automatically and give it as a gift.' },
        createVideoclips: { title: 'Videoclips', desc: 'Generate music videos and merge them with audio from your history.' },
        createCovers: { title: 'Promotional Material', desc: 'Create covers, flyers, posts and everything you need to promote your music.' },
        singYourSong: { title: 'Voice Tools', desc: 'Your AI vocal studio: clone your voice, sing in 29 languages and much more' },
        virtualArtists: { title: 'My Virtual Artists', desc: 'Save your voice and style settings to create consistent songs with your artists.' },
        enhance: { title: 'From demo to professional song', desc: 'Upload your a cappella voice, melody, demo or instrumental: create a professional production, add AI vocals to your instrumental, or generate new versions.' },
      },
      features: {
        highQuality: { title: 'High quality', desc: 'Results ready to iterate, pitch or publish.' },
        fast: { title: 'Fast', desc: 'Optimized workflows to create in minutes.' },
        creative: { title: 'Creative', desc: 'Explore new ideas, styles and combinations.' },
        easy: { title: 'Easy', desc: 'Guided tools that keep the flow frictionless.' },
      },
      variationNotice: 'Each generation may vary. Tweak your prompt to improve the result.',
      knowledgeGuide: 'AI knowledge guide',
      knowledge: {
        title: 'How to get the most out of AI',
        notExactTitle: 'AI is not exact',
        notExactDesc: 'Each generation may vary slightly in lyrics, style or voice.',
        iterateTitle: 'Iterate to improve',
        iterateDesc: 'Try several versions and adjust your prompt to get closer to your goal.',
        clearTitle: 'The clearer, the better',
        clearDesc: 'Describe genre, mood, tempo or references.',
        adjustTitle: 'Adjust, don\'t start from scratch',
        adjustDesc: 'Small changes → better results.',
        importantTitle: 'Important',
        importantDesc: 'Variations in the output are NOT errors, they are part of how AI works.',
        gotIt: 'Got it',
        dontShowAgain: "Don't show again",
      },
    },
  },
  'pt-BR': {
    aiStudio: {
      backToDashboard: 'Voltar ao dashboard',
      poweredBy: 'Suite criativa impulsionada por IA',
      pageTitle: 'AI Music Studio',
      pageSubtitle: 'Potencialize seu processo criativo',
      noCredits: 'Sem créditos',
      comingSoon: 'Em breve',
      creditPerUse: 'crédito por uso',
      creditsPerUse: 'créditos por uso',
      buyCredits: 'Comprar créditos',
      startBtn: 'Abrir',
      previewBtn: 'Pré-visualizar',
      legalTitle: 'Uso responsável e direitos',
      legalText: 'Certifique-se de ter os direitos sobre qualquer conteúdo enviado ou gerado antes de registrá-lo, distribuí-lo ou publicá-lo.',
      modules: {
        createMusic: { title: 'Criar música', desc: 'Gere músicas ou instrumentais a partir de uma descrição.' },
        editModify: { title: 'Masterização profissional com IA', desc: 'Consiga um som pronto para o Spotify: mais volume, clareza e potência em segundos.' },
        inspire: { title: 'Presenteie canções', desc: 'Quer surpreender alguém? Gere uma música automaticamente e presenteie.' },
        createVideoclips: { title: 'Videoclipes', desc: 'Gere vídeos musicais e combine com áudio do seu histórico.' },
        createCovers: { title: 'Material promocional', desc: 'Crie capas, flyers, posts e tudo o que você precisa para promover sua música.' },
        singYourSong: { title: 'Ferramentas de Voz', desc: 'Seu estúdio vocal IA: clone sua voz, cante em 29 idiomas e muito mais' },
        virtualArtists: { title: 'Meus Artistas Virtuais', desc: 'Salve a configuração de voz e estilo dos seus artistas para criar músicas consistentes.' },
        enhance: { title: 'De demo a música profissional', desc: 'Envie sua voz a capela, melodia, demo ou instrumental: crie uma produção profissional, adicione voz IA ao seu instrumental, ou gere novas versões.' },
      },
      features: {
        highQuality: { title: 'Alta qualidade', desc: 'Resultados prontos para iterar, apresentar ou publicar.' },
        fast: { title: 'Rápido', desc: 'Fluxos otimizados para criar em poucos minutos.' },
        creative: { title: 'Criativo', desc: 'Explore novas ideias, estilos e combinações.' },
        easy: { title: 'Fácil', desc: 'Ferramentas guiadas para avançar sem atrito.' },
      },
      variationNotice: 'Cada geração pode variar. Ajuste seu prompt para melhorar o resultado.',
      knowledgeGuide: 'Guia de conhecimento IA',
      knowledge: {
        title: 'Como tirar o máximo da IA',
        notExactTitle: 'A IA não é exata',
        notExactDesc: 'Cada geração pode variar ligeiramente em letra, estilo ou voz.',
        iterateTitle: 'Itere para melhorar',
        iterateDesc: 'Teste várias versões e ajuste seu prompt para chegar mais perto do resultado.',
        clearTitle: 'Quanto mais claro, melhor',
        clearDesc: 'Descreva gênero, mood, tempo ou referências.',
        adjustTitle: 'Ajuste, não comece do zero',
        adjustDesc: 'Pequenas mudanças → melhores resultados.',
        importantTitle: 'Importante',
        importantDesc: 'As variações no resultado NÃO são erros, fazem parte do funcionamento da IA.',
        gotIt: 'Entendido',
        dontShowAgain: 'Não mostrar novamente',
      },
    },
  },
};

const dashboardWidgetTranslations: Record<string, { dashboard: Record<string, any> }> = {
  es: {
    dashboard: {
      certificate: {
        downloadSuccess: 'Certificado descargado correctamente',
        generateError: 'Error al generar el certificado',
        generating: 'Generando...',
        pdfLabel: 'Certificado PDF',
        fileTypeFallback: 'Audio',
        notAvailable: 'N/D',
      },
      distribute: {
        bannerButton: 'Distribuir ahora',
        distributed: 'Distribuido',
        distributedOn: 'Distribuido el {{date}}',
        button: 'Distribuir',
      },
      notifications: {
        title: 'Notificaciones',
        markAll: 'Leer todo',
        clear: 'Borrar todas',
        empty: 'Sin notificaciones',
        filterAll: 'Todas',
        filterUnread: 'Sin leer',
        soundOn: 'Activar sonido',
        soundOff: 'Silenciar',
        time: {
          now: 'ahora',
          minutes: 'hace {{count}}m',
          hours: 'hace {{count}}h',
          days: 'hace {{count}}d',
        },
        events: {
          workRegistered: {
            title: 'Registro completado',
            message: '"{{title}}" se ha registrado correctamente.',
          },
          workFailed: {
            title: 'Registro fallido',
            message: '"{{title}}" no se pudo registrar. Inténtalo de nuevo.',
          },
          creditsAdded: {
            title: 'Créditos añadidos',
            message: 'Se han añadido {{count}} créditos a tu cuenta.',
          },
          aiCompleted: {
            title: 'Generación IA lista',
            message: 'Tu creación con IA ya está disponible en la biblioteca.',
          },
          aiFailed: {
            title: 'Generación IA fallida',
            message: 'La generación no se pudo completar. Los créditos han sido reembolsados si procede.',
          },
        },
      },
      noCredits: {
        message: 'No tienes créditos suficientes para esta acción.',
        costMessage: 'No tienes créditos suficientes para {{action}}. Necesitas {{cost}} créditos.',
        thisAction: 'esta acción',
        buyCredits: 'Comprar créditos',
      },
    },
  },
  en: {
    dashboard: {
      certificate: {
        downloadSuccess: 'Certificate downloaded successfully',
        generateError: 'Error generating certificate',
        generating: 'Generating...',
        pdfLabel: 'PDF certificate',
        fileTypeFallback: 'Audio',
        notAvailable: 'N/A',
      },
      distribute: {
        bannerButton: 'Distribute now',
        distributed: 'Distributed',
        distributedOn: 'Distributed on {{date}}',
        button: 'Distribute',
      },
      notifications: {
        title: 'Notifications',
        markAll: 'Mark all read',
        clear: 'Clear all',
        empty: 'No notifications',
        filterAll: 'All',
        filterUnread: 'Unread',
        soundOn: 'Enable sound',
        soundOff: 'Mute',
        time: {
          now: 'now',
          minutes: '{{count}}m ago',
          hours: '{{count}}h ago',
          days: '{{count}}d ago',
        },
        events: {
          workRegistered: {
            title: 'Registration completed',
            message: '"{{title}}" was registered successfully.',
          },
          workFailed: {
            title: 'Registration failed',
            message: '"{{title}}" could not be registered. Please try again.',
          },
          creditsAdded: {
            title: 'Credits added',
            message: '{{count}} credits were added to your account.',
          },
          aiCompleted: {
            title: 'AI generation ready',
            message: 'Your AI creation is now available in your library.',
          },
          aiFailed: {
            title: 'AI generation failed',
            message: 'The generation could not be completed. Credits have been refunded if applicable.',
          },
        },
      },
      noCredits: {
        message: 'You do not have enough credits for this action.',
        costMessage: 'You do not have enough credits for {{action}}. You need {{cost}} credits.',
        thisAction: 'this action',
        buyCredits: 'Buy credits',
      },
    },
  },
  'pt-BR': {
    dashboard: {
      certificate: {
        downloadSuccess: 'Certificado baixado com sucesso',
        generateError: 'Erro ao gerar o certificado',
        generating: 'Gerando...',
        pdfLabel: 'Certificado PDF',
        fileTypeFallback: 'Áudio',
        notAvailable: 'N/D',
      },
      distribute: {
        bannerButton: 'Distribuir agora',
        distributed: 'Distribuído',
        distributedOn: 'Distribuído em {{date}}',
        button: 'Distribuir',
      },
      notifications: {
        title: 'Notificações',
        markAll: 'Ler tudo',
        clear: 'Limpar todas',
        empty: 'Sem notificações',
        filterAll: 'Todas',
        filterUnread: 'Não lidas',
        soundOn: 'Ativar som',
        soundOff: 'Silenciar',
        time: {
          now: 'agora',
          minutes: 'há {{count}}m',
          hours: 'há {{count}}h',
          days: 'há {{count}}d',
        },
        events: {
          workRegistered: {
            title: 'Registro concluído',
            message: '"{{title}}" foi registrado com sucesso.',
          },
          workFailed: {
            title: 'Registro falhou',
            message: '"{{title}}" não pôde ser registrado. Tente novamente.',
          },
          creditsAdded: {
            title: 'Créditos adicionados',
            message: '{{count}} créditos foram adicionados à sua conta.',
          },
          aiCompleted: {
            title: 'Geração de IA pronta',
            message: 'Sua criação de IA já está disponível na biblioteca.',
          },
          aiFailed: {
            title: 'Geração de IA falhou',
            message: 'A geração não pôde ser concluída. Os créditos foram reembolsados, se aplicável.',
          },
        },
      },
      noCredits: {
        message: 'Você não tem créditos suficientes para esta ação.',
        costMessage: 'Você não tem créditos suficientes para {{action}}. Você precisa de {{cost}} créditos.',
        thisAction: 'esta ação',
        buyCredits: 'Comprar créditos',
      },
    },
  },
};

// Merge legal, FAQ and AI Music Studio translations into resources
const langs = ['es', 'en', 'pt-BR'] as const;
langs.forEach((lang) => {
  const key = lang === 'pt-BR' ? 'pt-BR' : lang;
  if (extra[key] && legalTranslations[lang]) {
    Object.assign(extra[key].translation, legalTranslations[lang]);
  }
  if (extra[key] && faqTranslations[lang]) {
    Object.assign(extra[key].translation, faqTranslations[lang]);
  }
  if (extra[key] && marketingPageTranslations[lang]) {
    Object.assign(extra[key].translation, marketingPageTranslations[lang]);
  }
});


// Merge AI Music Studio subpage translations
const allLangs = ['es', 'en', 'pt-BR'] as const;
allLangs.forEach((lang) => {
  if (extra[lang] && aiStudioTranslations[lang]) {
    Object.assign(extra[lang].translation, aiStudioTranslations[lang]);
  }
  if (extra[lang] && wizardTranslations[lang]) {
    Object.assign(extra[lang].translation, wizardTranslations[lang]);
  }
  if (extra[lang] && promoMaterialTranslations[lang]) {
    Object.assign(extra[lang].translation, promoMaterialTranslations[lang]);
  }
});

allLangs.forEach((lang) => {
  const translation = extra[lang]?.translation as Record<string, any> | undefined;
  if (!translation) return;

  const aiStudioRoot = aiStudioRootTranslations[lang]?.aiStudio;
  if (aiStudioRoot) {
    translation.aiStudio = {
      ...(translation.aiStudio || {}),
      ...aiStudioRoot,
    };
  }

  const dashboardWidgets = dashboardWidgetTranslations[lang]?.dashboard;
  const dashboardFull = dashboardTranslations[lang]?.translation?.dashboard;

  // Deep-merge dashboard sub-keys so no section overwrites another
  const existingDashboard = (translation.dashboard || {}) as Record<string, any>;
  const allDashboardKeys = Array.from(new Set([
    ...Object.keys(existingDashboard),
    ...Object.keys(dashboardWidgets || {}),
    ...Object.keys(dashboardFull || {}),
  ]));
  const merged: Record<string, any> = {};
  for (const k of allDashboardKeys) {
    merged[k] = {
      ...(typeof existingDashboard[k] === 'object' ? existingDashboard[k] : {}),
      ...(dashboardWidgets && typeof dashboardWidgets[k] === 'object' ? dashboardWidgets[k] : {}),
      ...(dashboardFull && typeof (dashboardFull as any)[k] === 'object' ? (dashboardFull as any)[k] : {}),
    };
    // If any source had a non-object value, prefer the last one
    if (dashboardFull && typeof (dashboardFull as any)[k] !== 'undefined' && typeof (dashboardFull as any)[k] !== 'object') {
      merged[k] = (dashboardFull as any)[k];
    } else if (dashboardWidgets && typeof dashboardWidgets[k] !== 'undefined' && typeof dashboardWidgets[k] !== 'object') {
      merged[k] = dashboardWidgets[k];
    } else if (typeof existingDashboard[k] !== 'undefined' && typeof existingDashboard[k] !== 'object') {
      merged[k] = existingDashboard[k];
    }
  }
  translation.dashboard = merged;

  const pagesRoot = pagesTranslations[lang]?.translation;
  if (pagesRoot) {
    Object.assign(translation, pagesRoot);
  }
});

// ── Credit pricing popup translations ──
const creditPricingTranslations: Record<string, any> = {
  es: {
    creditPricing: {
      title: 'Precios por operación',
      viewPrices: 'Ver precios',
      credit: 'crédito',
      credits: 'créditos',
      free: 'Gratis',
      annualBadge: 'Anual',
      footer: 'Los créditos se descuentan solo tras una operación exitosa.',
      categories: {
        gratis: '🆓 Gratis',
        registro: '🛡️ Registro',
        distribucion: '🌍 Distribución',
        musica: '🎵 Creación musical',
        audio: '🎧 Audio y voz',
        visual: '🎨 Imagen y vídeo',
        promo: '📣 Promoción',
      },
      features: {
        register_work: 'Registrar (canción, portada, vídeo)',
        promote_work: 'Promoción estándar',
        promote_premium: 'Promoción premium RRSS',
        generate_audio: 'Canción instrumental',
        generate_audio_song: 'Canción (sin letra propia y <3min)',
        generate_audio_elevenlabs: 'Canción (letra propia o >3min)',
        one_click_create: 'Improvisa y experimenta',
        generate_lyrics: 'Crear letras',
        generate_press_release: 'Artistas Virtuales',
        improve_prompt: 'Mejorar descripción con IA',
        distribute_music: 'Distribución musical',
        edit_audio: 'Editar / crear variación',
        enhance_audio: 'Masterización de audio',
        generate_cover: 'Portada con IA',
        generate_video: 'Generar videoclip',
        instagram_creative: 'Creatividad para Instagram',
        youtube_thumbnail: 'Miniatura para YouTube',
        event_poster: 'Cartel de evento',
        social_poster: 'Cartel para redes',
        social_video: 'Vídeo para redes sociales',
        voice_translation_per_min: 'Traducción de voz (por min)',
      },
      descriptions: {
        generate_lyrics: 'Generación de letras con IA (gratuito)',
        generate_press_release: 'Generación de perfil de artista virtual',
        improve_prompt: 'Reescribe tu descripción con IA',
        distribute_music: 'Distribuir música a plataformas digitales (solo plan anual)',
        register_work: 'Registro de derechos de autor con validez mundial',
        generate_audio: 'Generación de audio instrumental con IA',
        generate_audio_song: 'Generación de canción con voz con IA',
        one_click_create: 'Crea con 1 solo click canciones aleatorias o temáticas',
        enhance_audio: 'Masterización profesional',
        generate_cover: 'Generación de portada con IA',
        instagram_creative: 'Generar imagen creativa para Instagram',
        youtube_thumbnail: 'Generar miniatura para YouTube',
        promote_premium: 'Promoción premium en nuestras RRSS',
        social_video: 'Generar vídeo corto para redes sociales',
      },
    },
  },
  en: {
    creditPricing: {
      title: 'Pricing per action',
      viewPrices: 'View pricing',
      credit: 'credit',
      credits: 'credits',
      free: 'Free',
      annualBadge: 'Annual',
      footer: 'Credits are only deducted after a successful operation.',
      categories: {
        gratis: '🆓 Free',
        registro: '🛡️ Registration',
        distribucion: '🌍 Distribution',
        musica: '🎵 Music creation',
        audio: '🎧 Audio & voice',
        visual: '🎨 Image & video',
        promo: '📣 Promotion',
      },
      features: {
        register_work: 'Register (song, cover, video)',
        promote_work: 'Standard promotion',
        promote_premium: 'Premium social promotion',
        generate_audio: 'Instrumental song',
        generate_audio_song: 'Song (no lyrics, <3min)',
        generate_audio_elevenlabs: 'Song (own lyrics or >3min)',
        one_click_create: 'Give songs',
        generate_lyrics: 'Create lyrics',
        generate_press_release: 'Virtual Artists',
        improve_prompt: 'Improve description with AI',
        distribute_music: 'Music distribution',
        edit_audio: 'Edit / create variation',
        enhance_audio: 'Audio mastering',
        generate_cover: 'AI cover art',
        generate_video: 'Generate music video',
        instagram_creative: 'Instagram creative',
        youtube_thumbnail: 'YouTube thumbnail',
        event_poster: 'Event poster',
        social_poster: 'Social media poster',
        social_video: 'Social media video',
        voice_translation_per_min: 'Voice translation (per min)',
      },
      descriptions: {
        generate_lyrics: 'AI lyrics generation (free)',
        generate_press_release: 'Virtual artist profile generation',
        improve_prompt: 'Rewrite your description with AI',
        distribute_music: 'Distribute music to digital platforms (annual plan only)',
        register_work: 'Worldwide copyright registration',
        generate_audio: 'AI instrumental audio generation',
        generate_audio_song: 'AI song generation with vocals',
        one_click_create: 'Want to surprise someone? Generate a song automatically and give it as a gift.',
        enhance_audio: 'Professional mastering',
        generate_cover: 'AI cover art generation',
        instagram_creative: 'Generate creative image for Instagram',
        youtube_thumbnail: 'Generate YouTube thumbnail',
        promote_premium: 'Premium promotion on our social media',
        social_video: 'Generate short video for social media',
      },
    },
  },
  'pt-BR': {
    creditPricing: {
      title: 'Preços por operação',
      viewPrices: 'Ver preços',
      credit: 'crédito',
      credits: 'créditos',
      free: 'Grátis',
      annualBadge: 'Anual',
      footer: 'Os créditos são descontados apenas após uma operação bem-sucedida.',
      categories: {
        gratis: '🆓 Grátis',
        registro: '🛡️ Registro',
        distribucion: '🌍 Distribuição',
        musica: '🎵 Criação musical',
        audio: '🎧 Áudio e voz',
        visual: '🎨 Imagem e vídeo',
        promo: '📣 Promoção',
      },
      features: {
        register_work: 'Registrar (música, capa, vídeo)',
        promote_work: 'Promoção padrão',
        promote_premium: 'Promoção premium nas redes',
        generate_audio: 'Música instrumental',
        generate_audio_song: 'Música (sem letra própria e <3min)',
        generate_audio_elevenlabs: 'Música (letra própria ou >3min)',
        one_click_create: 'Presenteie canções',
        generate_lyrics: 'Criar letras',
        generate_press_release: 'Artistas Virtuais',
        improve_prompt: 'Melhorar descrição com IA',
        distribute_music: 'Distribuição musical',
        edit_audio: 'Editar / criar variação',
        enhance_audio: 'Masterização de áudio',
        generate_cover: 'Capa com IA',
        generate_video: 'Gerar videoclipe',
        instagram_creative: 'Criativo para Instagram',
        youtube_thumbnail: 'Miniatura do YouTube',
        event_poster: 'Cartaz de evento',
        social_poster: 'Cartaz para redes',
        social_video: 'Vídeo para impulsionar canções',
        voice_translation_per_min: 'Tradução de voz (por min)',
      },
      descriptions: {
        generate_lyrics: 'Geração de letras com IA (gratuito)',
        generate_press_release: 'Geração de perfil de artista virtual',
        improve_prompt: 'Reescreve sua descrição com IA',
        distribute_music: 'Distribuir música para plataformas digitais (somente plano anual)',
        register_work: 'Registro de direitos autorais com validade mundial',
        generate_audio: 'Geração de áudio instrumental com IA',
        generate_audio_song: 'Geração de música com voz com IA',
        one_click_create: 'Quer surpreender alguém? Gere uma música automaticamente e presenteie.',
        enhance_audio: 'Masterização profissional',
        generate_cover: 'Geração de capa com IA',
        instagram_creative: 'Gerar imagem criativa para Instagram',
        youtube_thumbnail: 'Gerar miniatura para YouTube',
        promote_premium: 'Promoção premium em nossas redes',
        social_video: 'Gerar vídeo curto para redes sociais',
      },
    },
  },
};

allLangs.forEach((lang) => {
  const translation = extra[lang]?.translation as Record<string, any> | undefined;
  if (!translation) return;
  const cp = creditPricingTranslations[lang]?.creditPricing;
  if (cp) {
    translation.creditPricing = cp;
  }
});

// ── Voice Tools Tour translations ──
const voiceToolsTourTranslations: Record<string, any> = {
  es: {
    voiceToolsTour: {
      step1Title: 'Tu estudio vocal con IA 🎤',
      step1Content: 'Clona tu voz, canta en 29 idiomas y crea versiones vocales profesionales de cualquier letra.\n\nFuncionalidades:\n• Clonar tu voz en segundos\n• Generar pistas vocales con tu voz clonada\n• Cantar letras que tú escribas\n\nTe mostramos cómo funciona paso a paso.',
      step2Title: 'Clona tu voz',
      step2Content: 'Para usar tu propia voz, primero necesitas clonarla.\n\nRequisitos del audio:\n✓ Mínimo 30 segundos de grabación\n✓ Solo tu voz (sin música de fondo)\n✓ Habla clara y natural\n✓ MP3, WAV o M4A (máx. 25 MB)\n\nConsejo: Graba en un lugar silencioso y habla de forma natural, como si estuvieras contando una historia.',
      step3Title: 'Tus voces clonadas',
      step3Content: 'Una vez clonada tu voz, aparecerá en esta lista.\n\nPuedes:\n• Ver todas tus voces clonadas\n• Escuchar previews de cada voz\n• Eliminar voces que no uses\n• Seleccionar una voz para usar en "Cantar"\n\nLa clonación toma ~2-3 minutos. Se te notificará cuando esté lista.',
      step4Title: 'Genera pistas vocales',
      step4Content: 'Con tu voz clonada, puedes generar canciones completas:\n\n1️⃣ Selecciona una voz clonada\n2️⃣ Escribe o pega la letra\n3️⃣ Escoge género musical y mood\n4️⃣ Genera tu pista vocal\n\nLa IA cantará tu letra usando tu voz con calidad profesional.',
      step5Title: '¿No tienes letra? Genérala aquí',
      step5Content: 'No necesitas escribir la letra tú mismo.\n\nClick en "Generación gratis" para:\n• Describir el tema de la canción\n• Seleccionar género y mood\n• Generar letra completa con IA\n• Usar la letra generada directamente\n\nLa letra se carga automáticamente en el campo de texto.',
      step6Title: 'Personaliza el estilo musical',
      step6Content: 'Ajusta cómo suena tu canción:\n\n🎵 Tema central\nAmor, Desamor, Fiesta, Superación, etc.\n\n🎸 Género musical\nPop, Rock, Reggaeton, Hip-Hop, y más\n\n🎭 Mood / Tono\nAlegre, Melancólico, Épico, Enérgico, etc.\n\nEstos parámetros definen el estilo de la pista vocal generada.',
      finish: '¡Empezar!',
      rewatch: 'Ver tutorial',
    },
  },
  en: {
    voiceToolsTour: {
      step1Title: 'Your AI vocal studio 🎤',
      step1Content: 'Clone your voice, sing in 29 languages and create professional vocal versions of any lyrics.\n\nFeatures:\n• Clone your voice in seconds\n• Generate vocal tracks with your cloned voice\n• Sing lyrics you write\n\nLet us show you how it works step by step.',
      step2Title: 'Clone your voice',
      step2Content: 'To use your own voice, you need to clone it first.\n\nAudio requirements:\n✓ At least 30 seconds of recording\n✓ Your voice only (no background music)\n✓ Clear and natural speech\n✓ MP3, WAV or M4A (max. 25 MB)\n\nTip: Record in a quiet place and speak naturally, as if you were telling a story.',
      step3Title: 'Your cloned voices',
      step3Content: 'Once your voice is cloned, it will appear in this list.\n\nYou can:\n• View all your cloned voices\n• Listen to previews of each voice\n• Delete voices you don\'t use\n• Select a voice to use in "Sing"\n\nCloning takes ~2-3 minutes. You\'ll be notified when it\'s ready.',
      step4Title: 'Generate vocal tracks',
      step4Content: 'With your cloned voice, you can generate complete songs:\n\n1️⃣ Select a cloned voice\n2️⃣ Write or paste the lyrics\n3️⃣ Choose musical genre and mood\n4️⃣ Generate your vocal track\n\nThe AI will sing your lyrics using your voice with professional quality.',
      step5Title: 'No lyrics? Generate them here',
      step5Content: 'You don\'t need to write the lyrics yourself.\n\nClick "Free generation" to:\n• Describe the song theme\n• Select genre and mood\n• Generate complete lyrics with AI\n• Use the generated lyrics directly\n\nThe lyrics are automatically loaded into the text field.',
      step6Title: 'Customize the musical style',
      step6Content: 'Adjust how your song sounds:\n\n🎵 Central theme\nLove, Heartbreak, Party, Overcoming, etc.\n\n🎸 Musical genre\nPop, Rock, Reggaeton, Hip-Hop, and more\n\n🎭 Mood / Tone\nHappy, Melancholic, Epic, Energetic, etc.\n\nThese parameters define the style of the generated vocal track.',
      finish: 'Let\'s go!',
      rewatch: 'View tutorial',
    },
  },
  'pt-BR': {
    voiceToolsTour: {
      step1Title: 'Seu estúdio vocal com IA 🎤',
      step1Content: 'Clone sua voz, cante em 29 idiomas e crie versões vocais profissionais de qualquer letra.\n\nFuncionalidades:\n• Clonar sua voz em segundos\n• Gerar faixas vocais com sua voz clonada\n• Cantar letras que você escrever\n\nVamos mostrar como funciona passo a passo.',
      step2Title: 'Clone sua voz',
      step2Content: 'Para usar sua própria voz, primeiro você precisa cloná-la.\n\nRequisitos do áudio:\n✓ Mínimo 30 segundos de gravação\n✓ Apenas sua voz (sem música de fundo)\n✓ Fala clara e natural\n✓ MP3, WAV ou M4A (máx. 25 MB)\n\nDica: Grave em um lugar silencioso e fale naturalmente, como se estivesse contando uma história.',
      step3Title: 'Suas vozes clonadas',
      step3Content: 'Uma vez clonada sua voz, ela aparecerá nesta lista.\n\nVocê pode:\n• Ver todas as suas vozes clonadas\n• Ouvir previews de cada voz\n• Excluir vozes que não usa\n• Selecionar uma voz para usar em "Cantar"\n\nA clonagem leva ~2-3 minutos. Você será notificado quando estiver pronta.',
      step4Title: 'Gere faixas vocais',
      step4Content: 'Com sua voz clonada, você pode gerar músicas completas:\n\n1️⃣ Selecione uma voz clonada\n2️⃣ Escreva ou cole a letra\n3️⃣ Escolha gênero musical e mood\n4️⃣ Gere sua faixa vocal\n\nA IA cantará sua letra usando sua voz com qualidade profissional.',
      step5Title: 'Sem letra? Gere aqui',
      step5Content: 'Você não precisa escrever a letra.\n\nClique em "Geração grátis" para:\n• Descrever o tema da música\n• Selecionar gênero e mood\n• Gerar letra completa com IA\n• Usar a letra gerada diretamente\n\nA letra é carregada automaticamente no campo de texto.',
      step6Title: 'Personalize o estilo musical',
      step6Content: 'Ajuste como sua música soa:\n\n🎵 Tema central\nAmor, Desamor, Festa, Superação, etc.\n\n🎸 Gênero musical\nPop, Rock, Reggaeton, Hip-Hop e mais\n\n🎭 Mood / Tom\nAlegre, Melancólico, Épico, Enérgico, etc.\n\nEstes parâmetros definem o estilo da faixa vocal gerada.',
      finish: 'Vamos lá!',
      rewatch: 'Ver tutorial',
    },
  },
};

// ── Promo Material Tour translations ──
const promoMaterialTourTranslations: Record<string, any> = {
  es: {
    promoMaterialTour: {
      step1Title: 'Crea contenido visual profesional 🎨',
      step1Content: 'Genera portadas, creatividades, videos y carteles para promocionar tu música con IA.\n\nHerramientas disponibles:\n• Portadas para Spotify/Apple Music\n• Creatividades para Instagram y YouTube\n• Videos para redes sociales\n• Carteles para eventos y conciertos\n\nTodo el contenido se genera en segundos con calidad profesional.',
      step2Title: 'Portadas para tus obras',
      step2Content: 'Genera portadas profesionales optimizadas para:\n✓ Spotify\n✓ YouTube Music\n✓ Apple Music\n✓ Amazon Music\n\n4 modos de creación:\n• Sin imagen (IA genera todo)\n• Solo foto del artista\n• Portada de referencia\n• Fotomontaje (combina foto + inspiración)\n\nCoste: 2 créditos por portada',
      step3Title: 'Creatividades para Instagram y YouTube',
      step3Content: 'Genera contenido optimizado para cada plataforma:\n\n📱 Instagram\n• Feed Post (1:1) → imagen + copy + hashtags\n• Story (9:16) → imagen + copy + hashtags\n\n🎬 YouTube\n• Miniatura (16:9) → imagen llamativa con texto\n\nLa IA genera tanto la imagen como el texto de acompañamiento automáticamente.\n\nCoste: 1 crédito por creatividad',
      step4Title: 'Diferencia entre formatos Instagram',
      step4Content: '📸 Feed Post (cuadrado 1:1)\nPara el feed principal de Instagram\nIdeal para: anuncios de singles, portadas, fotos artísticas\n\n📱 Story (vertical 9:16)\nPara historias de Instagram\nIdeal para: teasers, behind the scenes, anuncios temporales\n\nAmbos incluyen:\n✓ Imagen optimizada\n✓ Copy personalizado\n✓ Hashtags relevantes',
      step5Title: 'Videos promocionales',
      step5Content: 'Genera videos cortos (3-5 segundos) optimizados para:\n• TikTok\n• Instagram Reels\n• YouTube Shorts\n\nDos formas de crear:\n1️⃣ Texto → Video (describe el concepto)\n2️⃣ Imagen → Video (anima una portada o foto)\n\nPerfecto para promocionar lanzamientos de forma dinámica.\n\nCoste: 10 créditos por video',
      step6Title: 'Carteles y posters',
      step6Content: 'Crea carteles profesionales para:\n\n🎪 Eventos y conciertos\n• Flyer (A5) → tamaño bolsillo\n• Poster (A4) → tamaño estándar\n• Poster grande (A3) → impacto visual\n\n🌐 Redes sociales\n• Facebook Event Cover (1920x1080)\n• Twitter/X Header (1500x500)\n\nIncluye: fecha, lugar, hora, logo y foto del artista.\n\nCoste: 1 crédito por cartel',
      step7Title: 'Sube archivos fácilmente',
      step7Content: 'En todas las secciones puedes subir archivos de dos formas:\n\n🖱️ Click para seleccionar\nHaz click en la zona de upload y selecciona el archivo\n\n📂 Arrastra y suelta\nArrastra la imagen/foto directamente desde tu ordenador\n\nFormatos aceptados:\n• Imágenes: JPG, PNG, WEBP (máx. 10MB)\n• Audio: MP3, WAV (solo para videos)',
      step8Title: 'Descarga y usa tu contenido',
      step8Content: 'Una vez generado el contenido:\n\n✓ Preview en pantalla\n✓ Botón de descarga directo\n✓ Copia automática de textos (copy/hashtags)\n✓ Archivos optimizados para cada plataforma\n\nTodo el contenido se guarda en tu cuenta y puedes descargarlo cuando quieras.\n\n💡 Consejo: Genera múltiples versiones para A/B testing en redes sociales.',
      finish: '¡Empezar!',
      rewatch: 'Ver tutorial',
    },
  },
  en: {
    promoMaterialTour: {
      step1Title: 'Create professional visual content 🎨',
      step1Content: 'Generate covers, creatives, videos and posters to promote your music with AI.\n\nAvailable tools:\n• Covers for Spotify/Apple Music\n• Creatives for Instagram and YouTube\n• Videos for social media\n• Posters for events and concerts\n\nAll content is generated in seconds with professional quality.',
      step2Title: 'Covers for your works',
      step2Content: 'Generate professional covers optimized for:\n✓ Spotify\n✓ YouTube Music\n✓ Apple Music\n✓ Amazon Music\n\n4 creation modes:\n• No image (AI generates everything)\n• Artist photo only\n• Reference cover\n• Photomontage (combines photo + inspiration)\n\nCost: 2 credits per cover',
      step3Title: 'Creatives for Instagram and YouTube',
      step3Content: 'Generate content optimized for each platform:\n\n📱 Instagram\n• Feed Post (1:1) → image + copy + hashtags\n• Story (9:16) → image + copy + hashtags\n\n🎬 YouTube\n• Thumbnail (16:9) → eye-catching image with text\n\nAI generates both the image and accompanying text automatically.\n\nCost: 1 credit per creative',
      step4Title: 'Instagram format differences',
      step4Content: '📸 Feed Post (square 1:1)\nFor Instagram\'s main feed\nIdeal for: single announcements, covers, artistic photos\n\n📱 Story (vertical 9:16)\nFor Instagram stories\nIdeal for: teasers, behind the scenes, temporary announcements\n\nBoth include:\n✓ Optimized image\n✓ Custom copy\n✓ Relevant hashtags',
      step5Title: 'Promotional videos',
      step5Content: 'Generate short videos (3-5 seconds) optimized for:\n• TikTok\n• Instagram Reels\n• YouTube Shorts\n\nTwo ways to create:\n1️⃣ Text → Video (describe the concept)\n2️⃣ Image → Video (animate a cover or photo)\n\nPerfect for promoting releases dynamically.\n\nCost: 10 credits per video',
      step6Title: 'Posters and flyers',
      step6Content: 'Create professional posters for:\n\n🎪 Events and concerts\n• Flyer (A5) → pocket size\n• Poster (A4) → standard size\n• Large Poster (A3) → visual impact\n\n🌐 Social media\n• Facebook Event Cover (1920x1080)\n• Twitter/X Header (1500x500)\n\nIncludes: date, venue, time, logo and artist photo.\n\nCost: 1 credit per poster',
      step7Title: 'Upload files easily',
      step7Content: 'In all sections you can upload files in two ways:\n\n🖱️ Click to select\nClick on the upload area and select the file\n\n📂 Drag and drop\nDrag the image/photo directly from your computer\n\nAccepted formats:\n• Images: JPG, PNG, WEBP (max. 10MB)\n• Audio: MP3, WAV (videos only)',
      step8Title: 'Download and use your content',
      step8Content: 'Once content is generated:\n\n✓ On-screen preview\n✓ Direct download button\n✓ Auto-copy text (copy/hashtags)\n✓ Files optimized for each platform\n\nAll content is saved in your account and can be downloaded anytime.\n\n💡 Tip: Generate multiple versions for A/B testing on social media.',
      finish: 'Get started!',
      rewatch: 'View tutorial',
    },
  },
  'pt-BR': {
    promoMaterialTour: {
      step1Title: 'Crie conteúdo visual profissional 🎨',
      step1Content: 'Gere capas, criativos, vídeos e cartazes para promover sua música com IA.\n\nFerramentas disponíveis:\n• Capas para Spotify/Apple Music\n• Criativos para Instagram e YouTube\n• Vídeos para redes sociais\n• Cartazes para eventos e shows\n\nTodo o conteúdo é gerado em segundos com qualidade profissional.',
      step2Title: 'Capas para suas obras',
      step2Content: 'Gere capas profissionais otimizadas para:\n✓ Spotify\n✓ YouTube Music\n✓ Apple Music\n✓ Amazon Music\n\n4 modos de criação:\n• Sem imagem (IA gera tudo)\n• Apenas foto do artista\n• Capa de referência\n• Fotomontagem (combina foto + inspiração)\n\nCusto: 2 créditos por capa',
      step3Title: 'Criativos para Instagram e YouTube',
      step3Content: 'Gere conteúdo otimizado para cada plataforma:\n\n📱 Instagram\n• Feed Post (1:1) → imagem + copy + hashtags\n• Story (9:16) → imagem + copy + hashtags\n\n🎬 YouTube\n• Miniatura (16:9) → imagem chamativa com texto\n\nA IA gera tanto a imagem quanto o texto de acompanhamento automaticamente.\n\nCusto: 1 crédito por criativo',
      step4Title: 'Diferença entre formatos Instagram',
      step4Content: '📸 Feed Post (quadrado 1:1)\nPara o feed principal do Instagram\nIdeal para: anúncios de singles, capas, fotos artísticas\n\n📱 Story (vertical 9:16)\nPara stories do Instagram\nIdeal para: teasers, bastidores, anúncios temporários\n\nAmbos incluem:\n✓ Imagem otimizada\n✓ Copy personalizado\n✓ Hashtags relevantes',
      step5Title: 'Vídeos promocionais',
      step5Content: 'Gere vídeos curtos (3-5 segundos) otimizados para:\n• TikTok\n• Instagram Reels\n• YouTube Shorts\n\nDuas formas de criar:\n1️⃣ Texto → Vídeo (descreva o conceito)\n2️⃣ Imagem → Vídeo (anime uma capa ou foto)\n\nPerfeito para promover lançamentos de forma dinâmica.\n\nCusto: 10 créditos por vídeo',
      step6Title: 'Cartazes e posters',
      step6Content: 'Crie cartazes profissionais para:\n\n🎪 Eventos e shows\n• Flyer (A5) → tamanho bolso\n• Poster (A4) → tamanho padrão\n• Poster grande (A3) → impacto visual\n\n🌐 Redes sociais\n• Facebook Event Cover (1920x1080)\n• Twitter/X Header (1500x500)\n\nInclui: data, local, horário, logo e foto do artista.\n\nCusto: 1 crédito por cartaz',
      step7Title: 'Envie arquivos facilmente',
      step7Content: 'Em todas as seções você pode enviar arquivos de duas formas:\n\n🖱️ Clique para selecionar\nClique na área de upload e selecione o arquivo\n\n📂 Arraste e solte\nArraste a imagem/foto diretamente do seu computador\n\nFormatos aceitos:\n• Imagens: JPG, PNG, WEBP (máx. 10MB)\n• Áudio: MP3, WAV (apenas para vídeos)',
      step8Title: 'Baixe e use seu conteúdo',
      step8Content: 'Depois que o conteúdo for gerado:\n\n✓ Preview na tela\n✓ Botão de download direto\n✓ Cópia automática de textos (copy/hashtags)\n✓ Arquivos otimizados para cada plataforma\n\nTodo o conteúdo é salvo na sua conta e pode ser baixado quando quiser.\n\n💡 Dica: Gere múltiplas versões para testes A/B nas redes sociais.',
      finish: 'Vamos lá!',
      rewatch: 'Ver tutorial',
    },
  },
};

allLangs.forEach((lang) => {
  const translation = extra[lang]?.translation as Record<string, any> | undefined;
  if (!translation) return;
  const vtt = voiceToolsTourTranslations[lang]?.voiceToolsTour;
  if (vtt) {
    translation.voiceToolsTour = vtt;
  }
  const pmt = promoMaterialTourTranslations[lang]?.promoMaterialTour;
  if (pmt) {
    translation.promoMaterialTour = pmt;
  }
});

// Safety fix: in some locales aiStudio was accidentally nested under privacy
allLangs.forEach((lang) => {
  const translation = extra[lang]?.translation as Record<string, any> | undefined;
  if (!translation) return;

  const misplacedAiStudio = translation?.privacy?.aiStudio;
  if (misplacedAiStudio && !translation.aiStudio) {
    translation.aiStudio = misplacedAiStudio;
    delete translation.privacy.aiStudio;
  }

  const misplacedDashboard = translation?.privacy?.dashboard;
  if (misplacedDashboard) {
    const existingDashboard = (translation.dashboard || {}) as Record<string, unknown>;
    const fixedDashboard: Record<string, unknown> = { ...existingDashboard };

    Object.entries(misplacedDashboard as Record<string, unknown>).forEach(([key, value]) => {
      fixedDashboard[key] = {
        ...(typeof existingDashboard[key] === 'object' ? existingDashboard[key] : {}),
        ...(typeof value === 'object' ? value : {}),
      };
    });

    translation.dashboard = fixedDashboard;
    delete translation.privacy.dashboard;
  }
});

  const allLangsFinal = ['es', 'en', 'pt-BR'] as const;
  allLangsFinal.forEach((lang) => {
    // deep=false: `extra[lang].translation` ya es el resultado final completo
    // (copia del base + todo lo fusionado encima), así que se reemplaza
    // directamente en vez de volver a fusionar sobre sí mismo.
    i18nInstance.addResourceBundle(lang, 'translation', extra[lang].translation, false, true);
  });
}
