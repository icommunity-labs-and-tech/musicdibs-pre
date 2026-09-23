import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Spanish-speaking country codes (ISO 3166-1 alpha-2 mapped via navigator.language)
const SPANISH_LANG_TAGS = [
  'es', 'es-AR', 'es-BO', 'es-CL', 'es-CO', 'es-CR', 'es-CU', 'es-DO',
  'es-EC', 'es-SV', 'es-GQ', 'es-GT', 'es-HN', 'es-MX', 'es-NI', 'es-PA',
  'es-PY', 'es-PE', 'es-PR', 'es-ES', 'es-UY', 'es-VE', 'es-419',
];

/** Map browser language tag to one of our supported languages */
export const mapBrowserLang = (detected: string | undefined): string => {
  if (!detected) return 'en';
  const tag = detected.trim().replace(/_/g, '-');

  // Spanish variants → es
  if (tag === 'es' || SPANISH_LANG_TAGS.some(s => tag.toLowerCase().startsWith(s.toLowerCase()))) return 'es';
  // Portuguese variants → pt-BR
  if (tag.toLowerCase().startsWith('pt')) return 'pt-BR';
  // English variants → en
  if (tag.toLowerCase().startsWith('en')) return 'en';
  // FIX 2026-08-31: cualquier otro idioma no soportado (ej. tagalo/filipino,
  // frances, aleman, chino...) caia por defecto en español, sin relacion
  // alguna con el idioma real del navegador del usuario -- reportado por
  // usuarios con navegador en idiomas no reconocidos viendo la web en
  // español sin motivo aparente. Se usa ingles como fallback universal,
  // el estandar para plataformas internacionales.
  return 'en';
};

/** Try multiple browser signals to find the best language match */
const detectBrowserLang = (): string => {
  // 1. User's explicit choice (localStorage)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('lang');
    if (saved) return mapBrowserLang(saved);
  }

  if (typeof navigator === 'undefined') return 'en';

  // 2. navigator.languages — full priority list (reflects OS region + browser prefs)
  if (navigator.languages?.length) {
    for (const lang of navigator.languages) {
      const mapped = mapBrowserLang(lang);
      if (mapped) return mapped;
    }
  }

  // 3. navigator.language — single best match
  if (navigator.language) {
    return mapBrowserLang(navigator.language);
  }

  return 'en';
};

const detectedLang = detectBrowserLang();


export const detectedLang = detectBrowserLang();

// ---------------------------------------------------------------------------
// División del JavaScript por idioma (2026-09-23).
//
// Antes se enviaban SIEMPRE los tres idiomas (es, en, pt-BR) en el bundle:
// ~145KB de fuente en el chunk principal + ~662KB en el chunk diferido. Ahora
// i18next arranca sin recursos y se carga UN SOLO idioma bajo demanda:
//
//  - producción: un JSON precompilado por idioma (src/locales/generated/*.json)
//    generado por scripts/build-locales.mjs en el prebuild. Cada visita
//    descarga sólo su idioma.
//  - desarrollo: se calculan en caliente desde los módulos TS (base +
//    extendidas) para que editar traducciones siga teniendo efecto inmediato
//    sin regenerar nada.
// ---------------------------------------------------------------------------

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {},
    lng: detectedLang,
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'pt-BR'],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    cleanCode: true,
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    // Los recursos se añaden tras el init via addResourceBundle(); sin
    // bindI18nStore los componentes ya montados no se re-renderizan.
    react: { bindI18nStore: 'added removed' },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  });

type SupportedLang = 'es' | 'en' | 'pt-BR';

const normalizeLang = (lng: string): SupportedLang =>
  (['es', 'en', 'pt-BR'].includes(lng) ? lng : mapBrowserLang(lng)) as SupportedLang;

const loadGenerated = async (lng: SupportedLang): Promise<Record<string, unknown> | null> => {
  try {
    switch (lng) {
      case 'en':
        return (await import('./locales/generated/en.json')).default as Record<string, unknown>;
      case 'pt-BR':
        return (await import('./locales/generated/pt-BR.json')).default as Record<string, unknown>;
      default:
        return (await import('./locales/generated/es.json')).default as Record<string, unknown>;
    }
  } catch {
    return null;
  }
};

const loadRuntime = async (lng: SupportedLang) => {
  const [{ baseResources }, extended] = await Promise.all([
    import('./locales/base'),
    import('./i18n-extended'),
  ]);
  const base = (baseResources as Record<string, { translation: Record<string, unknown> }>)[lng];
  i18n.addResourceBundle(lng, 'translation', JSON.parse(JSON.stringify(base?.translation ?? {})), false, true);
  extended.applyExtendedTranslations(i18n, [lng]);
};

const pending = new Map<SupportedLang, Promise<void>>();

/** Carga (una sola vez) los textos del idioma indicado. */
export const ensureLanguage = (lngRaw: string): Promise<void> => {
  const lng = normalizeLang(lngRaw);
  const cached = pending.get(lng);
  if (cached) return cached;

  const task = (async () => {
    if (import.meta.env.PROD) {
      const generated = await loadGenerated(lng);
      if (generated) {
        i18n.addResourceBundle(lng, 'translation', generated, false, true);
        return;
      }
    }
    await loadRuntime(lng);
  })().catch((err) => {
    console.error('[i18n] Error cargando el idioma', lng, err);
    pending.delete(lng);
  });

  pending.set(lng, task);
  return task;
};

// Carga inicial del idioma detectado (main.tsx la espera antes de renderizar).
export const i18nReady = ensureLanguage(detectedLang);

i18n.on('languageChanged', (lng) => {
  const normalized = mapBrowserLang(lng);
  if (lng !== normalized) {
    void i18n.changeLanguage(normalized);
    return;
  }

  void ensureLanguage(normalized);

  // Update <html lang> for accessibility and SEO
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized === 'pt-BR' ? 'pt-BR' : normalized;
  }

  try {
    localStorage.setItem('lang', normalized);
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
});

// Set initial <html lang>
if (typeof document !== 'undefined') {
  document.documentElement.lang = detectedLang === 'pt-BR' ? 'pt-BR' : detectedLang;
}

export default i18n;
