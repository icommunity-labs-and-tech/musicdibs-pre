import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { adminApi } from '@/services/adminApi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, RefreshCw, Gift, TrendingUp } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  campaign_name: string;
  collaborator_name: string | null;
  credits: number;
  redemptions_count: number;
  max_redemptions: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface CouponConversion extends Coupon {
  total_canjes: number;
  compraron: number;
  conversion_pct: number;
  revenue: number;
}

export default function AdminCreditCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [conversions, setConversions] = useState<CouponConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alwaysVisible, setAlwaysVisible] = useState(false);
  const [savingFlag, setSavingFlag] = useState(false);
  const [form, setForm] = useState({
    code: '',
    campaign_name: '',
    collaborator_name: '',
    credits: '1',
    max_redemptions: '',
    expires_at: '',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'coupon_redemption_always_visible')
        .maybeSingle();
      const v = (data?.value as { enabled?: boolean } | null)?.enabled;
      setAlwaysVisible(Boolean(v));
    })();
  }, []);

  const handleToggleAlwaysVisible = async (enabled: boolean) => {
    setSavingFlag(true);
    const prev = alwaysVisible;
    setAlwaysVisible(enabled);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'coupon_redemption_always_visible', value: { enabled } }, { onConflict: 'key' });
    setSavingFlag(false);
    if (error) {
      setAlwaysVisible(prev);
      toast.error('No se pudo guardar el ajuste');
      return;
    }
    toast.success(enabled ? 'Campo de cupón siempre visible' : 'Campo de cupón oculto si ya se canjeó');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ coupons: list }, { conversions: convs }] = await Promise.all([
        adminApi.listCreditCoupons(),
        adminApi.getCreditCouponConversions(),
      ]);
      setCoupons(list || []);
      setConversions(convs || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar cupones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validate = () => {
    const errs: Record<string, string> = {};
    const code = form.code.trim().toUpperCase();
    const campaign = form.campaign_name.trim();
    const credits = parseInt(form.credits);
    const maxRed = form.max_redemptions ? parseInt(form.max_redemptions) : null;

    if (!code) errs.code = 'El código es requerido';
    else if (code.length < 3) errs.code = 'Mínimo 3 caracteres';
    else if (code.length > 32) errs.code = 'Máximo 32 caracteres';
    else if (!/^[A-Z0-9_-]+$/.test(code)) errs.code = 'Solo letras, números, guiones y guiones bajos';
    else if (coupons.some(c => c.code.toUpperCase() === code)) errs.code = 'Ya existe un cupón con ese código';

    if (!campaign) errs.campaign_name = 'El nombre de campaña es requerido';
    else if (campaign.length > 120) errs.campaign_name = 'Máximo 120 caracteres';

    if (!credits || credits < 1) errs.credits = 'Mínimo 1 crédito';
    else if (credits > 10000) errs.credits = 'Máximo 10.000';

    if (maxRed !== null && (isNaN(maxRed) || maxRed < 1)) errs.max_redemptions = 'Debe ser mayor que 0';

    if (form.expires_at) {
      const exp = new Date(form.expires_at);
      if (isNaN(exp.getTime())) errs.expires_at = 'Fecha inválida';
      else if (exp.getTime() < Date.now()) errs.expires_at = 'Debe ser futura';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await adminApi.createCreditCoupon({
        code: form.code.trim().toUpperCase(),
        campaign_name: form.campaign_name.trim(),
        collaborator_name: form.collaborator_name.trim() || null,
        credits: parseInt(form.credits) || 1,
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      });
      toast.success('Cupón regalo creado');
      setShowNew(false);
      setErrors({});
      setForm({ code: '', campaign_name: '', collaborator_name: '', credits: '1', max_redemptions: '', expires_at: '' });
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear cupón';
      if (/duplicate|already exists|unique|23505/i.test(msg)) {
        setErrors(prev => ({ ...prev, code: 'Ya existe un cupón con ese código' }));
        toast.error('Ya existe un cupón con ese código');
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await adminApi.toggleCreditCoupon(coupon.id, !coupon.is_active);
      toast.success(coupon.is_active ? 'Cupón desactivado' : 'Cupón activado');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('es-ES') : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" /> Cupones regalo
          </h1>
          <p className="text-sm text-muted-foreground">Campañas de growth con cupones de créditos gratuitos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refrescar
          </Button>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nuevo cupón</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo cupón regalo</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Código del cupón</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => { setForm(f => ({ ...f, code: e.target.value.replace(/\s+/g, '').toUpperCase() })); if (errors.code) setErrors(p => ({ ...p, code: '' })); }}
                    onBlur={(e) => setForm(f => ({ ...f, code: e.target.value.trim().toUpperCase() }))}
                    placeholder="REGALO10"
                    maxLength={32}
                    aria-invalid={!!errors.code}
                  />
                  {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
                </div>
                <div>
                  <Label>Nombre de campaña</Label>
                  <Input
                    value={form.campaign_name}
                    onChange={(e) => { setForm(f => ({ ...f, campaign_name: e.target.value })); if (errors.campaign_name) setErrors(p => ({ ...p, campaign_name: '' })); }}
                    onBlur={(e) => setForm(f => ({ ...f, campaign_name: e.target.value.trim() }))}
                    placeholder="Reto Canciones Mayo"
                    maxLength={120}
                    aria-invalid={!!errors.campaign_name}
                  />
                  {errors.campaign_name && <p className="text-xs text-destructive mt-1">{errors.campaign_name}</p>}
                </div>
                <div>
                  <Label>Colaborador (opcional)</Label>
                  <Input
                    value={form.collaborator_name}
                    onChange={(e) => setForm(f => ({ ...f, collaborator_name: e.target.value }))}
                    onBlur={(e) => setForm(f => ({ ...f, collaborator_name: e.target.value.trim() }))}
                    placeholder="Academia Juan Pérez"
                    maxLength={120}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Créditos</Label>
                    <Input type="number" min={1} max={10000} value={form.credits}
                      onChange={(e) => { setForm(f => ({ ...f, credits: e.target.value })); if (errors.credits) setErrors(p => ({ ...p, credits: '' })); }}
                      aria-invalid={!!errors.credits}
                    />
                    {errors.credits && <p className="text-xs text-destructive mt-1">{errors.credits}</p>}
                  </div>
                  <div>
                    <Label>Máximo usos</Label>
                    <Input type="number" min={1} value={form.max_redemptions}
                      onChange={(e) => { setForm(f => ({ ...f, max_redemptions: e.target.value })); if (errors.max_redemptions) setErrors(p => ({ ...p, max_redemptions: '' })); }}
                      placeholder="Ilimitado"
                      aria-invalid={!!errors.max_redemptions}
                    />
                    {errors.max_redemptions && <p className="text-xs text-destructive mt-1">{errors.max_redemptions}</p>}
                  </div>
                </div>
                <div>
                  <Label>Fecha de expiración</Label>
                  <Input type="datetime-local" value={form.expires_at}
                    onChange={(e) => { setForm(f => ({ ...f, expires_at: e.target.value })); if (errors.expires_at) setErrors(p => ({ ...p, expires_at: '' })); }}
                    aria-invalid={!!errors.expires_at}
                  />
                  {errors.expires_at && <p className="text-xs text-destructive mt-1">{errors.expires_at}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNew(false)} disabled={submitting}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cupones</CardTitle>
          <CardDescription>Gestión de cupones activos e inactivos.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No hay cupones todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Canjes / Máx</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{c.campaign_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.collaborator_name || '—'}</TableCell>
                    <TableCell>{c.credits}</TableCell>
                    <TableCell>{c.redemptions_count} / {c.max_redemptions ?? '∞'}</TableCell>
                    <TableCell>{fmtDate(c.expires_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={c.is_active} onCheckedChange={() => handleToggle(c)} />
                        <Badge variant={c.is_active ? 'default' : 'secondary'}>
                          {c.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Métricas de conversión</CardTitle>
          <CardDescription>Usuarios que compraron después de canjear el cupón.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : conversions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin datos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Colab.</TableHead>
                  <TableHead>Canjes</TableHead>
                  <TableHead>Compraron</TableHead>
                  <TableHead>% Conv.</TableHead>
                  <TableHead>Revenue €</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.code}</TableCell>
                    <TableCell>{c.campaign_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.collaborator_name || '—'}</TableCell>
                    <TableCell>{c.total_canjes}</TableCell>
                    <TableCell>{c.compraron}</TableCell>
                    <TableCell>
                      <Badge variant={c.conversion_pct >= 10 ? 'default' : 'secondary'}>
                        {c.conversion_pct}%
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{c.revenue.toFixed(2)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
