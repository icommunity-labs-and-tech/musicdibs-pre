import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  cancelRenewal as apiCancelRenewal,
  openBillingPortal as apiOpenBillingPortal,
  startCreditCheckout as apiStartCreditCheckout,
  startYoutubeCheckout as apiStartYoutubeCheckout,
  type CheckoutRedirectResponse,
  type CreditCheckoutBody,
  type YoutubeCheckoutBody,
} from '@/services/checkoutApi';

type LoadingKey =
  | 'credit'
  | 'youtube'
  | 'cancel'
  | 'portal'
  | null;

/**
 * Unified checkout/billing operations for Stripe-backed flows:
 *   - Start a credit or subscription checkout (redirects to Stripe when needed).
 *   - Start a YouTube-service checkout (opens Stripe in a popup window).
 *   - Cancel renewal at period end.
 *   - Open the Stripe billing portal.
 *
 * Callers get consistent loading state and toast-based error reporting; each
 * method returns the raw payload so callers can still branch on
 * business-specific fields (`switched`, `already_subscribed`, `plan`, etc.).
 */
export function useCheckout() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<LoadingKey>(null);

  const startCreditCheckout = useCallback(
    async (body: CreditCheckoutBody): Promise<CheckoutRedirectResponse | null> => {
      setLoading('credit');
      try {
        const data = await apiStartCreditCheckout(body);
        if (data?.url) {
          window.location.href = data.url;
        }
        return data;
      } catch (err: any) {
        toast.error(err?.message || t('dashboard.billing.checkoutError', 'Error al iniciar el pago'));
        return null;
      } finally {
        setLoading(null);
      }
    },
    [t]
  );

  const cancelRenewal = useCallback(
    async (reason: string): Promise<boolean> => {
      setLoading('cancel');
      try {
        const data = await apiCancelRenewal(reason);
        toast.success(data?.message || t('dashboard.billing.renewalCancelled', 'Renovación cancelada'));
        return true;
      } catch (err: any) {
        toast.error(err?.message || t('dashboard.billing.cancelError', 'Error al cancelar'));
        throw err;
      } finally {
        setLoading(null);
      }
    },
    [t]
  );

  const openBillingPortal = useCallback(async (): Promise<void> => {
    setLoading('portal');
    try {
      const data = await apiOpenBillingPortal(window.location.href);
      if (data.error === 'no_billing_account') {
        toast.error(t('dashboard.billing.portalNoAccount', 'No tienes una cuenta de facturación activa'));
        return;
      }
      if (data.error === 'portal_not_configured') {
        toast.error(t('dashboard.billing.portalUnavailable', 'El portal no está disponible. Contacta con info@musicdibs.com'));
        return;
      }
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error(t('dashboard.billing.portalOpenError', 'No se pudo abrir el portal de facturación'));
      }
    } catch (err: any) {
      toast.error(err?.message || t('dashboard.billing.portalOpenError', 'No se pudo abrir el portal de facturación'));
    } finally {
      setLoading(null);
    }
  }, [t]);

  const startYoutubeCheckout = useCallback(
    async (body: YoutubeCheckoutBody, popup: Window | null): Promise<boolean> => {
      setLoading('youtube');
      try {
        const data = await apiStartYoutubeCheckout(body);
        if (!data?.url) throw new Error(t('dashboard.billing.checkoutNoUrl', 'No se recibió URL de pago'));
        if (popup && !popup.closed) {
          popup.location.href = data.url;
        } else {
          try {
            (window.top || window).location.href = data.url;
          } catch {
            window.location.href = data.url;
          }
        }
        return true;
      } catch (err: any) {
        if (popup && !popup.closed) popup.close();
        toast.error(err?.message || t('dashboard.billing.checkoutError', 'Error inesperado'));
        return false;
      } finally {
        setLoading(null);
      }
    },
    [t]
  );

  return {
    loading,
    isLoading: loading !== null,
    startCreditCheckout,
    cancelRenewal,
    openBillingPortal,
    startYoutubeCheckout,
  };
}
