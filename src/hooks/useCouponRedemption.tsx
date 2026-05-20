import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const COUPON_FLAG_EVENT = 'coupon-visibility-changed';

export function emitCouponVisibilityChange(enabled: boolean) {
  window.dispatchEvent(new CustomEvent(COUPON_FLAG_EVENT, { detail: { enabled } }));
}

export function useCouponAlwaysVisible() {
  const [alwaysVisible, setAlwaysVisible] = useState(false);

  const fetchFlag = useCallback(async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'coupon_redemption_always_visible')
      .maybeSingle();
    const v = (data?.value as { enabled?: boolean } | null)?.enabled;
    setAlwaysVisible(Boolean(v));
  }, []);

  useEffect(() => {
    fetchFlag();

    // Realtime: cambios desde otra pestaña/usuario
    const channel = supabase
      .channel('app_settings_coupon_flag')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.coupon_redemption_always_visible' },
        () => { fetchFlag(); }
      )
      .subscribe();

    // Evento local: cambios desde el admin en la misma pestaña (instantáneo)
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
      if (detail && typeof detail.enabled === 'boolean') setAlwaysVisible(detail.enabled);
      else fetchFlag();
    };
    window.addEventListener(COUPON_FLAG_EVENT, onLocal);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(COUPON_FLAG_EVENT, onLocal);
    };
  }, [fetchFlag]);

  return alwaysVisible;
}

export function useCouponVisibility() {
  const { user } = useAuth();
  const [hasRedeemed, setHasRedeemed] = useState<boolean | null>(null);
  const alwaysVisible = useCouponAlwaysVisible();

  const refresh = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setHasRedeemed((count || 0) > 0);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // El switch admin controla totalmente la visibilidad: ON = visible para todos, OFF = oculto para todos
  const visible = alwaysVisible;
  return { visible, hasRedeemed, refresh };
}

export function useRedeemCoupon(onSuccess?: () => void) {
  const [submitting, setSubmitting] = useState(false);

  const redeem = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return false;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('redeem-coupon', {
        body: { code: trimmed },
      });
      if (error) {
        let msg = error.message || 'Error al canjear el cupón';
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        toast.error(msg);
        return false;
      }
      if ((data as any)?.success) {
        const granted = (data as any).credits_granted;
        const campaign = (data as any).campaign_name;
        toast.success(`🎉 ¡${granted} crédito${granted === 1 ? '' : 's'} añadido${granted === 1 ? '' : 's'}!`, {
          description: `Campaña: ${campaign}`,
        });
        onSuccess?.();
        return true;
      }
      if ((data as any)?.error) {
        toast.error((data as any).error);
      }
      return false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al canjear el cupón');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [onSuccess]);

  return { redeem, submitting };
}
