import { ShieldCheck, Globe2, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

type Lang = "es" | "en" | "pt-BR";

const COPY: Record<Lang, {
  eyebrow: string;
  title: string;
  desc: string;
  chips: string[];
}> = {
  es: {
    eyebrow: "Validez legal · Distribución global",
    title: "Tu música, 100% tuya. Lista para sonar en todo el mundo.",
    desc: "Las canciones creadas con Musicdibs tienen validez legal y están listas para distribuirse en Spotify, Apple Music, YouTube y cualquier plataforma global.",
    chips: ["Validez legal", "Royalties tuyos", "Distribución global"],
  },
  en: {
    eyebrow: "Legal validity · Global distribution",
    title: "Your music, 100% yours. Ready to be heard worldwide.",
    desc: "Songs created with Musicdibs are legally valid and ready to be distributed on Spotify, Apple Music, YouTube and any global platform.",
    chips: ["Legal validity", "Your royalties", "Global distribution"],
  },
  "pt-BR": {
    eyebrow: "Validade legal · Distribuição global",
    title: "Sua música, 100% sua. Pronta para tocar no mundo todo.",
    desc: "As músicas criadas com a Musicdibs têm validade legal e estão prontas para serem distribuídas no Spotify, Apple Music, YouTube e em qualquer plataforma global.",
    chips: ["Validade legal", "Royalties seus", "Distribuição global"],
  },
};

const ICONS = [ShieldCheck, BadgeCheck, Globe2];

export function SocialBanner() {
  const { i18n } = useTranslation();
  const lang = (["es", "en", "pt-BR"].includes(i18n.resolvedLanguage || i18n.language)
    ? (i18n.resolvedLanguage || i18n.language)
    : "es") as Lang;
  const c = COPY[lang];

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-magenta/10 via-transparent to-pink/10 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-magenta-glow mb-2">
                {c.eyebrow}
              </p>
              <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight">
                {c.title}
              </h3>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                {c.desc}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 shrink-0">
              {c.chips.map((label, i) => {
                const Icon = ICONS[i];
                return (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-xl bg-deep/50 border border-border px-3.5 py-2.5 text-sm"
                  >
                    <Icon className="h-4 w-4 text-pink" />
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
