import { useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCouponVisibility, useRedeemCoupon } from '@/hooks/useCouponRedemption';

export function CouponRedeemButton() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const { visible, refresh } = useCouponVisibility();
  const { redeem, submitting } = useRedeemCoupon(() => {
    setCode('');
    setOpen(false);
    refresh();
  });

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    await redeem(code);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden md:inline-flex h-8 text-xs rounded-full px-3 gap-1.5"
          aria-label="Canjear cupón"
        >
          <Gift className="h-3.5 w-3.5" />
          Cupón
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Gift className="h-3.5 w-3.5" />
          <span>🎁 Cupones regalo</span>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            className="h-8 text-sm uppercase"
            maxLength={40}
            disabled={submitting}
            autoFocus
          />
          <Button type="submit" size="sm" className="h-8" disabled={submitting || !code.trim()}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
