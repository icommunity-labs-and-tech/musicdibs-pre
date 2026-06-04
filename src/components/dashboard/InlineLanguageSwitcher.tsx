import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'en', label: 'GB', name: 'English' },
  { code: 'pt-BR', label: 'BR', name: 'Português (Brasil)' },
  { code: 'es', label: 'ES', name: 'Español' },
] as const;

export const InlineLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'es';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGS.find((l) => l.code === current) || LANGS[2];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem('lang', code); } catch {}
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Idioma actual: ${currentLang.name}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span>{currentLang.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 min-w-[180px] rounded-md border border-border bg-popover shadow-lg z-50 overflow-hidden"
        >
          {LANGS.map((l) => {
            const active = current === l.code;
            return (
              <button
                key={l.code}
                role="option"
                aria-selected={active}
                onClick={() => change(l.code)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                  active ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted'
                )}
              >
                <span className="text-xs font-semibold text-muted-foreground w-7">{l.label}</span>
                <span>{l.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
