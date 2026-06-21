import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface CopyrightBlockedAlertProps {
  message: string;
  suggestions: string[];
  detected?: string | null;
  onRetry: () => void;
}

export function CopyrightBlockedAlert({
  message,
  suggestions,
  detected,
  onRetry,
}: CopyrightBlockedAlertProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-amber-900 dark:text-amber-200">
            {t('aiCreate.copyrightBlockedTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
          {detected && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {t('aiCreate.copyrightDetectedLabel')}: <span className="font-medium">{detected}</span>
            </p>
          )}
        </div>
      </div>
      {suggestions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground/90 mb-1.5">
            {t('aiCreate.copyrightSuggestionsLabel')}
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-foreground/90">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="w-4 h-4" /> {t('aiCreate.copyrightRetry')}
      </Button>
    </div>
  );
}
