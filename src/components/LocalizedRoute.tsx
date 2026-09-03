import { createContext, useContext, useMemo, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";

export type SupportedLang = "es" | "en" | "pt-BR";

interface LocalizedRouteValue {
  /** Language this route is locked to. */
  lang: SupportedLang;
  /** URL prefix of the localized route, e.g. "/pt". */
  prefix: string;
}

const LocalizedRouteContext = createContext<LocalizedRouteValue | null>(null);

export const useLocalizedRoute = () => useContext(LocalizedRouteContext);

interface LocalizedRouteProps {
  lang: SupportedLang;
  prefix: string;
  children: ReactNode;
}

/**
 * Lightweight wrapper that locks a shared page to a single language and URL
 * prefix, so crawlers without JS get a real indexable URL per language
 * (e.g. /pt/features) instead of relying on the localStorage language.
 *
 * It scopes the subtree to a cloned i18n instance fixed to `lang` and exposes
 * the prefix through context so <SEO> can emit the right canonical + <html lang>.
 */
export const LocalizedRoute = ({ lang, prefix, children }: LocalizedRouteProps) => {
  const { i18n } = useTranslation();
  const scopedI18n = useMemo(() => {
    // `cloneInstance` shares the language detector, so cloning would persist the
    // forced language into localStorage and leak it to the rest of the site.
    // Snapshot the cached preference and restore it right after.
    const KEYS = ["lang", "i18nextLng"];
    const cached = KEYS.map((k) => [k, localStorage.getItem(k)] as const);
    const clone = i18n.cloneInstance({ lng: lang });
    cached.forEach(([k, v]) => {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    });
    return clone;
  }, [i18n, lang]);
  const value = useMemo(() => ({ lang, prefix }), [lang, prefix]);

  return (
    <LocalizedRouteContext.Provider value={value}>
      <I18nextProvider i18n={scopedI18n}>{children}</I18nextProvider>
    </LocalizedRouteContext.Provider>
  );
};

export default LocalizedRoute;
