import { useTranslation } from "react-i18next";

/** Copy for the public /tools/metadata-finder page (ES, EN, PT-BR). */
export type MetadataFinderCopy = typeof COPY_ES;

const COPY_ES = {
  seo: {
    title: "Buscador de ISRC y UPC gratis · Musicdibs",
    description:
      "Encuentra el código ISRC de una grabación o el UPC/EAN de un álbum en segundos. Herramienta gratuita para artistas, productores y managers que distribuyen música.",
  },
  jsonLd: {
    appName: "Buscador de ISRC y UPC",
    appDescription:
      "Herramienta gratuita para encontrar códigos ISRC (grabaciones) y UPC/EAN (releases) de cualquier canción o álbum usando la base de datos MusicBrainz.",
    faq: [
      {
        question: "¿Qué es un código ISRC?",
        answer:
          "El ISRC (International Standard Recording Code) es un identificador único de 12 caracteres que identifica una grabación sonora concreta. Es lo que usan Spotify, Apple Music y las sociedades de gestión para reportar streams y royalties a la grabación correcta.",
      },
      {
        question: "¿Qué es un código UPC o EAN?",
        answer:
          "El UPC (Universal Product Code) o EAN (European Article Number) es el código de barras que identifica un álbum o single como producto comercial. Cada release publicado en tiendas y plataformas de streaming tiene su propio UPC.",
      },
      {
        question: "¿Por qué necesito conocer el ISRC y el UPC?",
        answer:
          "Los necesitas para reclamar royalties, distribuir tu música manteniendo el histórico de streams, migrar de distribuidor sin perder oyentes, registrar tu obra correctamente y solicitar takedowns o correcciones en plataformas.",
      },
    ],
  },
  header: {
    title: "Buscador de códigos ISRC y UPC",
    subtitle:
      "Consulta el ISRC de una canción o el UPC/EAN de un álbum de forma gratuita. Basado en la base de datos abierta MusicBrainz, sin registros ni límites.",
  },
  tabs: {
    isrc: "ISRC (canción)",
    upc: "UPC / EAN (álbum)",
  },
  search: {
    placeholderIsrc: "Ej: Blinding Lights The Weeknd",
    placeholderUpc: "Ej: After Hours The Weeknd",
    ariaLabel: "Buscar canción o álbum",
    button: "Buscar",
  },
  copy: {
    copied: "Copiado al portapapeles",
    ariaLabel: (value: string) => `Copiar ${value}`,
  },
  errors: {
    searchFailed: "No se pudo consultar MusicBrainz. Inténtalo de nuevo.",
  },
  isrcTab: {
    hintIdle: "Escribe el título de la canción y, si es posible, el nombre del artista.",
    noResults: "Sin resultados. Prueba con menos palabras o revisa la ortografía.",
    noIsrc: "Sin ISRC registrado en MusicBrainz.",
  },
  upcTab: {
    hintIdle: "Escribe el título del álbum o single y el nombre del artista.",
    noResults: "Sin resultados. Prueba con menos palabras o revisa la ortografía.",
    noUpc: "Sin UPC/EAN registrado en MusicBrainz.",
  },
  disclaimer:
    "Datos obtenidos en tiempo real de MusicBrainz, la base de datos musical abierta. Si una grabación o release no aparece o no tiene código, es porque no ha sido indexado allí — el distribuidor original lo tiene registrado igualmente.",
  faqSection: {
    isrcTitle: "¿Qué es un código ISRC?",
    isrcBodyPre:
      "El ",
    isrcBodyStrong: "ISRC",
    isrcBodyPost:
      " (International Standard Recording Code) es un identificador único de 12 caracteres asignado a una grabación sonora concreta. Es la forma en la que Spotify, Apple Music, YouTube Music, sociedades de gestión y bases de datos reconocen la misma grabación aunque se publique en varios álbumes o distribuidores. Cada versión (single, remix, en directo) lleva su propio ISRC.",
    upcTitle: "¿Qué es un código UPC / EAN?",
    upcBodyPre: "El ",
    upcBodyStrongUpc: "UPC",
    upcBodyMid: " (Universal Product Code) o ",
    upcBodyStrongEan: "EAN",
    upcBodyPost:
      " (European Article Number) es el código de barras que identifica un release (álbum, EP o single) como producto comercial. Distribuidores digitales, tiendas y plataformas de streaming lo usan para enlazar todas las pistas del release y reportar ventas y streams al lanzamiento correcto.",
    whyTitle: "¿Por qué necesitas conocerlos?",
    whyItems: [
      "Reclamar royalties a sociedades de gestión y a las DSPs.",
      "Migrar de distribuidor sin perder streams ni oyentes mensuales.",
      "Registrar tu obra correctamente en blockchain y en el Registro de la Propiedad Intelectual.",
      "Solicitar takedowns, correcciones de metadatos o merges en Spotify/Apple.",
      "Sincronizar tu catálogo con Content ID de YouTube.",
    ],
    howTitle: "¿Cómo se obtiene un ISRC / UPC nuevo?",
    howBody:
      "Cuando distribuyes música con Musicdibs, generamos automáticamente el ISRC de cada grabación y el UPC de cada release, sin coste añadido y con royalties del 100% para el artista. También puedes reutilizar tus códigos actuales si vienes de otro distribuidor, para no perder tu histórico de streams.",
    ctaDistribute: "Distribuir mi música",
    ctaMigrate: "Cómo migrar sin perder streams",
  },
};

