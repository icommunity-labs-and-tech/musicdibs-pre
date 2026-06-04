import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'es', label: 'ES', flag: '🇪🇸', name: 'Español' },
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'pt-BR', label: 'PT', flag: '🇧🇷', name: 'Português (Brasil)' },
] as const;

export const InlineLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'es';

  const change = (code: string) => {
    if (code === current) return;
    i18n.changeLanguage(code);
    try { localStorage.setItem('lang', code); } catch {}
  };

  return (
    <div
      role="group"
      aria-label="Traducir página"
      className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-background/60 p-0.5"
    >
      {LANGS.map((l) => {
        const active = current === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => change(l.code)}
            title={l.name}
            aria-label={l.name}
            aria-pressed={active}
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span aria-hidden className="text-sm leading-none">{l.flag}</span>
            <span className="hidden sm:inline">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
};
