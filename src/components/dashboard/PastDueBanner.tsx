import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function PastDueBanner() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [isPastDue, setIsPastDue] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) setIsPastDue(data?.status === 'past_due');
    };

    check();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`past-due-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as { status?: string } | null;
            setIsPastDue(row?.status === 'past_due');
          },
        )
        .subscribe();
    } catch (err) {
      console.warn('[PastDueBanner] realtime subscribe failed', err);
    }

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  if (!isPastDue) return null;

  const lang = i18n.language || 'es';
  const isPt = lang.startsWith('pt');
  const isEn = lang.startsWith('en');

  const message = isPt
    ? '⚠️ Há um problema com o pagamento da sua assinatura. Atualize seu método de pagamento para evitar o cancelamento.'
    : isEn
      ? "⚠️ There's an issue with your subscription payment. Update your payment method to avoid cancellation."
      : '⚠️ Hay un problema con el pago de tu suscripción. Actualiza tu método de pago para evitar la cancelación.';

  const buttonLabel = isPt
    ? 'Atualizar método de pagamento'
    : isEn
      ? 'Update payment method'
      : 'Actualizar método de pago';

  const handleOpenPortal = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[PastDueBanner] portal failed', err);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="sticky top-12 z-40 border-b border-destructive/40 bg-gradient-to-r from-destructive to-orange-600 text-destructive-foreground shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 text-sm">
        <div className="flex items-start gap-2 flex-1">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
        <button
          onClick={handleOpenPortal}
          disabled={opening}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors px-4 py-2 text-sm font-semibold whitespace-nowrap disabled:opacity-60"
        >
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {buttonLabel}
          {!opening && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
