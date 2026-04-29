import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { WORK_TYPES, type WizardData } from './types';
import { useWorkTypeLabels } from './useWizardLabels';

interface StepTitleProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTitle({ data, onUpdate, onNext, onBack }: StepTitleProps) {
  const { t } = useTranslation();
  const workTypeLabels = useWorkTypeLabels();
  const valid = data.title.trim() && data.workType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.stepTitle.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.stepTitle.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">{t('wizard.stepTitle.titleLabel')} *</Label>
          <Input
            value={data.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder={t('wizard.stepTitle.titlePlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">{t('wizard.stepTitle.typeLabel')} *</Label>
          <Select value={data.workType} onValueChange={(v) => onUpdate({ workType: v })}>
            <SelectTrigger><SelectValue placeholder={t('wizard.stepTitle.typePlaceholder')} /></SelectTrigger>
            <SelectContent>
              {WORK_TYPES.map((wt) => (
                <SelectItem key={wt.value} value={wt.value}>{workTypeLabels[wt.value] || wt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('wizard.stepTitle.descLabel')} <span className="text-muted-foreground">({t('wizard.optional')})</span></Label>
          </div>
          <Textarea
            value={data.description}
            onChange={(e) => {
              if (e.target.value.length <= 2500) onUpdate({ description: e.target.value });
            }}
            rows={6}
            maxLength={2500}
            placeholder={t('wizard.stepTitle.descPlaceholder')}
          />
          <p className="text-xs text-muted-foreground text-right">{data.description.length}/2500</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>{t('wizard.back')}</Button>
        <Button variant="hero" onClick={onNext} disabled={!valid}>{t('wizard.continue')}</Button>
      </div>
    </div>
  );
}
