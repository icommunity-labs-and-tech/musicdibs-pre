// ── YouTube Services — Types & Form Schema ───────────────────────────────────

export type ServiceType = 'oac' | 'content_id';

export type RequestStatus =
  | 'draft'
  | 'pending_payment'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface YoutubeServiceRequest {
  id: string;
  user_id: string;
  service_type: ServiceType;
  status: RequestStatus;
  form_data: Record<string, unknown>;
  amount_gross: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  submitted_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type StepType = 'info' | 'text' | 'email' | 'url' | 'textarea' | 'checkbox' | 'radio' | 'file' | 'group' | 'payment';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'textarea';
  placeholder?: string;
  required?: boolean;
  hint?: string;
}

export interface RadioOption {
  value: string;
  label: string;
}

export interface WizardStep {
  id: string;
  type: StepType;
  title: string;
  subtitle?: string;
  key?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  fields?: FieldDef[];
  options?: RadioOption[];
  accept?: string;
  prefillFrom?: string;
  checklist?: string[];
  optional?: boolean;
  showPolicyLink?: boolean;
}

export const OAC_STEPS: WizardStep[] = [
  {
    id: 'oac_intro', type: 'info',
    title: 'Servicio adicional para creacion de OAC',
    subtitle: 'Este servicio adicional ofrece la posibilidad de solicitar tu Canal de Artista Oficial (OAC) en YouTube.<br/><br/><strong>Nota:</strong> Necesitas tener tanto tu propio canal de artista como un canal de tema para procesar esta solicitud. No podremos proceder si el canal propio esta vacio, no tiene contenido relacionado con su correspondiente canal de tema y/o le faltan los enlaces oficiales del artista. Para solicitar un OAC, el canal del artista debe contener videos musicales, videos con letras u otro contenido similar relacionado con las pistas de arte en el canal de tema. Las redes sociales del artista tambien deben estar vinculadas al canal.',
    checklist: [
      'Tener un Canal Topic propio',
      'Al menos tres videos musicales relacionados en el Canal Topic, distribuidos por un distribuidor de musica oficial',
      'El Canal Topic y el Canal Propio deben tener el mismo nombre del artista',
      'El canal debe representar exclusivamente a un artista (no se permite contenido de otros artistas)',
      'Redes sociales enlazadas en la seccion de informacion del canal',
    ],
  },
  {
    id: 'oac_link_social_howto', type: 'info',
    title: 'Como vincular las redes sociales al canal',
    subtitle: '1. En un ordenador, ve a tu canal y haz clic en la pestana Informacion (o en Personalizar canal si usas el nuevo diseno de YouTube).<br/>2. Pasa el cursor sobre la seccion Enlaces y haz clic en Editar.<br/>3. Haz clic en el boton + Anadir.<br/>4. Ingresa el titulo y la URL del sitio que deseas vincular (se pueden anadir hasta cinco enlaces).<br/>5. Haz clic en Listo.',
  },
  {
    id: 'oac_disqualifiers', type: 'info',
    title: 'Cuando un canal propio NO aplica para la solicitud',
    subtitle: 'Los canales propios con estas caracteristicas no seran gestionados por YouTube:',
    checklist: [
      'Canales vacios',
      'Canales de fans',
      'Artista incorrecto (nombre distinto al del canal tema)',
      'Canales domesticos',
      'Canales de varios artistas',
      'Canales no musicales',
      'Canales Vevo',
    ],
  },
  {
    id: 'oac_topic_channel', type: 'url',
    title: 'Indica el enlace del canal tema del artista',
    key: 'topicChannelUrl', placeholder: 'https://www.youtube.com/channel/...', required: true,
    hint: 'Buscalo en YouTube Music del artista y haz clic en "Ver en YouTube".',
  },
  {
    id: 'oac_artist_channel', type: 'url',
    title: 'Indica el enlace del canal de artista',
    subtitle: 'Los requerimientos minimos del canal de artista son:',
    key: 'artistChannelUrl', placeholder: 'https://www.youtube.com/@nombreartista', required: true,
    checklist: ['Al menos un video musical publicado', 'Al menos una red social enlazada al canal', 'Mismo nombre que el canal tema'],
    hint: 'Ten en cuenta que estos son los requerimientos de YouTube y que cualquier enlace que no los cumpla no sera valido para la solicitud. Asegurate de que todo es correcto antes de proceder.',
  },
  {
    id: 'oac_vevo_merge', type: 'radio',
    title: 'Quieres juntar el canal VEVO de tu artista con el Canal Oficial de Artista?',
    subtitle: 'Ten en cuenta que esta accion tendra un coste extra de 5 EUR.',
    key: 'vevoMerge', required: true,
    options: [
      { value: 'yes', label: 'Si' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'oac_vevo_url', type: 'url',
    title: 'URL del canal VEVO',
    key: 'vevoChannelUrl', placeholder: 'https://www.youtube.com/...', required: true,
  },

  { id: 'oac_payment', type: 'payment', title: 'Confirma tu solicitud', subtitle: 'Precio: <strong>50 EUR</strong>. Plazo de resolucion: <strong>5 dias laborables</strong>.' },
];

export const CONTENT_ID_STEPS: WizardStep[] = [
  {
    id: 'cid_intro', type: 'info',
    title: 'YouTube Content ID - Solicitud de autorizacion',
    subtitle: 'El Content ID detecta y gestiona tu contenido de audio protegido en cualquier video de YouTube.',
    checklist: ['Tu sello no puede ser publico ni por defecto', 'Minimo 500 EUR/USD generados en DSPs principales durante al menos 3 meses', 'Al menos 3 releases distribuidos a traves de MusicDibs', 'Los artistas deben tener presencia en YouTube, tiendas verificadas y RRSS', 'Cuenta sin historial de fraude'],
  },
  { id: 'cid_antifraud', type: 'checkbox', title: 'Antes de continuar', subtitle: 'Te recomendamos revisar las politicas de Content ID y Prevencion de Fraudes de MusicDibs.', key: 'antifraudConfirmed', required: true, hint: 'Confirmo que he leido y entendido las politicas de Content ID y Prevencion de Fraudes de MusicDibs.', showPolicyLink: true },
  { id: 'cid_label_name', type: 'text', title: 'Nombre del sello', subtitle: 'Los sellos publicos o por defecto no son elegibles.', key: 'labelName', placeholder: 'Mi Sello Discografico', required: true },
  { id: 'cid_label_url', type: 'url', title: 'URL del sello en MusicDibs', key: 'labelUrl', placeholder: 'https://musicdibs.com/labels/...', required: true },
  {
    id: 'cid_revenue_proof', type: 'textarea',
    title: 'Ingresos constantes demostrables en otros DSPs',
    subtitle: 'Requisito minimo: al menos 500 EUR/USD generados en los principales DSPs (Spotify, Apple Music, etc.) durante un periodo continuado de al menos 3 meses.',
    key: 'revenueProof', placeholder: 'Comparte un enlace a tu informe de ventas o resume las cifras de los ultimos 3 meses.', required: true,
    hint: 'Puedes adjuntar un enlace descargable al informe de ventas, o un enlace a la plataforma donde se pueda verificar. Sin esta prueba, la solicitud no cumple el requisito minimo y sera rechazada.',
  },
  {
    id: 'cid_catalog_desc', type: 'textarea',
    title: 'Describe el catalogo y roster de artistas',
    subtitle: 'Esta informacion debe estar disponible en la pestana "Sellos" de tu plataforma.',
    key: 'catalogDescription', placeholder: 'Nuestro sello representa artistas de...', required: true,
    hint: 'Comparte una descripcion. Cualquier informacion que apoye y explique el plan y la trayectoria del sello sera util. Ademas, menciona los artistas que representan o van a representar.',
  },
  {
    id: 'cid_youtube_links', type: 'textarea',
    title: 'Links a contenido oficial en YouTube',
    subtitle: 'Los artistas representados por el sello deben tener ya contenido propio disponible en YouTube (videoclips, actuaciones en directo, etc.). Indica al menos el 50% de los artistas representados.',
    key: 'youtubeLinks', placeholder: 'https://youtube.com/@artista1\nhttps://youtube.com/@artista2', required: true,
  },
  {
    id: 'cid_release_urls', type: 'textarea',
    title: 'Distribucion previa a otros DSPs principales',
    subtitle: 'El sello debe haber distribuido previamente contenido a traves de MusicDibs a los canales principales (al menos Spotify y Apple Music).',
    key: 'releaseUrls', placeholder: 'https://musicdibs.com/albums/1234', required: true,
    hint: 'Comparte enlaces desde tu panel de MusicDibs al contenido distribuido, o enlaces directos al DSP principal (Spotify, Apple Music).',
  },
  { id: 'cid_identity', type: 'file', title: 'Verificacion de identidad del representante', key: 'identityDocUrl', accept: '.pdf,.jpg,.jpeg,.png', required: true, hint: 'DNI, Pasaporte u otro documento legal.' },
  {
    id: 'cid_verified_profiles', type: 'textarea',
    title: 'Perfiles verificados en tiendas y plataformas digitales',
    subtitle: 'Un sello legitimo debe tener perfiles verificados en las principales tiendas, igual que sus artistas. Indica al menos el 50% de los artistas representados.',
    key: 'verifiedProfiles', placeholder: 'Spotify for Artists: https://open.spotify.com/artist/...\nApple Music for Artists: https://artists.apple.com/...', required: true,
  },
  {
    id: 'cid_social_links', type: 'textarea',
    title: 'Redes sociales del sello y artistas',
    subtitle: 'Indica al menos el 50% de los artistas.',
    key: 'socialLinks', placeholder: 'Instagram sello: https://instagram.com/sello', required: true,
    hint: 'Cualquier sello y artista con la entidad suficiente para necesitar proteccion de su contenido en YouTube deberia tener presencia en redes sociales con comportamiento organico saludable.',
  },
  { id: 'cid_website', type: 'url', title: 'Sitio web oficial del sello', key: 'labelWebsite', placeholder: 'https://www.tusello.com', required: true },
  {
    id: 'cid_promotion', type: 'radio',
    title: 'Se promocionara este contenido online?',
    subtitle: 'Esto es importante: algunos servicios de pitching/promocion pueden derivar en comportamientos abusivos, fraude de clics o streaming artificial.',
    key: 'contentPromotion', required: true,
    options: [
      { value: 'no', label: 'No, sin servicios de promocion externa' },
      { value: 'yes_organic', label: 'Si, solo con marketing organico (RRSS, blog)' },
      { value: 'yes_pr', label: 'Si, a traves de empresa de PR' },
    ],
  },
  { id: 'cid_promotion_details', type: 'textarea', title: 'Detalla el tipo de promocion (si aplica)', key: 'promotionDetails', optional: true, required: false },
  { id: 'cid_admin_confirm', type: 'checkbox', title: 'Confirmacion final', key: 'adminConfirmed', required: true, hint: 'Confirmo que he revisado perfil, catalogo e historial de la cuenta y todo es correcto.', checklist: ['Perfil de usuario y catalogo revisado', 'Sin incidentes de fraude', 'Informacion completa y verificada'] },
  { id: 'cid_payment', type: 'payment', title: 'Envia tu solicitud', subtitle: 'Precio: <strong>50 EUR</strong>. Plazo: <strong>5 dias laborables</strong>.' },
];

export const SERVICE_CONFIG = {
  oac: {
    id: 'oac' as ServiceType,
    name: 'Canal Oficial de Artista (OAC)',
    shortName: 'OAC',
    description: 'Solicita la verificacion de tu Canal Oficial de Artista en YouTube.',
    price: 50, currency: 'EUR',
    steps: OAC_STEPS,
    icon: 'YT',
    timeline: '5 dias laborables',
    benefits: ['Canal unificado con topic channel', 'Catalogo organizado automaticamente', 'Verificacion oficial de artista', 'Mayor visibilidad en YouTube Music'],
  },
  content_id: {
    id: 'content_id' as ServiceType,
    name: 'YouTube Content ID',
    shortName: 'Content ID',
    description: 'Registra tu audio en Content ID para monetizar cualquier uso de tu musica en YouTube.',
    price: 50, currency: 'EUR',
    steps: CONTENT_ID_STEPS,
    icon: 'CID',
    timeline: '5 dias laborables',
    benefits: ['Detecta usos de tu musica en YouTube', 'Monetiza videos de terceros', 'Recibe el ~70% de ingresos de audio', 'Gestion automatizada de reclamaciones'],
  },
} as const;
