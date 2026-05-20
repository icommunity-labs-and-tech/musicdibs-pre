import { useEffect, useRef, useState } from 'react';
import { Gift, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { useCouponVisibility, useRedeemCoupon } from '@/hooks/useCouponRedemption';

export function UserProfileDropdown() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const { visible: couponVisible, refresh } = useCouponVisibility();
  const { redeem, submitting } = useRedeemCoupon(() => {
    setCode('');
    setOpen(false);
    refresh();
  });

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    await redeem(code);
  };

  const initials = (user?.email || 'U').charAt(0).toUpperCase();

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };
  useEffect(() => () => cancelClose(), []);

  return (
    <div onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={scheduleClose}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Perfil">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
            <UserIcon className="h-4 w-4 mr-2" /> Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={async () => { await signOut(); navigate('/'); }}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </DropdownMenuItem>

          {couponVisible && (
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
    </div>
  );
}
