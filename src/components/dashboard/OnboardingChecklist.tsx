import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from 'lucide-react';

type StepKey = 'kyc' | 'artist' | 'work' | 'ai' | 'promo';

interface StepState {
  key: StepKey;
  done: boolean;
  href: string;
}

const dismissKey = (userId: string) => `onboardingChecklistDismissed:${userId}`;

export function OnboardingChecklist() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(dismissKey(user.id)) === '1');

    let cancelled = false;
    (async () => {
      const [profileRes, artistRes, workRes, aiRes, promoRes] = await Promise.all([
        supabase.from('profiles').select('kyc_status').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_artist_profiles').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('works').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('ai_generations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('social_promotions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (cancelled) return;
      setSteps([
        { key: 'kyc', done: profileRes.data?.kyc_status === 'verified', href: '/dashboard/verify-identity' },
        { key: 'artist', done: (artistRes.count ?? 0) > 0, href: '/dashboard/artist-profiles' },
        { key: 'work', done: (workRes.count ?? 0) > 0, href: '/dashboard/register' },
        { key: 'ai', done: (aiRes.count ?? 0) > 0, href: '/ai-studio' },
        { key: 'promo', done: (promoRes.count ?? 0) > 0, href: '/dashboard/promotion' },
      ]);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const completed = useMemo(() => steps.filter(s => s.done).length, [steps]);
  const total = steps.length || 5;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!user || loading || dismissed) return null;
  if (steps.length && completed === total) return null;

  const nextStep = steps.find(s => !s.done);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(dismissKey(user.id), '1');
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-brand/5 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label={t('dashboard.onboarding.dismiss', 'Descartar')}
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">{t('dashboard.onboarding.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.onboarding.subtitle', { completed, total })}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground text-right tabular-nums">{progress}%</p>
        </div>

        <ul className="space-y-1">
          {steps.map((step) => (
            <li key={step.key}>
              <button
                onClick={() => navigate(step.href)}
                className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/50 transition-colors"
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={`flex-1 text-sm ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {t(`dashboard.onboarding.steps.${step.key}`)}
                </span>
                {!step.done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            </li>
          ))}
        </ul>

        {nextStep && (
          <Button variant="hero" size="sm" className="w-full gap-1.5" onClick={() => navigate(nextStep.href)}>
            {t('dashboard.onboarding.cta')}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
