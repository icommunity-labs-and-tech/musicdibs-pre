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
  const scopedI18n = useMemo(() => i18n.cloneInstance({ lng: lang }), [i18n, lang]);
  const value = useMemo(() => ({ lang, prefix }), [lang, prefix]);

  return (
    <LocalizedRouteContext.Provider value={value}>
      <I18nextProvider i18n={scopedI18n}>{children}</I18nextProvider>
    </LocalizedRouteContext.Provider>
  );
};

export default LocalizedRoute;
