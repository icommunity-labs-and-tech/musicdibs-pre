import logoDark from "@/assets/landing/logo-dark.png";
import { useTranslation } from "react-i18next";

const RIGHTS: Record<string, string> = {
  es: "Todos los derechos reservados.",
  en: "All rights reserved.",
  "pt-BR": "Todos os direitos reservados.",
};

export function Footer() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "es";
  const rights = RIGHTS[lang] ?? RIGHTS.es;

  return (
    <footer className="relative border-t border-border mt-12">
      <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col items-center gap-6">
        <a href="https://www.musicdibs.com" target="_blank" rel="noopener noreferrer">
          <img src={logoDark} alt="Musicdibs" className="h-10 w-auto" />
        </a>

        <p className="text-xs text-primary-foreground text-center">
          © {new Date().getFullYear()} Musicdibs · IA Music Studio. {rights}
        </p>
      </div>
    </footer>
  );
}
