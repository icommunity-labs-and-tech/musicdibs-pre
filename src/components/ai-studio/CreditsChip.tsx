import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCredits } from '@/hooks/useCredits';

export function CreditsChip() {
  const { credits } = useCredits();
  const { t } = useTranslation();
  return (
    <Link
      to="/dashboard/credits"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card hover:bg-accent/40 px-3 py-1.5 text-sm transition-colors shadow-sm"
      title={t('dashboard.creditBadge.tooltip', 'Créditos disponibles')}
    >
      <Coins className="w-4 h-4 text-success" />
      <span className="font-semibold tabular-nums">{credits ?? '—'}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {t('dashboard.account.credits', 'Créditos')}
      </span>
    </Link>
  );
}
