// ── YouTube Services — Types & Form Schema ───────────────────────────────────

export type ServiceType = 'oac' | 'content_id';

export type RequestStatus =
  | 'draft'
  | 'pending_payment'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected';

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
}

export const OAC_STEPS: WizardStep[] = [
  {
    id: 'oac_intro', type: 'info',
    title: 'Canal Oficial de Artista (OAC) en YouTube',
    subtitle: 'Este servicio gestiona la solicitud de tu Canal Oficial de Artista en YouTube.',
    checklist: [
      'Tener un Canal Topic propio en YouTube',
      'Al menos 3 videos musicales en el Canal Topic distribuidos por un distribuidor oficial',
      'El Canal Topic y el Canal Propio deben tener el mismo nombre del artista',
      'El canal debe representar exclusivamente a un artista',
      'Redes sociales enlazadas en la seccion de informacion del canal',
    ],
  },
  {
    id: 'oac_contact', type: 'group',
    title: 'Tus datos de contacto',
    subtitle: 'Deben coincidir exactamente con tus datos de administrador registrado en Sonosuite.',
    fields: [
      { key: 'firstName', label: 'Nombre', type: 'text', placeholder: 'Tu nombre', required: true },
      { key: 'lastName', label: 'Apellidos', type: 'text', placeholder: 'Tus apellidos', required: true },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com', required: true },
      { key: 'company', label: 'Empresa / Sello', type: 'text', placeholder: 'Nombre de tu sello discografico', required: true },
    ],
  },
  {
    id: 'oac_topic_channel', type: 'url',
    title: 'URL del Topic Channel del artista',
    subtitle: 'El Topic Channel es el canal automatico que YouTube crea para los artistas.',
    key: 'topicChannelUrl', placeholder: 'https://www.youtube.com/channel/...', required: true,
    hint: 'Buscalo en YouTube Music del artista y haz clic en "Ver en YouTube".',
  },
  {
    id: 'oac_artist_channel', type: 'url',
    title: 'URL del canal propio del artista',
    subtitle: 'Este es el canal que el artista gestiona directamente.',
    key: 'artistChannelUrl', placeholder: 'https://www.youtube.com/@nombreartista', required: true,
    checklist: ['Al menos un video musical publicado', 'Al menos una red social vinculada', 'Mismo nombre que el Topic Channel'],
  },
  { id: 'oac_payment', type: 'payment', title: 'Confirma tu solicitud', subtitle: 'Precio: <strong>50 EUR</strong>. Plazo de resolucion: <strong>5 dias laborables</strong>.' },
];

export const CONTENT_ID_STEPS: WizardStep[] = [
  {
    id: 'cid_intro', type: 'info',
    title: 'YouTube Content ID - Solicitud de autorizacion',
    subtitle: 'El Content ID detecta y gestiona tu contenido de audio protegido en cualquier video de YouTube.',
    checklist: ['Tu sello no puede ser publico ni por defecto', 'Al menos 3 releases distribuidos', 'Los artistas deben tener presencia en YouTube y RRSS', 'Cuenta sin historial de fraude'],
  },
  { id: 'cid_email', type: 'email', title: 'Email de administrador en Sonosuite', key: 'adminEmail', placeholder: 'admin@tusello.com', required: true, prefillFrom: 'email' },
  { id: 'cid_antifraud', type: 'checkbox', title: 'Antes de continuar', subtitle: 'Te recomendamos revisar las politicas de Content ID y Prevencion de Fraudes de Sonosuite.', key: 'antifraudConfirmed', required: true, hint: 'Confirmo que he leido y entendido las politicas de Content ID y Prevencion de Fraudes de Sonosuite.' },
  { id: 'cid_label_name', type: 'text', title: 'Nombre del sello', subtitle: 'Los sellos publicos o por defecto no son elegibles.', key: 'labelName', placeholder: 'Mi Sello Discografico', required: true },
  { id: 'cid_label_url', type: 'url', title: 'URL del sello en Sonosuite', key: 'labelUrl', placeholder: 'https://TUCODIGO.sonosuite.com/labels/...', required: true },
  { id: 'cid_catalog_desc', type: 'textarea', title: 'Describe el catalogo y roster de artistas', key: 'catalogDescription', placeholder: 'Nuestro sello representa artistas de...', required: true },
  { id: 'cid_youtube_links', type: 'textarea', title: 'Links a contenido oficial en YouTube', subtitle: 'Indica al menos el 50% de los artistas representados.', key: 'youtubeLinks', placeholder: 'https://youtube.com/@artista1\nhttps://youtube.com/@artista2', required: true },
  { id: 'cid_release_urls', type: 'textarea', title: 'URLs de 3 releases distribuidos', key: 'releaseUrls', placeholder: 'https://TUCODIGO.sonosuite.com/albums/1234', required: true },
  { id: 'cid_sales_data', type: 'textarea', title: 'Datos de ventas del sello (opcional)', key: 'salesData', optional: true, required: false },
  { id: 'cid_identity', type: 'file', title: 'Verificacion de identidad del representante', key: 'identityDocUrl', accept: '.pdf,.jpg,.jpeg,.png', required: true, hint: 'DNI, Pasaporte u otro documento legal.' },
  { id: 'cid_social_links', type: 'textarea', title: 'Redes sociales del sello y artistas', subtitle: 'Indica al menos el 50% de los artistas.', key: 'socialLinks', placeholder: 'Instagram sello: https://instagram.com/sello', required: true },
  { id: 'cid_website', type: 'url', title: 'Sitio web oficial del sello', key: 'labelWebsite', placeholder: 'https://www.tusello.com', required: true },
  {
    id: 'cid_promotion', type: 'radio',
    title: 'Se promocionara este contenido online?',
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
