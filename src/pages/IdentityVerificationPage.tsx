import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Shield, ChevronRight, Loader2, CheckCircle2,
  AlertCircle, ExternalLink, User, FileText,
  Globe, Info, RefreshCw, Clock, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPE_KEYS = [
  { value: 'dni', placeholder: '12345678A' },
  { value: 'nie', placeholder: 'X1234567A' },
  { value: 'passport', placeholder: 'AAA000000' },
  { value: 'id_card', placeholder: '' },
  { value: 'cedula', placeholder: '' },
  { value: 'curp', placeholder: 'AAAA000000AAAAAA00' },
  { value: 'cpf', placeholder: '000.000.000-00' },
  { value: 'rut', placeholder: '12.345.678-9' },
  { value: 'other', placeholder: '' },
];

function StepIndicator({ current }: { current: 1 | 2 }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2].map(step => (
        <div key={step} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
            current >= step ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {current > step ? <CheckCircle2 className="h-4 w-4" /> : step}
          </div>
          <span className={`text-xs font-medium hidden sm:inline ${current >= step ? 'text-foreground' : 'text-muted-foreground'}`}>
            {step === 1 ? t('dashboard.kyc.stepDataLabel') : t('dashboard.kyc.stepBiometricLabel')}
          </span>
          {step < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

export default function IdentityVerificationPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const tk = (k: string) => t(`dashboard.kyc.${k}`) as string;

  const [kycStatus, setKycStatus] = useState('unverified');
  const [kycLoading, setKycLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);

  const [fullName, setFullName] = useState('');
  const [docType, setDocType] = useState('dni');
  const [docNumber, setDocNumber] = useState('');
  const [country, setCountry] = useState('ES');
  const [submitting, setSubmitting] = useState(false);

  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [polling, setPolling] = useState(false);

  const [pendingSig, setPendingSig] = useState<any | null>(null);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('kyc_status, display_name')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setKycStatus(data.kyc_status || 'unverified');
        if (data.display_name) setFullName(data.display_name);
      }

      // Detect a signature already in progress to allow resuming instead of creating a new one
      if (data?.kyc_status !== 'verified') {
        try {
          const { data: listData } = await supabase.functions.invoke('ibs-signatures', {
            body: { action: 'list' },
          });
          const inProgress = listData?.signatures?.find(
            (s: any) => ['initiated', 'created', 'pending', 'failed'].includes(s.status)
          );
          if (inProgress) setPendingSig(inProgress);
        } catch (err) {
          console.warn('[KYC] could not list signatures:', err);
        }
      }
      setKycLoading(false);
    })();
  }, [user]);


  useEffect(() => {
    if (!polling || !user) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('user_id', user.id)
        .single();
      if (data?.kyc_status === 'verified') {
        setKycStatus('verified');
        setPolling(false);
        setKycUrl(null);
        toast.success(tk('verifiedToast'));
      } else if (data?.kyc_status === 'pending') {
        setKycStatus('pending');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [polling, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('kyc-status-watch')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const newStatus = payload.new?.kyc_status;
        if (newStatus && newStatus !== kycStatus) {
          setKycStatus(newStatus);
          if (newStatus === 'verified') {
            toast.success(tk('verifiedToast'));
            setPolling(false);
            setKycUrl(null);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, kycStatus]);

  useEffect(() => {
    if (step !== 2 || !kycUrl) return;
    const handleMessage = async (event: MessageEvent) => {
      const msg = typeof event.data === 'string' ? event.data : event.data?.type || event.data?.status;
      const msgStr = JSON.stringify(event.data).toLowerCase();
      if (
        msgStr.includes('completed') || msgStr.includes('success') ||
        msgStr.includes('verified') || msgStr.includes('finish') ||
        msg === 'verification_complete'
      ) {
        setKycUrl(null);
        if (user) {
          const { data } = await supabase.from('profiles').select('kyc_status').eq('user_id', user.id).single();
          if (data?.kyc_status === 'verified') {
            setKycStatus('verified');
            setPolling(false);
            toast.success(tk('verifiedToast'));
          } else {
            toast.info(tk('verifyCompletedProcessing'));
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [step, kycUrl, user]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !docNumber.trim()) {
      toast.error(tk('step1FillRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const signatureName = `${fullName.trim()} · ${docType.toUpperCase()} ${docNumber.trim()}`;
      const { data, error } = await supabase.functions.invoke('ibs-signatures', {
        body: { action: 'create', signatureName },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      setSignatureId(data.signatureId);
      const url = data.kycUrl
        ? `${data.kycUrl}?lang=es`
        : `https://identity.icommunitylabs.com/identification/${data.signatureId}?lang=es`;

      try {
        await supabase.functions.invoke('ibs-signatures', {
          body: { action: 'mark_kyc_started', signatureId: data.signatureId },
        });
        setKycStatus('pending');
      } catch (markErr) {
        console.error('[KYC] mark_kyc_started failed (non-blocking):', markErr);
      }

      setKycUrl(url);
      setStep(2);
      setPolling(true);
      toast.success(tk('step1Submitted'));
    } catch (err: any) {
      toast.error(tk('step1Error') + (err.message || tk('unknownError')));
    }
    setSubmitting(false);
  };

  const handleResume = async () => {
    if (!pendingSig) return;
    setResuming(true);
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
      try {
        await supabase.functions.invoke('ibs-signatures', {
          body: { action: 'mark_kyc_started', signatureId: pendingSig.ibs_signature_id },
        });
        setKycStatus('pending');
      } catch (markErr) {
        console.error('[KYC] mark_kyc_started failed (non-blocking):', markErr);
      }
      setStep(2);
      setPolling(true);
    } catch (err: any) {
      toast.error(err.message || tk('unknownError'));
    }
    setResuming(false);
  };

  const selectedDocType = DOC_TYPE_KEYS.find(d => d.value === docType);

  if (!kycLoading && kycStatus === 'verified') {
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

  if (!kycLoading && kycStatus === 'pending' && !kycUrl) {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> {tk('title')}
        </h2>
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

  const isIframeStep = step === 2 && !!kycUrl;

  const statusBanner = !kycLoading && !isIframeStep && (
    <Card className="border-border/40">
      <CardContent className="p-4 flex items-start gap-3">
        {kycStatus === 'verified' && (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-600">{tk('verifiedTitle')}</p>
              <p className="text-xs text-muted-foreground">{tk('bannerVerifiedShort')}</p>
            </div>
          </>
        )}
        {kycStatus === 'pending' && (
          <>
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-600">{tk('pendingTitle')}</p>
              <p className="text-xs text-muted-foreground">{tk('bannerPendingShort')}</p>
            </div>
          </>
        )}
        {kycStatus === 'initiated' && (
          <>
            <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-amber-600">{tk('bannerInitiatedTitle')}</p>
                <p className="text-xs text-muted-foreground">{tk('bannerInitiatedDesc')}</p>
              </div>
              <Button
                size="sm" variant="outline" className="gap-1.5 h-8"
                onClick={() => { setStep(1); setKycUrl(null); setSignatureId(null); setIframeError(false); }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> {tk('retry')}
              </Button>
            </div>
          </>
        )}
        {(kycStatus === 'unverified' || !kycStatus) && (
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
  );

  return (
    <div className={`space-y-4 ${isIframeStep ? 'max-w-full' : 'max-w-2xl'}`}>
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" /> {tk('title')}
      </h2>

      {statusBanner}

      {!kycLoading && pendingSig && step === 1 && !kycUrl && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {tk('bannerInitiatedTitle')}
              </p>
              <p className="text-xs text-muted-foreground">{tk('bannerInitiatedDesc')}</p>
            </div>
            <Button size="sm" onClick={handleResume} disabled={resuming} className="gap-2 shrink-0">
              {resuming
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {tk('starting')}</>
                : <><RefreshCw className="h-4 w-4" /> {tk('retry')}</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {kycLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> {tk('loading')}
        </div>
      ) : (
        <Card className="border-border/40">
          <CardContent className="p-6 space-y-6">
            <StepIndicator current={step} />

            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div className="rounded-lg bg-muted/30 border border-border/30 p-4 flex gap-3">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{tk('step1Intro')}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {tk('fullName')}
                  </Label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={tk('fullNamePlaceholder')}
                    required className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">{tk('fullNameExample')}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> {tk('docType')}
                  </Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPE_KEYS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{tk(`docTypes.${d.value}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> {tk('docNumber')}
                  </Label>
                  <Input
                    value={docNumber}
                    onChange={e => setDocNumber(e.target.value.toUpperCase())}
                    placeholder={selectedDocType?.placeholder || tk('docNumberPlaceholder')}
                    required
                    className="h-9 font-mono tracking-wider uppercase"
                    maxLength={30}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {docType === 'dni' && tk('docHelpDni')}
                    {docType === 'nie' && tk('docHelpNie')}
                    {docType === 'passport' && tk('docHelpPassport')}
                    {docType === 'curp' && tk('docHelpCurp')}
                    {docType === 'cpf' && tk('docHelpCpf')}
                    {docType === 'rut' && tk('docHelpRut')}
                    {(docType === 'id_card' || docType === 'cedula' || docType === 'other') && tk('docHelpGeneric')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> {tk('countryLabel')}
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">🇪🇸 España</SelectItem>
                      <SelectItem value="MX">🇲🇽 México</SelectItem>
                      <SelectItem value="AR">🇦🇷 Argentina</SelectItem>
                      <SelectItem value="CO">🇨🇴 Colombia</SelectItem>
                      <SelectItem value="CL">🇨🇱 Chile</SelectItem>
                      <SelectItem value="PE">🇵🇪 Perú</SelectItem>
                      <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                      <SelectItem value="VE">🇻🇪 Venezuela</SelectItem>
                      <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                      <SelectItem value="GB">🇬🇧 Reino Unido</SelectItem>
                      <SelectItem value="OTHER">{tk('countryOther')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg bg-muted/30 border border-border/30 p-3 flex gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground">{tk('privacyNote')}</p>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {tk('starting')}</>
                    : <>{tk('nextBiometric')} <ChevronRight className="h-4 w-4" /></>
                  }
                </Button>
              </form>
            )}

            {step === 2 && kycUrl && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/30 border border-border/30 p-4 flex gap-3">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{tk('step2Intro')}</p>
                </div>

                {kycStatus === 'pending' && (
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
                  onClick={async () => {
                    const { data } = await supabase
                      .from('profiles')
                      .select('kyc_status')
                      .eq('user_id', user!.id)
                      .single();
                    if (data?.kyc_status === 'verified') {
                      setKycStatus('verified');
                      toast.success(tk('verifiedToast'));
                    } else {
                      toast.info(tk('stillPendingInfo'));
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {tk('checkStatus')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
