import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { registerWork } from '@/services/dashboardApi';
import { useProductTracking } from '@/hooks/useProductTracking';
import type { WizardData } from '../types';

interface Options {
  data: WizardData;
  resumeWorkId: string | null;
  onSuccess: (registrationId: string, blockchainHash: string) => void;
}

async function convertAudioUrlToFile(url: string): Promise<File | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], `ai-generation-${Date.now()}.mp3`, { type: 'audio/mpeg' });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Encapsulates the "submit registration" flow:
 *   - Throttle-check to prevent duplicate submissions.
 *   - Convert AI-generated audio URL into a File when needed.
 *   - Call registerWork() and handle FREE_REGISTER_LIMIT + generic errors.
 *   - Poll works.status to update the blockchain hash once available.
 */
export function useRegisterSubmit({ data, resumeWorkId, onSuccess }: Options) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useProductTracking();
  const [loading, setLoading] = useState(false);

  const isVersion = data.flow === 'version';

  const submit = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentProcessing } = await supabase
        .from('works')
        .select('id, title, status')
        .eq('user_id', user.id)
        .in('status', ['processing', 'draft'])
        .gte('created_at', fiveMinutesAgo)
        .limit(1)
        .maybeSingle();

      if (recentProcessing) {
        toast.warning(
          t('wizard.rw.throttle', { title: recentProcessing.title }) ||
            `Tienes un registro en curso ("${recentProcessing.title}"). Espera a que finalice antes de registrar otra obra.`
        );
        return;
      }
    }

    let uploadFile = data.file;
    let uploadFiles = data.files.length > 0 ? [...data.files] : [];
    if (!uploadFile && data.aiAudioUrl) {
      setLoading(true);
      uploadFile = await convertAudioUrlToFile(data.aiAudioUrl);
      if (!uploadFile) {
        toast.error(t('wizard.rw.errorAudio'));
        setLoading(false);
        return;
      }
      uploadFiles = [uploadFile];
    }
    if (!uploadFile && uploadFiles.length === 0) {
      toast.error(t('wizard.rw.errorAudio'));
      setLoading(false);
      return;
    }
    if (!data.signatureId) {
      toast.error(t('dashboard.registerWork.kycRequired', 'Necesitas una firma KYC válida para registrar la obra.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const effectiveTitle = isVersion
        ? data.versionTitle || `${data.parentWorkTitle} (${data.versionType})`
        : data.title;
      const effectiveType = isVersion ? 'audio' : data.workType || 'audio';

      const res = await registerWork({
        title: effectiveTitle,
        type: effectiveType as any,
        author: data.creators.map((c) => c.name).join(', '),
        description: data.description,
        file: uploadFiles[0] || uploadFile!,
        files: uploadFiles.length > 0 ? uploadFiles : undefined,
        ownershipDeclaration: true,
        signatureId: data.signatureId,
        resumeWorkId: resumeWorkId || undefined,
        creators: data.creators,
      });

      if (res.ibsError || res.status === 'failed') {
        if (res.code === 'FREE_REGISTER_LIMIT') {
          toast.error(
            <div className="space-y-3 min-w-[260px]">
              <p className="text-sm font-medium">{res.ibsError}</p>
              <Button
                size="sm"
                className="w-full gap-1.5"
                onClick={() => navigate('/dashboard/credits')}
              >
                {t('wizard.rw.freeRegisterLimitCta')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>,
            { duration: 20_000 }
          );
        } else {
          toast.error(res.ibsError || t('wizard.rw.errorRegister'));
        }
        setLoading(false);
        return;
      }

      window.dispatchEvent(new CustomEvent('musicdibs:work-registered'));
      onSuccess(res.registrationId, res.blockchainHash || '');
      track('work_registered', { feature: 'register', metadata: { work_id: res.registrationId } });

      const lastGen = sessionStorage.getItem('md_last_generation');
      if (lastGen) {
        const elapsed = Date.now() - parseInt(lastGen, 10);
        if (elapsed < 24 * 60 * 60 * 1000) {
          track('work_registered_after_generation', {
            feature: 'register',
            metadata: { work_id: res.registrationId },
          });
        }
      }

      if (res.registrationId) {
        const pollInterval = setInterval(async () => {
          const { data: work } = await supabase
            .from('works')
            .select('status, blockchain_hash')
            .eq('id', res.registrationId)
            .single();
          if (work?.status === 'registered') {
            if (work.blockchain_hash) onSuccess(res.registrationId, work.blockchain_hash);
            clearInterval(pollInterval);
          } else if (work?.status === 'failed') {
            clearInterval(pollInterval);
          }
        }, 5000);
        setTimeout(() => clearInterval(pollInterval), 300_000);
      }
    } catch (err: any) {
      toast.error(err?.message || t('wizard.rw.errorGeneric'));
    }
    setLoading(false);
  };

  return { submit, loading };
}
