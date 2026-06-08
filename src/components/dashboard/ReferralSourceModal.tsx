import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Youtube, Instagram, Music, Search, Users, Mic, Circle, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Source = 'influencer' | 'instagram' | 'tiktok' | 'google' | 'friend' | 'podcast' | 'other';
type Influencer = 'fael' | 'grego' | 'nico' | 'matzz' | 'missao' | 'christian' | 'erika' | 'cecidover' | 'other';

const STORAGE_KEY = 'musicdibs_referral_dismissed';

export function ReferralSourceModal() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const tr = (k: string, f: string) => t(k, { defaultValue: f });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'source' | 'influencer'>('source');
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);

  // Comprobar si ya tiene referral_source
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const dismissed = sessionStorage.getItem(`${STORAGE_KEY}_${user.id}`);
        if (dismissed) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('referral_source')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error || cancelled) return;
        if (!data?.referral_source) {
          // PequeÃ±o delay para no chocar con el tour
          setTimeout(() => !cancelled && setOpen(true), 1200);
        }
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const sources: { id: Source; icon: React.ElementType; label: string; emoji: string }[] = [
    { id: 'influencer', icon: Youtube, emoji: 'ð¥', label: tr('referral.sources.influencer', 'VÃ­deo de un creador en YouTube') },
    { id: 'instagram', icon: Instagram, emoji: 'ð±', label: tr('referral.sources.instagram', 'Instagram (MusicDibs)') },
    { id: 'tiktok', icon: Music, emoji: 'ðµ', label: tr('referral.sources.tiktok', 'TikTok (MusicDibs)') },
    { id: 'google', icon: Search, emoji: 'ð', label: tr('referral.sources.google', 'Google / BÃºsqueda web') },
    { id: 'friend', icon: Users, emoji: 'ð¥', label: tr('referral.sources.friend', 'Un amigo me lo recomendÃ³') },
    { id: 'podcast', icon: Mic, emoji: 'ðï¸', label: tr('referral.sources.podcast', 'Podcast o blog') },
    { id: 'other', icon: Circle, emoji: 'ðµ', label: tr('referral.sources.other', 'Otro') },
  ];

  const influencers: { id: Influencer; label: string }[] = [
    { id: 'fael', label: 'Fael' },
    { id: 'grego', label: 'Gr3go' },
    { id: 'nico', label: 'Nicolas (NicoMusic)' },
    { id: 'matzz', label: 'Matzz' },
    { id: 'missao', label: 'Missao' },
    { id: 'christian', label: 'Christian' },
    { id: 'erika', label: 'Erika' },
    { id: 'CeciDover', label: '@CeciDover' },
    { id: 'other', label: tr('referral.influencers.other', 'Otro creador') },
  ];

  const persistAndClose = () => {
    if (user) sessionStorage.setItem(`${STORAGE_KEY}_${user.id}`, '1');
    setOpen(false);
    window.dispatchEvent(new Event('musicdibs:referral-closed'));
  };

  const save = async (source: Source, inf: Influencer | null = null, det: string | null = null) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          referral_source: source,
          referral_influencer: inf,
          referral_detail: det,
          referral_set_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success(tr('referral.thanks', 'Â¡Gracias por contarnos!'));
      persistAndClose();
    } catch (e: any) {
      toast.error(e.message || tr('referral.error', 'No se pudo guardar tu respuesta'));
    } finally {
      setSaving(false);
    }
  };

  const handleSourceClick = (s: Source) => {
    if (s === 'influencer') {
      setStep('influencer');
      return;
    }
    save(s);
  };

  const handleInfluencerConfirm = () => {
    if (!influencer) return;
    save('influencer', influencer, influencer === 'other' ? (detail.trim() || null) : null);
  };

  const handleSkip = () => {
    persistAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 'source'
              ? tr('referral.title', 'Â¿CÃ³mo nos conociste?')
              : tr('referral.influencerTitle', 'Â¿De quÃ© creador?')}
          </DialogTitle>
          <DialogDescription>
            {step === 'source'
              ? tr('referral.subtitle', 'Nos ayudas a entender quÃ© funciona para mejorar la plataforma.')
              : tr('referral.influencerSubtitle', 'Selecciona el creador cuyo vÃ­deo viste.')}
          </DialogDescription>
        </DialogHeader>

        {step === 'source' && (
          <div className="grid gap-2 py-2">
            {sources.map((s) => (
              <button
                key={s.id}
                disabled={saving}
                onClick={() => handleSourceClick(s.id)}
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg border border-border/60 bg-card p-3 text-left',
                  'hover:bg-muted/50 hover:border-primary/40 transition-colors disabled:opacity-50'
                )}
              >
                <span className="text-xl shrink-0" aria-hidden>{s.emoji}</span>
                <span className="text-sm font-medium flex-1">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'influencer' && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              {influencers.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setInfluencer(i.id)}
                  className={cn(
                    'rounded-lg border p-3 text-sm font-medium transition-colors',
                    influencer === i.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 hover:bg-muted/50'
                  )}
                >
                  {i.label}
                </button>
              ))}
            </div>

            {influencer === 'other' && (
              <div className="space-y-1.5">
                <Label htmlFor="referral-detail">
                  {tr('referral.detailLabel', 'Nombre del creador (opcional)')}
                </Label>
                <Input
                  id="referral-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={tr('referral.detailPlaceholder', 'Ej. @nombrecreador')}
                  maxLength={120}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 gap-2">
          {step === 'influencer' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep('source'); setInfluencer(null); setDetail(''); }}
              disabled={saving}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {tr('referral.back', 'AtrÃ¡s')}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving}>
              {tr('referral.skip', 'Saltar')}
            </Button>
          )}

          {step === 'influencer' && (
            <Button
              onClick={handleInfluencerConfirm}
              disabled={!influencer || saving}
              variant="hero"
              size="sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {tr('referral.confirm', 'Confirmar')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
