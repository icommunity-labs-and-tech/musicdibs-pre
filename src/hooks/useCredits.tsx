import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prevCreditsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('available_credits')
        .eq('user_id', user.id)
        .single();
      if (error) {
        // Si la consulta falla, no bloqueamos al usuario: hasEnough devuelve true
        // cuando credits===null. El servidor (spend-credits) validará antes de procesar.
        console.error('[useCredits] Error al cargar créditos:', error.message);
      } else if (data) {
        const c = data.available_credits ?? 0;
        setCredits(c);
        prevCreditsRef.current = c;
      } else {
        setCredits(0);
        prevCreditsRef.current = 0;
      }
      setIsLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`credits-hook-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const c = (payload.new as any).available_credits;
        if (typeof c === 'number') {
          const prev = prevCreditsRef.current;
          setCredits(c);
          prevCreditsRef.current = c;

          // Toast when credits reach 0 after a deduction
          if (c === 0 && prev !== null && prev > 0) {
            toast.warning('Te has quedado sin créditos', {
              description: 'Compra más créditos para seguir usando las herramientas.',
              action: {
                label: 'Comprar',
                onClick: () => window.location.href = '/creditos',
              },
              duration: 8000,
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // credits===null indica que la consulta no ha cargado o falló.
  // En ese caso no bloqueamos: el servidor validará antes de gastar créditos.
  // Solo bloqueamos si sabemos con certeza que credits < cost.
  const hasEnough = (cost: number) => credits === null ? true : credits >= cost;

  return { credits, hasEnough, isLoading };
}
