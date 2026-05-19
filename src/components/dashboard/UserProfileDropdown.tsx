import { useEffect, useState } from 'react';
import { Gift, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function UserProfileDropdown() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasRedeemed, setHasRedeemed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!cancelled) setHasRedeemed((count || 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('redeem-coupon', {
        body: { code: trimmed },
      });
      if (error) {
        // Try to extract server-side message from FunctionsHttpError context
        let msg = error.message || 'Error al canjear el cupón';
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        toast.error(msg);
        return;
      }
      if ((data as any)?.success) {
        const granted = (data as any).credits_granted;
        const campaign = (data as any).campaign_name;
        toast.success(`🎉 ¡${granted} crédito${granted === 1 ? '' : 's'} añadido${granted === 1 ? '' : 's'}!`, {
          description: `Campaña: ${campaign}`,
        });
        setCode('');
        setHasRedeemed(true);
        setOpen(false);
      } else if ((data as any)?.error) {
        toast.error((data as any).error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al canjear el cupón');
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (user?.email || 'U').charAt(0).toUpperCase();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Perfil">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
          <UserIcon className="h-4 w-4 mr-2" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => { await signOut(); navigate('/'); }}>
          <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
        </DropdownMenuItem>

        {hasRedeemed === false && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <Gift className="h-3.5 w-3.5" />
                <span>¿Tienes un cupón?</span>
              </div>
              <form onSubmit={handleRedeem} className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="h-8 text-sm uppercase"
                  maxLength={40}
                  disabled={submitting}
                />
                <Button type="submit" size="sm" className="h-8" disabled={submitting || !code.trim()}>
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
                </Button>
              </form>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
