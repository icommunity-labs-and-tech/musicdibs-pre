import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Loader2, CheckCircle2, AlertCircle,
  ExternalLink, Info, RefreshCw, Clock, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

// Provider statuses (real iBS status, never local optimistic state)
const STATUS_VERIFIED = ['verified', 'success', 'approved'];
const STATUS_IN_REVIEW = ['pending', 'submitted', 'processing', 'under_review'];
const STATUS_RETRYABLE = ['created', 'started', 'initiated', 'failed', 'rejected', 'expired', 'cancelled'];

type ProviderStatus = string;

export default function IdentityVerificationPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tk = (k: string) => t(`dashboard.kyc.${k}`) as string;

  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<ProviderStatus>('unverified');
  const [pendingSig, setPendingSig] = useState<any | null>(null);
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);

  const isVerified = STATUS_VERIFIED.includes(kycStatus);
  const isInReview = STATUS_IN_REVIEW.includes(kycStatus);

  const refreshState = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('kyc_status')
      .eq('user_id', user.id)
      .single();

    const localStatus = profile?.kyc_status || 'unverified';

    // If already verified locally, trust it (terminal state set by webhook)
    if (STATUS_VERIFIED.includes(localStatus)) {
      setKycStatus(localStatus);
      setPendingSig(null);
      return;
    }

    // Always confirm with provider via the most recent non-terminal signature
    try {
      await supabase.functions.invoke('ibs-signatures', { body: { action: 'sync' } });
      const { data: listData } = await supabase.functions.invoke('ibs-signatures', {
        body: { action: 'list' },
      });
      const candidate = listData?.signatures?.find((s: any) =>
        !STATUS_VERIFIED.includes(s.status)
      );

      if (!candidate?.ibs_signature_id) {
        setKycStatus(localStatus);
        setPendingSig(null);
        return;
      }

      const { data: statusData } = await supabase.functions.invoke('ibs-signatures', {
        body: { action: 'provider_status', signatureId: candidate.ibs_signature_id },
      });
      const providerStatus: string | undefined = statusData?.providerStatus;

      if (!providerStatus) {
        setKycStatus(localStatus);
        setPendingSig(null);
        return;
      }

      if (STATUS_VERIFIED.includes(providerStatus)) {
        setKycStatus('verified');
        setPendingSig(null);
      } else if (STATUS_IN_REVIEW.includes(providerStatus)) {
        setKycStatus('pending');
        setPendingSig(null);
      } else if (STATUS_RETRYABLE.includes(providerStatus)) {
        setKycStatus('unverified');
        setPendingSig({
          ...candidate,
          status: providerStatus,
          kyc_url: statusData?.kycUrl || candidate.kyc_url,
        });
      } else {
        setKycStatus(localStatus);
        setPendingSig(null);
      }
    } catch (err) {
      console.warn('[KYC] refresh failed:', err);
      setKycStatus(localStatus);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      await refreshState();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Poll while iframe is open
  useEffect(() => {
    if (!polling || !user) return;
    const interval = setInterval(() => { refreshState(); }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, user]);

  // Realtime: react when webhook updates kyc_status
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`kyc-status-watch-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const newStatus = payload.new?.kyc_status;
        if (!newStatus) return;
        if (STATUS_VERIFIED.includes(newStatus)) {
          setKycStatus('verified');
          setPolling(false);
          setKycUrl(null);
          toast.success(tk('verifiedToast'));
        } else if (STATUS_IN_REVIEW.includes(newStatus)) {
          setKycStatus('pending');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startNewVerification = async () => {
    if (!user) return;
    setSubmitting(true);
    setIframeError(false);
    try {
      const signatureName = `MusicDibs · ${user.email || user.id} · ${new Date().toISOString().slice(0, 10)}`;
      const { data, error } = await supabase.functions.invoke('ibs-signatures', {
        body: { action: 'create', signatureName },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      const url = data.kycUrl
        ? (data.kycUrl.includes('?') ? data.kycUrl : `${data.kycUrl}?lang=es`)
        : `https://identity.icommunitylabs.com/identification/${data.signatureId}?lang=es`;

      setSignatureId(data.signatureId);
      setKycUrl(url);
      setPendingSig(null);
      setPolling(true);
    } catch (err: any) {
      toast.error(tk('step1Error') + (err.message || tk('unknownError')));
    } finally {
      setSubmitting(false);
    }
  };

  const continuePendingSig = async () => {
    if (!pendingSig) return;
    setSubmitting(true);
    setIframeError(false);
    try {
      let url: string | null = pendingSig.kyc_url || null;
      if (!url) {
        const { data, error } = await supabase.functions.invoke('ibs-signatures', {
          body: { action: 'retry', signatureId: pendingSig.ibs_signature_id },
        });
        if (error || data?.error) throw new Error(error?.message || data?.error);
        url = data.kycUrl;
      }
      if (!url) throw new Error('No KYC URL');
      setSignatureId(pendingSig.ibs_signature_id);
      setKycUrl(url.includes('?') ? url : `${url}?lang=es`);
      setPolling(true);
    } catch (err: any) {
      toast.error(err.message || tk('unknownError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = async () => {
    try { await refreshState(); } catch { /* noop */ }
    navigate('/dashboard');
  };

  // ── RENDER ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> {tk('title')}
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> {tk('loading')}
        </div>
      </div>
    );
  }

  // VERIFIED
  if (isVerified) {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> {tk('title')}
        </h2>
        <Card className="border-border/40">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-emerald-600">{tk('verifiedTitle')}</h3>
              <p className="text-sm text-muted-foreground">{tk('verifiedDesc')}</p>
            </div>
            <Button onClick={() => navigate('/dashboard/register')}>
              {tk('registerWorkCta')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // IN REVIEW (and not actively in iframe)
  if (isInReview && !kycUrl) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> {tk('title')}
          </h2>
          <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="gap-1.5">
            ← {tk('backToDashboard')}
          </Button>
        </div>
        <Card className="border-border/40">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-amber-600">{tk('pendingTitle')}</h3>
              <p className="text-sm text-muted-foreground">{tk('pendingDesc')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // IFRAME OPEN
  if (kycUrl) {
    return (
      <div className="space-y-4 max-w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> {tk('title')}
          </h2>
          <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="gap-1.5">
            ← {tk('backToDashboard')}
          </Button>
        </div>

        <Card className="border-border/40">
          <CardContent className="p-6 space-y-4">
            <div className="rounded-lg bg-muted/30 border border-border/30 p-4 flex gap-3">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{tk('step2Intro')}</p>
            </div>

            {isInReview && (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {tk('pendingBadge')}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{tk('autoUpdating')}</span>
              </div>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-medium">{tk('iframeIssueTitle')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tk('iframeIssueDesc')}</p>
              </div>
              <Button
                variant="outline" size="sm"
                onClick={() => window.open(kycUrl, '_blank', 'noopener,noreferrer')}
                className="gap-2 shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
                {tk('openInNewTab')}
              </Button>
            </div>

            {!iframeError ? (
              <div className="rounded-lg overflow-hidden border border-border/40">
                <iframe
                  ref={iframeRef}
                  src={kycUrl}
                  className="w-full"
                  style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
                  allow="camera; microphone; fullscreen"
                  title={tk('title')}
                  onError={() => setIframeError(true)}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-8 text-center space-y-4">
                <AlertCircle className="h-10 w-10 mx-auto text-amber-400" />
                <div>
                  <p className="font-medium">{tk('iframeFallbackTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{tk('iframeFallbackDesc')}</p>
                </div>
                <p className="text-xs text-muted-foreground">{tk('iframeFallbackHint')}</p>
              </div>
            )}

            <Button
              variant="outline" size="sm" className="w-full gap-2"
              onClick={refreshState}
            >
              <CheckCircle2 className="h-4 w-4" />
              {tk('checkStatus')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // UNVERIFIED / RETRYABLE — single CTA
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> {tk('title')}
        </h2>
        <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="gap-1.5">
          ← {tk('backToDashboard')}
        </Button>
      </div>

      <Card className="border-border/40">
        <CardContent className="p-4 flex items-start gap-3">
          {pendingSig ? (
            <>
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-600">{tk('notCompletedTitle')}</p>
                <p className="text-xs text-muted-foreground">{tk('notCompletedDesc')}</p>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{tk('bannerUnverifiedTitle')}</p>
                <p className="text-xs text-muted-foreground">{tk('bannerUnverifiedDesc')}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardContent className="p-6 space-y-4">
          <div className="rounded-lg bg-muted/30 border border-border/30 p-4 flex gap-3">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{tk('directIntro')}</p>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border/30 p-3 flex gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">{tk('privacyNote')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {pendingSig && (
              <Button
                onClick={continuePendingSig}
                disabled={submitting}
                className="gap-2 flex-1"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {tk('starting')}</>
                  : <><RefreshCw className="h-4 w-4" /> {tk('continueVerification')}</>
                }
              </Button>
            )}
            <Button
              onClick={startNewVerification}
              disabled={submitting}
              variant={pendingSig ? 'outline' : 'default'}
              className="gap-2 flex-1"
            >
              {submitting && !pendingSig
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {tk('starting')}</>
                : <><Shield className="h-4 w-4" /> {pendingSig ? tk('restartVerification') : tk('verifyMyIdentity')}</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
