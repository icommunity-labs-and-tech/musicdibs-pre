import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Shield, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { WizardStepper } from './WizardStepper';
import { StepEntry } from './StepEntry';
import { StepFile } from './StepFile';
import { StepTitle } from './StepTitle';
import { StepVersion } from './StepVersion';
import { StepCreators } from './StepCreators';
import { StepSummary } from './StepSummary';
import { StepSuccess } from './StepSuccess';
import { StepParentWork } from './StepParentWork';
import { SignatureSelector } from './SignatureSelector';
import { DraftsModal } from './DraftsModal';
import { useCredits } from '@/hooks/useCredits';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import type { DashboardSummary } from '@/types/dashboard';
import { useWizardState } from './hooks/useWizardState';
import { useResumeDraft } from './hooks/useResumeDraft';
import { useRegisterSubmit } from './hooks/useRegisterSubmit';

interface RegistrationWizardProps {
  summary: DashboardSummary | null;
}

export function RegistrationWizard({ summary }: RegistrationWizardProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as { prefill?: { title?: string; type?: string; description?: string; audioUrl?: string } })?.prefill;

  const STEPS_NEW = [
    { label: t('wizard.steps.file') },
    { label: t('wizard.steps.title') },
    { label: t('wizard.steps.creators') },
    { label: t('wizard.steps.summary') },
    { label: t('wizard.steps.success') },
  ];

  const STEPS_VERSION = [
    { label: t('wizard.steps.parentWork') },
    { label: t('wizard.steps.file') },
    { label: t('wizard.steps.version') },
    { label: t('wizard.steps.creators') },
    { label: t('wizard.steps.summary') },
    { label: t('wizard.steps.success') },
  ];

  const {
    data,
    setData,
    step,
    setStep,
    resultId,
    resultHash,
    setResultId,
    setResultHash,
    update,
    reset,
  } = useWizardState(prefill);

  const isVersion = data.flow === 'version';
  const steps = isVersion ? STEPS_VERSION : STEPS_NEW;

  const [searchParams, setSearchParams] = useSearchParams();
  const resumeId = searchParams.get('resume');

  const {
    resumeWorkId,
    setResumeWorkId,
    resumeLoading,
    drafts,
    draftsModalOpen,
    setDraftsModalOpen,
  } = useResumeDraft({
    resumeId,
    penultimateStep: STEPS_NEW.length - 2,
    setData,
    setStep,
  });

  const { submit, loading } = useRegisterSubmit({
    data,
    resumeWorkId,
    onSuccess: (id, hash) => {
      setResultId(id);
      setResultHash(hash);
    },
  });

  // Jump to success step once submit resolves with a registrationId.
  useEffect(() => {
    if (resultId && step !== steps.length - 1) {
      setStep(steps.length - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  const { hasEnough, isLoading: creditsLoading } = useCredits();
  const noCredits = !creditsLoading && !hasEnough(FEATURE_COSTS.register_work);
  const kycBlocked = summary && summary.kycStatus !== 'verified';
  const freeRegisterLimitReached = !kycBlocked && summary?.freeRegisterLimitReached === true;

  const resetWizard = () => {
    reset();
    setResumeWorkId(null);
    if (searchParams.get('resume')) {
      searchParams.delete('resume');
      setSearchParams(searchParams, { replace: true });
    }
  };

  if (creditsLoading) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (kycBlocked) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-warning">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-medium text-sm">{t('wizard.rw.kycRequired')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('wizard.rw.kycWait')}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="text-warning border-warning">
              {t('wizard.rw.kycStatus', { status: summary?.kycStatus === 'pending' ? t('wizard.rw.kycPending') : t('wizard.rw.kycNotVerified') })}
            </Badge>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/dashboard/verify-identity')}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              {t('wizard.rw.goToVerify')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (freeRegisterLimitReached) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-warning">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-medium text-sm">{t('wizard.rw.freeRegisterLimitTitle')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('wizard.rw.freeRegisterLimitMsg')}</p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => navigate('/dashboard/credits')}
          >
            {t('wizard.rw.freeRegisterLimitCta')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderStep = () => {
    if (step === -1) {
      return <StepEntry data={data} onUpdate={update} onNext={() => setStep(0)} noCredits={noCredits} />;
    }

    if (step === steps.length - 1) {
      return (
        <StepSuccess
          data={data}
          registrationId={resultId}
          fileHash={resultHash}
          onRegisterAnother={resetWizard}
        />
      );
    }

    if (step === steps.length - 2) {
      return (
        <div className="space-y-6">
          <SignatureSelector value={data.signatureId} onChange={(id) => update({ signatureId: id })} />
          <StepSummary data={data} loading={loading} onSubmit={submit} onBack={() => setStep(step - 1)} />
        </div>
      );
    }

    if (isVersion) {
      switch (step) {
        case 0: return <StepParentWork data={data} onUpdate={update} onNext={() => setStep(1)} onBack={() => setStep(-1)} />;
        case 1: return <StepFile data={data} onUpdate={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />;
        case 2: return <StepVersion data={data} onUpdate={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
        case 3: return <StepCreators data={data} onUpdate={update} onNext={() => setStep(4)} onBack={() => setStep(2)} />;
      }
    } else {
      switch (step) {
        case 0: return <StepFile data={data} onUpdate={update} onNext={() => setStep(1)} onBack={() => setStep(-1)} />;
        case 1: return <StepTitle data={data} onUpdate={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />;
        case 2: return <StepCreators data={data} onUpdate={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
      }
    }
  };

  if (resumeLoading) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DraftsModal
        open={draftsModalOpen}
        drafts={drafts}
        onContinue={(id) => {
          setDraftsModalOpen(false);
          searchParams.set('resume', id);
          setSearchParams(searchParams, { replace: true });
        }}
        onStartNew={() => setDraftsModalOpen(false)}
      />
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-6 md:p-8">
          {step >= 0 && step < steps.length - 1 && (
            <WizardStepper steps={steps} currentStep={step} />
          )}
          {renderStep()}
        </CardContent>
      </Card>
    </>
  );
}
