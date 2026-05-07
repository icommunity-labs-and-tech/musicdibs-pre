import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { buildCertificateData } from '@/lib/certificateData';
import { generateCertificate } from '@/lib/generateCertificate';
import { toast } from 'sonner';

type State = 'loading' | 'generating' | 'done' | 'error';

export default function CertificateDownloadPage() {
  const { workId } = useParams<{ workId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [workTitle, setWorkTitle] = useState<string>('');

  const locale = i18n.resolvedLanguage === 'pt-BR' ? 'pt-BR' : (i18n.resolvedLanguage || i18n.language || 'es');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=/dashboard/certificate/${workId}`);
      return;
    }
    if (!workId) {
      setState('error');
      setErrorMsg(t('dashboard.certificate.generateError'));
      return;
    }

    (async () => {
      try {
        const { data: work, error } = await supabase
          .from('works')
          .select('id, user_id, title, type, description, original_filename, file_size, file_hash_sha512_b64, blockchain_hash, blockchain_network, checker_url, ibs_evidence_id, certified_at, created_at')
          .eq('id', workId)
          .maybeSingle();

        if (error || !work) throw new Error('not_found');
        if (work.user_id !== user.id) throw new Error('forbidden');
        if (!work.blockchain_hash || !work.ibs_evidence_id) throw new Error('not_certified');

        setWorkTitle(work.title);

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        setState('generating');

        const certData = await buildCertificateData({
          title: work.title,
          filename: work.original_filename || `${work.title}.mp3`,
          filesize: work.file_size || undefined,
          fileType: work.type || t('dashboard.certificate.fileTypeFallback'),
          description: work.description || undefined,
          authorName: profile?.display_name || user.email?.split('@')[0] || 'Autor',
          certifiedAt: work.certified_at || work.created_at,
          network: work.blockchain_network || 'Polygon',
          txHash: work.blockchain_hash,
          checkerUrl: work.checker_url || undefined,
          ibsEvidenceId: work.ibs_evidence_id,
          locale,
          fallbackFingerprint: work.file_hash_sha512_b64 || undefined,
          fallbackAlgorithm: 'SHA-512',
        });

        await generateCertificate(certData, locale);
        setState('done');
        toast.success(t('dashboard.certificate.downloadSuccess'));
      } catch (e: any) {
        console.error('[CertificateDownloadPage]', e);
        setState('error');
        setErrorMsg(e?.message === 'forbidden'
          ? 'No tienes permiso para acceder a este certificado.'
          : e?.message === 'not_certified'
          ? 'Esta obra todavía no está certificada en blockchain.'
          : t('dashboard.certificate.generateError'));
      }
    })();
  }, [user, authLoading, workId, navigate, t, locale]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border/40 rounded-xl p-8 text-center space-y-4 shadow-sm">
        {(state === 'loading' || state === 'generating') && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h1 className="text-lg font-semibold">
              {state === 'loading' ? 'Cargando obra…' : t('dashboard.certificate.generating')}
            </h1>
            {workTitle && <p className="text-sm text-muted-foreground truncate">{workTitle}</p>}
          </>
        )}
        {state === 'done' && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
            <h1 className="text-lg font-semibold">{t('dashboard.certificate.downloadSuccess')}</h1>
            <p className="text-sm text-muted-foreground">{workTitle}</p>
            <Button onClick={() => navigate('/dashboard/register')} className="mt-2">
              <Download className="h-4 w-4 mr-1.5" /> {t('wizard.success.viewReg')}
            </Button>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-lg font-semibold">Error</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" onClick={() => navigate('/dashboard/register')}>
              Volver a mis obras
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
