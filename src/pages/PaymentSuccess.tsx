import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const sessionId = searchParams.get('session_id');
    const thankYouDestination = sessionId
      ? `/gracias?type=purchase&session_id=${encodeURIComponent(sessionId)}`
      : '/gracias?type=purchase';

    (async () => {
      const email = sessionStorage.getItem('guest_checkout_email');
      const password = sessionStorage.getItem('guest_checkout_password');

      // Si ya hay sesión activa, ir directo al dashboard
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        sessionStorage.removeItem('guest_checkout_email');
        sessionStorage.removeItem('guest_checkout_password');
        navigate(thankYouDestination, { replace: true });
        return;
      }

      if (email && password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          sessionStorage.removeItem('guest_checkout_email');
          sessionStorage.removeItem('guest_checkout_password');
          navigate(thankYouDestination, { replace: true });
          return;
        }
        console.error('[PaymentSuccess] auto-login failed:', error.message);
      }

      // Fallback: ir al login con mensaje de éxito de pago
      navigate('/login?payment_success=true', { replace: true });
    })();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h1 className="text-xl font-semibold">Activando tu cuenta...</h1>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Estamos procesando tu pago e iniciando sesión automáticamente. Esto solo tardará unos segundos.
      </p>
    </div>
  );
}
