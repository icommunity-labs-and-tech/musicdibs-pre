import { Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlanOffer } from './PlanOffer';

interface NoCreditsAlertProps {
  message?: string;
  cost?: number;
  actionLabel?: string;
}

export function NoCreditsAlert({ message, cost, actionLabel }: NoCreditsAlertProps) {
  const { t } = useTranslation();
  const dynamicMessage = typeof cost === 'number'
    ? t('dashboard.noCredits.costMessage', { action: actionLabel || t('dashboard.noCredits.thisAction'), cost })
    : message;

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
      <Coins className="h-7 w-7 text-primary" />
      <p className="text-sm font-medium">{dynamicMessage || t('dashboard.noCredits.message')}</p>
      <PlanOffer />
    </div>
  );
}