const COPY_EN: MetadataFinderCopy = {
  seo: {
    title: "Free ISRC and UPC finder · Musicdibs",
    description:
      "Find the ISRC code of a recording or the UPC/EAN of an album in seconds. Free tool for artists, producers and managers who distribute music.",
  },
  jsonLd: {
    appName: "ISRC and UPC finder",
    appDescription:
      "Free tool to find ISRC codes (recordings) and UPC/EAN codes (releases) for any song or album using the MusicBrainz database.",
    faq: [
      {
        question: "What is an ISRC code?",
        answer:
          "The ISRC (International Standard Recording Code) is a unique 12-character identifier for a specific sound recording. Spotify, Apple Music and collecting societies use it to report streams and royalties to the correct recording.",
      },
      {
        question: "What is a UPC or EAN code?",
        answer:
          "The UPC (Universal Product Code) or EAN (European Article Number) is the barcode that identifies an album or single as a commercial product. Every release published on stores and streaming platforms has its own UPC.",
      },
      {
        question: "Why do I need to know the ISRC and the UPC?",
        answer:
          "You need them to claim royalties, distribute your music while keeping your streaming history, switch distributors without losing listeners, register your work correctly and request takedowns or corrections on platforms.",
      },
    ],
  },
  header: {
    title: "ISRC and UPC code finder",
    subtitle:
      "Look up the ISRC of a song or the UPC/EAN of an album for free. Powered by the open MusicBrainz database, with no sign-up and no limits.",
  },
  tabs: {
    isrc: "ISRC (song)",
    upc: "UPC / EAN (album)",
  },
  search: {
    placeholderIsrc: "e.g. Blinding Lights The Weeknd",
    placeholderUpc: "e.g. After Hours The Weeknd",
    ariaLabel: "Search song or album",
    button: "Search",
  },
  copy: {
    copied: "Copied to clipboard",
    ariaLabel: (value: string) => `Copy ${value}`,
  },
  errors: {
    searchFailed: "Couldn't query MusicBrainz. Please try again.",
  },
  isrcTab: {
    hintIdle: "Type the song title and, if possible, the artist's name.",
    noResults: "No results. Try fewer words or check the spelling.",
    noIsrc: "No ISRC registered on MusicBrainz.",
  },
  upcTab: {
    hintIdle: "Type the album or single title and the artist's name.",
    noResults: "No results. Try fewer words or check the spelling.",
    noUpc: "No UPC/EAN registered on MusicBrainz.",
  },
  disclaimer:
    "Data fetched live from MusicBrainz, the open music database. If a recording or release doesn't appear or has no code, it simply hasn't been indexed there — the original distributor still has it registered.",
  faqSection: {
    isrcTitle: "What is an ISRC code?",
    isrcBodyPre: "The ",
    isrcBodyStrong: "ISRC",
    isrcBodyPost:
      " (International Standard Recording Code) is a unique 12-character identifier assigned to a specific sound recording. It's how Spotify, Apple Music, YouTube Music, collecting societies and databases recognise the same recording even when it's released across several albums or distributors. Every version (single, remix, live) has its own ISRC.",
    upcTitle: "What is a UPC / EAN code?",
    upcBodyPre: "The ",
    upcBodyStrongUpc: "UPC",
    upcBodyMid: " (Universal Product Code) or ",
    upcBodyStrongEan: "EAN",
    upcBodyPost:
      " (European Article Number) is the barcode that identifies a release (album, EP or single) as a commercial product. Digital distributors, stores and streaming platforms use it to link all the tracks of a release and report sales and streams to the right release.",
    whyTitle: "Why do you need to know them?",
    whyItems: [
      "Claim royalties from collecting societies and DSPs.",
      "Switch distributors without losing streams or monthly listeners.",
      "Register your work correctly on blockchain and with the Intellectual Property Registry.",
      "Request takedowns, metadata corrections or merges on Spotify/Apple.",
      "Sync your catalogue with YouTube Content ID.",
    ],
    howTitle: "How do you get a new ISRC / UPC?",
    howBody:
      "When you distribute music with Musicdibs, we automatically generate the ISRC for every recording and the UPC for every release, at no extra cost and with 100% royalties for the artist. You can also reuse your existing codes if you're coming from another distributor, so you don't lose your streaming history.",
    ctaDistribute: "Distribute my music",
    ctaMigrate: "How to switch without losing streams",
  },
};

