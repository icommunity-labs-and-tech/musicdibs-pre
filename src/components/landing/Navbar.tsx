import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import logo from "@/assets/landing/logo_dark.png";

const LANGUAGES = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "pt-BR", name: "Português (BR)", flag: "🇧🇷" },
];

function LandingLanguageButton() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current =
    LANGUAGES.find((l) => l.code === (i18n.resolvedLanguage || i18n.language)) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Cambiar idioma. Idioma actual: ${current.name}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.98_0.01_295/0.15)] px-3 py-2 text-xs sm:text-sm font-medium text-[oklch(0.98_0.01_295/0.75)] hover:text-[oklch(0.98_0.01_295)] transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span aria-hidden>{current.flag}</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-[oklch(0.98_0.01_295/0.12)] bg-[oklch(0.12_0.06_300)] shadow-lg backdrop-blur-md"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={lang.code === current.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                try { localStorage.setItem("lang", lang.code); } catch { /* ignore */ }
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[oklch(0.98_0.01_295/0.85)] hover:bg-[oklch(0.98_0.01_295/0.08)] transition-colors"
            >
              <span aria-hidden>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface NavbarProps {
  ctaText?: string;
  ctaHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
}

export function Navbar({
  ctaText = "🚀 Pruébalo gratis",
  ctaHref = "https://www.musicdibs.com/login?tab=register",
  secondaryText = "Iniciar sesión",
  secondaryHref = "https://www.musicdibs.com/login",
}: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.09 0.06 300 / 0.65), oklch(0.09 0.06 300 / 0.25) 70%, transparent)",
          borderBottom: "1px solid oklch(0.98 0.01 295 / 0.08)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4 gap-3">
        <a href="#" className="inline-flex items-center shrink-0">
          <img src={logo} alt="Musicdibs" className="h-9 sm:h-10 w-auto object-contain" />
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          {secondaryText && (
            <a
              href={secondaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-medium text-[oklch(0.98_0.01_295/0.75)] hover:text-[oklch(0.98_0.01_295)] transition-colors whitespace-nowrap"
            >
              {secondaryText}
            </a>
          )}
          <LandingLanguageButton />
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-[var(--shadow-magenta)] transition-transform hover:scale-105 whitespace-nowrap"
            style={{
              background:
                "linear-gradient(135deg, #8B5CF6 0%, oklch(0.68 0.27 322) 100%)",
            }}
          >
            {ctaText}
          </a>
        </div>
      </div>
    </header>
  );
}
