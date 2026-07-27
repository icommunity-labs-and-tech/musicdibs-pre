import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserDrafts, loadDraftFile, type DraftWork } from '@/services/dashboardApi';
import { initialWizardData, type WizardData } from '../types';

interface Options {
  resumeId: string | null;
  penultimateStep: number;
  setData: (d: WizardData) => void;
  setStep: (n: number) => void;
}

/**
 * Handles two related concerns:
 *   1. Loading a saved draft when the URL contains `?resume=<id>` and
 *      jumping the wizard straight to the signature+summary step.
 *   2. On first mount (no resume in URL), listing existing drafts so we
 *      can offer them via the DraftsModal.
 */
export function useResumeDraft({ resumeId, penultimateStep, setData, setStep }: Options) {
  const [resumeWorkId, setResumeWorkId] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftWork[]>([]);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [draftsChecked, setDraftsChecked] = useState(false);

  useEffect(() => {
    if (!resumeId || resumeWorkId === resumeId) return;
    let cancelled = false;
    (async () => {
      setResumeLoading(true);
      try {
        const { data: work, error } = await supabase
          .from('works')
          .select('id, title, type, description, author, file_path, status')
          .eq('id', resumeId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !work) {
          toast.error('No se pudo cargar el borrador');
          setResumeLoading(false);
          return;
        }
        if (work.status !== 'draft') {
          toast.error('Esta obra ya no está en borrador');
          setResumeLoading(false);
          return;
        }
        const file = work.file_path ? await loadDraftFile(work.file_path) : null;
        if (cancelled) return;
        const authors = (work.author || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        setData({
          ...initialWizardData,
          flow: 'new',
          file,
          files: file ? [file] : [],
          title: work.title || '',
          workType: work.type || 'audio',
          description: work.description || '',
          creators:
            authors.length > 0
              ? authors.map((name) => ({
                  id: crypto.randomUUID(),
                  name,
                  email: '',
                  roles: ['autor'],
                  percentage: null,
                }))
              : [{ id: crypto.randomUUID(), name: '', email: '', roles: [], percentage: null }],
        });
        setResumeWorkId(work.id);
        setStep(penultimateStep);
        setDraftsChecked(true);
      } catch (err) {
        console.error('[useResumeDraft] resume error', err);
        toast.error('Error cargando el borrador');
      } finally {
        if (!cancelled) setResumeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  useEffect(() => {
    if (resumeId || draftsChecked) return;
    let cancelled = false;
    (async () => {
      const list = await fetchUserDrafts(5);
      if (cancelled) return;
      setDrafts(list);
      if (list.length > 0) setDraftsModalOpen(true);
      setDraftsChecked(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, draftsChecked]);

  return {
    resumeWorkId,
    setResumeWorkId,
    resumeLoading,
    drafts,
    draftsModalOpen,
    setDraftsModalOpen,
  };
}