const COPY_PT: MetadataFinderCopy = {
  seo: {
    title: "Buscador de ISRC e UPC grátis · Musicdibs",
    description:
      "Encontre o código ISRC de uma gravação ou o UPC/EAN de um álbum em segundos. Ferramenta gratuita para artistas, produtores e managers que distribuem música.",
  },
  jsonLd: {
    appName: "Buscador de ISRC e UPC",
    appDescription:
      "Ferramenta gratuita para encontrar códigos ISRC (gravações) e UPC/EAN (releases) de qualquer música ou álbum usando o banco de dados MusicBrainz.",
    faq: [
      {
        question: "O que é um código ISRC?",
        answer:
          "O ISRC (International Standard Recording Code) é um identificador único de 12 caracteres que identifica uma gravação sonora específica. É o que Spotify, Apple Music e as sociedades de gestão usam para reportar streams e royalties à gravação correta.",
      },
      {
        question: "O que é um código UPC ou EAN?",
        answer:
          "O UPC (Universal Product Code) ou EAN (European Article Number) é o código de barras que identifica um álbum ou single como produto comercial. Cada release publicado em lojas e plataformas de streaming tem seu próprio UPC.",
      },
      {
        question: "Por que preciso conhecer o ISRC e o UPC?",
        answer:
          "Você precisa deles para reivindicar royalties, distribuir sua música mantendo o histórico de streams, migrar de distribuidora sem perder ouvintes, registrar sua obra corretamente e solicitar remoções ou correções nas plataformas.",
      },
    ],
  },
  header: {
    title: "Buscador de códigos ISRC e UPC",
    subtitle:
      "Consulte o ISRC de uma música ou o UPC/EAN de um álbum de forma gratuita. Baseado no banco de dados aberto MusicBrainz, sem cadastro nem limites.",
  },
  tabs: {
    isrc: "ISRC (música)",
    upc: "UPC / EAN (álbum)",
  },
  search: {
    placeholderIsrc: "Ex: Blinding Lights The Weeknd",
    placeholderUpc: "Ex: After Hours The Weeknd",
    ariaLabel: "Buscar música ou álbum",
    button: "Buscar",
  },
  copy: {
    copied: "Copiado para a área de transferência",
    ariaLabel: (value: string) => `Copiar ${value}`,
  },
  errors: {
    searchFailed: "Não foi possível consultar o MusicBrainz. Tente novamente.",
  },
  isrcTab: {
    hintIdle: "Digite o título da música e, se possível, o nome do artista.",
    noResults: "Sem resultados. Tente menos palavras ou revise a ortografia.",
    noIsrc: "Sem ISRC registrado no MusicBrainz.",
  },
  upcTab: {
    hintIdle: "Digite o título do álbum ou single e o nome do artista.",
    noResults: "Sem resultados. Tente menos palavras ou revise a ortografia.",
    noUpc: "Sem UPC/EAN registrado no MusicBrainz.",
  },
  disclaimer:
    "Dados obtidos em tempo real do MusicBrainz, o banco de dados musical aberto. Se uma gravação ou release não aparece ou não tem código, é porque não foi indexado lá — a distribuidora original tem esse código registrado normalmente.",
  faqSection: {
    isrcTitle: "O que é um código ISRC?",
    isrcBodyPre: "O ",
    isrcBodyStrong: "ISRC",
    isrcBodyPost:
      " (International Standard Recording Code) é um identificador único de 12 caracteres atribuído a uma gravação sonora específica. É a forma como Spotify, Apple Music, YouTube Music, sociedades de gestão e bancos de dados reconhecem a mesma gravação mesmo quando publicada em vários álbuns ou distribuidoras. Cada versão (single, remix, ao vivo) tem seu próprio ISRC.",
    upcTitle: "O que é um código UPC / EAN?",
    upcBodyPre: "O ",
    upcBodyStrongUpc: "UPC",
    upcBodyMid: " (Universal Product Code) ou ",
    upcBodyStrongEan: "EAN",
    upcBodyPost:
      " (European Article Number) é o código de barras que identifica um release (álbum, EP ou single) como produto comercial. Distribuidoras digitais, lojas e plataformas de streaming o usam para vincular todas as faixas do release e reportar vendas e streams ao lançamento correto.",
    whyTitle: "Por que você precisa conhecê-los?",
    whyItems: [
      "Reivindicar royalties junto a sociedades de gestão e DSPs.",
      "Migrar de distribuidora sem perder streams nem ouvintes mensais.",
      "Registrar sua obra corretamente em blockchain e no Registro de Propriedade Intelectual.",
      "Solicitar remoções, correções de metadados ou merges no Spotify/Apple.",
      "Sincronizar seu catálogo com o Content ID do YouTube.",
    ],
    howTitle: "Como obter um novo ISRC / UPC?",
    howBody:
      "Quando você distribui música com a Musicdibs, geramos automaticamente o ISRC de cada gravação e o UPC de cada release, sem custo adicional e com 100% de royalties para o artista. Você também pode reutilizar seus códigos atuais se vier de outra distribuidora, para não perder seu histórico de streams.",
    ctaDistribute: "Distribuir minha música",
    ctaMigrate: "Como migrar sem perder streams",
  },
};

const DICT: Record<string, MetadataFinderCopy> = {
  es: COPY_ES,
  en: COPY_EN,
  "pt-BR": COPY_PT,
};

export function useMetadataFinderCopy(): MetadataFinderCopy {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "es";
  if (DICT[lang]) return DICT[lang];
  if (lang.startsWith("pt")) return COPY_PT;
  if (lang.startsWith("en")) return COPY_EN;
  return COPY_ES;
}
