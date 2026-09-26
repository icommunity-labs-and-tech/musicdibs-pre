import { useTranslation } from "react-i18next";

interface FooterBadge {
  id: string;
  href: string;
  title: string;
  alt: string;
  src: string;
  width: number;
  height: number;
}

const BADGES: FooterBadge[] = [
  {
    id: "launchbuff",
    href: "https://launchbuff.com/products/musicdibs-258c0l",
    title: "Featured on LaunchBuff",
    alt: "Featured on LaunchBuff",
    src: "https://launchbuff.com/badge-featured-dark.svg",
    width: 256,
    height: 80,
  },
];

const labelByLang: Record<string, string> = {
  es: "Destacado en",
  en: "Featured on",
  "pt-BR": "Destaque em",
};

const FooterBadges = () => {
  const { i18n } = useTranslation();
  const label =
    labelByLang[i18n.resolvedLanguage || i18n.language || "es"] ??
    labelByLang.es;

  if (BADGES.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <span className="text-primary-foreground/60 text-sm">
        {label}:
      </span>
      {BADGES.map((badge) => (
        <a
          key={badge.id}
          href={badge.href}
          target="_blank"
          rel="noopener noreferrer"
          title={badge.title}
          aria-label={badge.alt}
          className="inline-flex items-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-2 hover:bg-primary-foreground/15 transition-colors"
        >
          <img
            src={badge.src}
            alt={badge.alt}
            width={badge.width}
            height={badge.height}
            className="h-12 w-auto rounded-lg"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
};

export { FooterBadges };
