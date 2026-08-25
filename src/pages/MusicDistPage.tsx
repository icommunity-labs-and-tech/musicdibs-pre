import RemoteHtml from "@/components/RemoteHtml";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Se sirve a través del proxy `music-dist` porque Storage devuelve todos los
// objetos como text/plain con nosniff y CSP restrictiva (rompe CSS, imágenes
// y subdirectorios). El proxy aplica el Content-Type correcto y traduce el
// HTML (?lang=en|pt) con caché en el propio bucket.
const REMOTE_URL =
  "https://kmwehyixenybegwhqljx.supabase.co/functions/v1/music-dist/";
const APP_BASE_PATH = "/music-dist";
const STORAGE_KEY = "music-dist-lang";

const LANGUAGES = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pt", label: "Português (BR)", flag: "🇧🇷" },
] as const;

type GuideLang = (typeof LANGUAGES)[number]["code"];

const GUIDE_LABEL: Record<GuideLang, string> = {
  es: "Guía de usuario",
  en: "User guide",
  pt: "Guia do usuário",
};

const SEO_COPY: Record<GuideLang, { title: string; description: string }> = {
  es: {
    title: "Guía de usuario de distribución musical",
    description:
      "Guía de usuario de MusicDibs: gestiona tu cuenta, distribuye tu música y cobra tus regalías sin comisiones.",
  },
  en: {
    title: "Music distribution user guide",
    description:
      "MusicDibs user guide: manage your account, distribute your music worldwide and collect your royalties commission-free.",
  },
  pt: {
    title: "Guia do usuário de distribuição musical",
    description:
      "Guia do usuário da MusicDibs: gerencie sua conta, distribua sua música e receba seus royalties sem comissões.",
  },
};

const isGuideLang = (value: string | null): value is GuideLang =>
  LANGUAGES.some((language) => language.code === value);

const MusicDistPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [lang, setLang] = useState<GuideLang>(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("lang");
    if (isGuideLang(fromQuery)) return fromQuery;
    const stored = localStorage.getItem(STORAGE_KEY);
    return isGuideLang(stored) ? stored : "es";
  });

  // Mantiene el idioma al navegar por subpáginas (los enlaces remotos no llevan query).
  useEffect(() => {
    const fromQuery = new URLSearchParams(location.search).get("lang");
    if (isGuideLang(fromQuery)) {
      if (fromQuery !== lang) setLang(fromQuery);
    } else if (lang !== "es") {
      navigate(`${location.pathname}?lang=${lang}`, { replace: true });
    }
  }, [lang, location.pathname, location.search, navigate]);

  const handleLangChange = (next: GuideLang) => {
    setLang(next);
    localStorage.setItem(STORAGE_KEY, next);
    navigate(next === "es" ? location.pathname : `${location.pathname}?lang=${next}`, {
      replace: true,
    });
  };

  const remoteUrl = useMemo(() => {
    const pathAfterBase = location.pathname.startsWith(APP_BASE_PATH)
      ? location.pathname.slice(APP_BASE_PATH.length)
      : "";
    const cleanPath = pathAfterBase
      .split("/")
      .map((segment) => segment.trim())
      .filter((segment) => segment && segment !== "*")
      .join("/");
    let remotePath = cleanPath || "index.html";

    if (!/\.[a-z0-9]+$/i.test(remotePath)) {
      remotePath = `${remotePath.replace(/\/+$/, "")}/index.html`;
    }

    const target = new URL(remotePath, REMOTE_URL);
    if (lang !== "es") target.searchParams.set("lang", lang);
    return target.href;
  }, [lang, location.pathname]);

  const current = LANGUAGES.find((language) => language.code === lang) ?? LANGUAGES[0];

  return (
    <>
      <SEO
        title={SEO_COPY[lang].title}
        description={SEO_COPY[lang].description}
        path={location.pathname}
        lang={lang === "pt" ? "pt-BR" : lang}
      />
      <main>
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <a href={APP_BASE_PATH} className="flex items-center gap-3">
              <img
                src={`${REMOTE_URL}assets/img/logo.png`}
                alt="MusicDibs"
                className="h-8 w-auto"
              />
              <span className="text-sm font-medium text-muted-foreground">
                {GUIDE_LABEL[lang]}
              </span>
            </a>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{current.flag}</span>
                  <span className="hidden sm:inline">{current.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-popover">
                {LANGUAGES.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => handleLangChange(language.code)}
                    className="gap-2"
                  >
                    <span>{language.flag}</span>
                    <span className="flex-1">{language.label}</span>
                    {language.code === lang && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <RemoteHtml
          appBasePath={APP_BASE_PATH}
          remoteBaseUrl={REMOTE_URL}
          url={remoteUrl}
          stripSelectors={["header.site-header"]}
          title={`MusicDibs — ${GUIDE_LABEL[lang]}`}
        />
      </main>
    </>
  );
};

export default MusicDistPage;
