import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Visible warning shown below "Generate" buttons in AI modules that consume credits.
 * Reminds users to keep the tab open until the generation is ready.
 */
export const GenerationWarning = () => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="w-full rounded-xl border border-warning/60 bg-warning/15 dark:bg-warning/20 dark:border-warning/50 px-4 py-3 flex gap-3 items-start"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">
          {t('aiShared.dontCloseTab.title', { defaultValue: '⚠️ NO cierres esta pestaña durante la generación' })}
        </p>
        <p className="text-xs sm:text-[13px] text-foreground/80 leading-relaxed">
          {t('aiShared.dontCloseTab.body', {
            defaultValue: 'Mantén esta pantalla abierta hasta que el contenido esté listo y puedas descargarlo. Si sales antes, podrías perder tus créditos.',
          })}
        </p>
      </div>
    </div>
  );
};
