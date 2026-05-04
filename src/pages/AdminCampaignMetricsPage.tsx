import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { adminApi } from '@/services/adminApi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Megaphone, RefreshCw, Plus, TrendingUp, DollarSign,
  Users, ShoppingBag, BarChart3, Eye, Calendar, Loader2, ArrowUpDown,
} from 'lucide-react';
import HistoricalDataNotice, { normalizeAttribution } from '@/components/admin/HistoricalDataNotice';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type PeriodType = 'week' | 'month' | 'year';
type CouponSortKey = 'roi' | 'cost' | 'conversion';

function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getPeriodLabel(periodType: PeriodType, weekStart?: string, month?: string, year?: string): string {
  if (periodType === 'week' && weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (periodType === 'month' && month && year) {
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  if (periodType === 'year' && year) return year;
  return 'Todo el periodo';
}

const MONTHS = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

export default function AdminCampaignMetricsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [weekStart, setWeekStart] = useState(getWeekMonday(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [detailCampaign, setDetailCampaign] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', type: '', owner: '', cost: '0', coupon_code: '', utm_source: '', utm_medium: '', utm_campaign: '', notes: '' });
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponFilter, setCouponFilter] = useState<'all' | 'influencer' | 'rrss'>('all');
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponSort, setCouponSort] = useState<{ key: CouponSortKey; direction: 'asc' | 'desc' }>({ key: 'roi', direction: 'desc' });
  const [referralRows, setReferralRows] = useState<Array<{ referral_source: string | null; referral_influencer: string | null; referral_detail: string | null; user_id: string }>>([]);
  const [totalProfiles, setTotalProfiles] = useState<number>(0);
  const [influencerCouponUserIds, setInfluencerCouponUserIds] = useState<Set<string>>(new Set());
  const [loadingReferral, setLoadingReferral] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = { periodType };
      if (periodType === 'week') filters.weekStart = weekStart;
      if (periodType === 'month') { filters.month = selectedMonth; filters.year = selectedYear; }
      if (periodType === 'year') filters.year = selectedYear;

      const [metricsRes, catalogRes] = await Promise.all([
        adminApi.getCampaignMetrics(filters),
        adminApi.getCampaignsCatalog(),
      ]);
      setMetrics(metricsRes);
      setCampaigns(catalogRes.campaigns || []);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }, [periodType, weekStart, selectedMonth, selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const { data } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .not('coupon_code', 'is', null)
        .order('current_roi', { ascending: false });
      setCoupons(data || []);
    } catch (e: any) {
      toast.error('Error cargando cupones');
    }
    setLoadingCoupons(false);
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const loadReferral = useCallback(async () => {
    setLoadingReferral(true);
    try {
      const { data: refData } = await supabase
        .from('profiles')
        .select('user_id, referral_source, referral_influencer, referral_detail')
        .not('referral_source', 'is', null);
      const rows = (refData || []) as any[];
      setReferralRows(rows);

      const { count } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true });
      setTotalProfiles(count || 0);

      const influencerIds = rows
        .filter(r => r.referral_source === 'influencer')
        .map(r => r.user_id);
      if (influencerIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('user_id, promotion_code')
          .in('user_id', influencerIds)
          .not('promotion_code', 'is', null);
        setInfluencerCouponUserIds(new Set((ordersData || []).map((o: any) => o.user_id)));
      } else {
        setInfluencerCouponUserIds(new Set());
      }
    } catch (e: any) {
      toast.error('Error cargando atribución por canal');
    }
    setLoadingReferral(false);
  }, []);

  useEffect(() => { loadReferral(); }, [loadReferral]);

  const loadDetail = async (campaignName: string) => {
    if (!campaignName) { toast.error('Campaña sin nombre'); return; }
    setDetailCampaign(campaignName);
    try {
      const filters: any = { periodType, campaign_name: campaignName };
      if (periodType === 'week') filters.weekStart = weekStart;
      if (periodType === 'month') { filters.month = selectedMonth; filters.year = selectedYear; }
      if (periodType === 'year') filters.year = selectedYear;
      const res = await adminApi.getCampaignDetail(campaignName);
      setDetailData(res);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveCampaign = async () => {
    try {
      await adminApi.saveCampaign({
        ...newCampaign,
        cost: parseFloat(newCampaign.cost) || 0,
      });
      toast.success('Campaña creada');
      setShowNewCampaign(false);
      setNewCampaign({ name: '', type: '', owner: '', cost: '0', coupon_code: '', utm_source: '', utm_medium: '', utm_campaign: '', notes: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const navigateWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const campaignRows = (metrics?.campaigns || []).map((c: any) => ({ ...c, campaign_name: normalizeAttribution(c.campaign_name) }));
  const topByRevenue = [...campaignRows].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);
  const topByCustomers = [...campaignRows].sort((a: any, b: any) => b.new_customers - a.new_customers).slice(0, 5);
  const filteredCoupons = coupons.filter(c => couponFilter === 'all' || c.type === couponFilter);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando campañas...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Campañas</h1>
          <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Marketing</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>

          {periodType === 'week' && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigateWeek(-1)}>←</Button>
              <span className="text-xs text-muted-foreground">{getPeriodLabel('week', weekStart)}</span>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigateWeek(1)}>→</Button>
            </div>
          )}
          {periodType === 'month' && (
            <>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
              </Select>
            </>
          )}
          {periodType === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
          </Button>

          <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva campaña</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nueva campaña</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre *</Label><Input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Tipo</Label><Input value={newCampaign.type} onChange={e => setNewCampaign(p => ({ ...p, type: e.target.value }))} placeholder="paid, organic, referral..." /></div>
                  <div><Label>Owner</Label><Input value={newCampaign.owner} onChange={e => setNewCampaign(p => ({ ...p, owner: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Gasto (€)</Label><Input type="number" value={newCampaign.cost} onChange={e => setNewCampaign(p => ({ ...p, cost: e.target.value }))} /></div>
                  <div><Label>Cupón</Label><Input value={newCampaign.coupon_code} onChange={e => setNewCampaign(p => ({ ...p, coupon_code: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>utm_source</Label><Input value={newCampaign.utm_source} onChange={e => setNewCampaign(p => ({ ...p, utm_source: e.target.value }))} /></div>
                  <div><Label>utm_medium</Label><Input value={newCampaign.utm_medium} onChange={e => setNewCampaign(p => ({ ...p, utm_medium: e.target.value }))} /></div>
                  <div><Label>utm_campaign</Label><Input value={newCampaign.utm_campaign} onChange={e => setNewCampaign(p => ({ ...p, utm_campaign: e.target.value }))} /></div>
                </div>
                <div><Label>Notas</Label><Input value={newCampaign.notes} onChange={e => setNewCampaign(p => ({ ...p, notes: e.target.value }))} /></div>
                <Button onClick={handleSaveCampaign} disabled={!newCampaign.name.trim()} className="w-full">Guardar campaña</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Historical data quality notice */}
      <HistoricalDataNotice compact collapsible storageKey="admin-campaigns-notice" />

      {/* Summary KPIs */}
      {metrics?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KpiCard label="Registros atribuidos" value={metrics.summary.attributed_registrations} icon={Users} />
          <KpiCard label="Clientes atribuidos" value={metrics.summary.attributed_customers} icon={ShoppingBag} />
          <KpiCard label="Revenue atribuido" value={`€${metrics.summary.attributed_revenue?.toLocaleString() || 0}`} icon={DollarSign} />
          <KpiCard label="Ad Spend total" value={`€${metrics.summary.total_ad_spend?.toLocaleString() || 0}`} icon={TrendingUp} />
          <KpiCard label="CAC medio" value={`€${metrics.summary.avg_cac?.toFixed(2) || '—'}`} icon={BarChart3} />
          <KpiCard label="ROI medio" value={metrics.summary.avg_roi ? `${(metrics.summary.avg_roi * 100).toFixed(0)}%` : '—'} icon={TrendingUp} />
        </div>
      )}

      {/* Charts: top campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">🏆 Top 5 por Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topByRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="campaign_name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue €" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">👥 Top 5 por Clientes Nuevos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topByCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="campaign_name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="new_customers" fill="hsl(142, 76%, 36%)" name="Clientes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Campaign table */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">📊 Desglose por campaña</CardTitle>
          <CardDescription>Rendimiento de cada campaña en el periodo seleccionado</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead className="text-right">Registrados</TableHead>
                <TableHead className="text-right">Clientes nuevos</TableHead>
                <TableHead className="text-right">Recurrentes</TableHead>
                <TableHead className="text-right">Órdenes</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="text-right">Cupón usos</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignRows.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Sin datos de campaña para este periodo</TableCell></TableRow>
              )}
              {campaignRows.map((c: any) => (
                <TableRow key={c.campaign_name}>
                  <TableCell className="font-medium">{normalizeAttribution(c.campaign_name)}</TableCell>
                  <TableCell className="text-right">{c.registered}</TableCell>
                  <TableCell className="text-right">{c.new_customers}</TableCell>
                  <TableCell className="text-right">{c.returning_customers}</TableCell>
                  <TableCell className="text-right">{c.orders}</TableCell>
                  <TableCell className="text-right font-medium">€{c.revenue?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">€{c.cost?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={c.roi > 0 ? 'default' : 'destructive'} className="text-[10px]">
                      {c.roi !== null ? `${(c.roi * 100).toFixed(0)}%` : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">€{c.cac?.toFixed(2) || '—'}</TableCell>
                  <TableCell className="text-right">{c.coupon_uses || 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => loadDetail(c.campaign_name)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!detailCampaign} onOpenChange={() => { setDetailCampaign(null); setDetailData(null); }}>
        <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>📈 {detailCampaign}</SheetTitle>
          </SheetHeader>
          {!detailData ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Registrados</span><p className="text-lg font-bold">{detailData.registered}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Clientes nuevos</span><p className="text-lg font-bold">{detailData.new_customers}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Revenue</span><p className="text-lg font-bold">€{detailData.revenue?.toLocaleString()}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">CAC</span><p className="text-lg font-bold">€{detailData.cac?.toFixed(2) || '—'}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Conv. Rate</span><p className="text-lg font-bold">{detailData.conversion_rate?.toFixed(1) || 0}%</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Recompra</span><p className="text-lg font-bold">{detailData.repurchase_rate?.toFixed(1) || 0}%</p></div>
              </div>
              {detailData.products && detailData.products.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader><CardTitle className="text-sm">Productos vendidos</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Uds</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {detailData.products.map((p: any) => (
                          <TableRow key={p.product_code}><TableCell>{p.product_code}</TableCell><TableCell className="text-right">{p.units}</TableCell><TableCell className="text-right">€{p.revenue?.toLocaleString()}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sección Cupones e Influencers ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">🎟️ Cupones e Influencers</h2>
            <p className="text-sm text-muted-foreground">Histórico acumulado</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'influencer', 'rrss'] as const).map(f => (
              <Button key={f} variant={couponFilter === f ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setCouponFilter(f)}>
                {f === 'all' ? 'Todos' : f === 'influencer' ? '🎥 Influencers' : '📱 RRSS'}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI cards resumen */}
        {!loadingCoupons && coupons.length > 0 && (() => {
          const influencers = coupons.filter(c => c.type === 'influencer');
          const totalSpend = influencers.reduce((s, c) => s + (parseFloat(c.cost) || 0), 0);
          const totalClients = coupons.reduce((s, c) => s + (c.total_clients || 0), 0);
          const totalReg = coupons.reduce((s, c) => s + (c.total_registrations || 0), 0);
          const bestRoi = coupons.filter(c => c.current_roi > 0).sort((a, b) => b.current_roi - a.current_roi)[0];
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Gasto influencers" value={`€${totalSpend.toLocaleString('es-ES', { minimumFractionDigits: 0 })}`} icon={DollarSign} />
              <KpiCard label="Registros con cupón" value={totalReg} icon={Users} />
              <KpiCard label="Clientes con cupón" value={totalClients} icon={ShoppingBag} />
              <KpiCard label="Mejor ROI" value={bestRoi ? `${bestRoi.coupon_code} · ${(bestRoi.current_roi * 100).toFixed(0)}%` : '—'} icon={TrendingUp} />
            </div>
          );
        })()}

        {/* Gráfico ROI por cupón */}
        {!loadingCoupons && filteredCoupons.length > 0 && (
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">📈 ROI acumulado por cupón</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={filteredCoupons
                    .map(c => ({
                      name: c.coupon_code,
                      roi: parseFloat((c.current_roi * 100).toFixed(0)),
                    }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: any) => [`${v}%`, 'ROI']}
                  />
                  <Bar dataKey="roi" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Tabla 1: Influencers unificada (cupones + referral) ── */}
        {(() => {
          const INFLUENCER_MAP: Record<string, string> = {
            fael: 'fael', gr3go: 'fael', grego: 'fael',
            nico: 'nico', nicolas: 'nico', nicomusic: 'nico',
            matzz: 'matzz', missao: 'missao', christian: 'christian', erika: 'erika',
          };
          const normalizeInfluencer = (s: string | null | undefined) => {
            if (!s) return '';
            const k = s.toLowerCase().replace(/[^a-z0-9]/g, '');
            return INFLUENCER_MAP[k] || k;
          };
          const LABELS: Record<string, string> = {
            fael: 'Fael', nico: 'Nicolas (NicoMusic)', matzz: 'Matzz',
            missao: 'Missao', christian: 'Christian', erika: 'Erika',
          };

          // Conteo de referral por influencer normalizado
          const referralByInfluencer: Record<string, number> = {};
          referralRows
            .filter(r => r.referral_source === 'influencer')
            .forEach(r => {
              const k = normalizeInfluencer(r.referral_influencer);
              if (!k) return;
              referralByInfluencer[k] = (referralByInfluencer[k] || 0) + 1;
            });

          const influencerCoupons = coupons.filter(c => c.type === 'influencer');
          const seenKeys = new Set<string>();

          const unifiedRows = influencerCoupons.map((c: any) => {
            const key = normalizeInfluencer(c.owner);
            seenKeys.add(key);
            const refCount = referralByInfluencer[key] || 0;
            const couponReg = c.total_registrations || 0;
            // Deduplicación aproximada: usar el mayor si hay solapamiento
            const total = refCount + couponReg - Math.min(refCount, couponReg > 0 ? Math.floor(couponReg * 0.5) : 0);
            return {
              key: `coup-${c.id}`,
              label: LABELS[key] || c.owner || c.coupon_code,
              coupon_code: c.coupon_code,
              referral: refCount,
              coupon_reg: couponReg,
              total: Math.max(refCount, couponReg, total),
              clients: c.total_clients || 0,
              roi: parseFloat(c.current_roi) || 0,
              country: c.target_country,
            };
          });

          // Influencers con referral pero sin cupón
          Object.entries(referralByInfluencer).forEach(([k, v]) => {
            if (seenKeys.has(k)) return;
            unifiedRows.push({
              key: `ref-${k}`,
              label: LABELS[k] || k.charAt(0).toUpperCase() + k.slice(1),
              coupon_code: null,
              referral: v,
              coupon_reg: 0,
              total: v,
              clients: 0,
              roi: 0,
              country: null,
            });
          });

          unifiedRows.sort((a, b) => b.total - a.total);

          return (
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="text-base">🎥 Influencers (cupones + referral unificado)</CardTitle>
                <CardDescription>Fusión de datos de cupones de marketing y respuestas del modal de bienvenida</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loadingCoupons || loadingReferral ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando...
                  </div>
                ) : unifiedRows.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">Sin datos de influencers</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Influencer</TableHead>
                        <TableHead>Cupón</TableHead>
                        <TableHead className="text-right">Reg. referral</TableHead>
                        <TableHead className="text-right">Reg. cupón</TableHead>
                        <TableHead className="text-right">Total combinado</TableHead>
                        <TableHead className="text-right">Clientes reales</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead>País</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unifiedRows.map(row => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {row.label}
                              {row.coupon_code && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                                  cupón
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.coupon_code ? (
                              <Badge variant="outline" className="text-[10px]">{row.coupon_code}</Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">{row.referral}</TableCell>
                          <TableCell className="text-right">{row.coupon_reg}</TableCell>
                          <TableCell className="text-right font-semibold">{row.total}</TableCell>
                          <TableCell className="text-right">{row.clients}</TableCell>
                          <TableCell className="text-right">
                            {row.coupon_code ? (
                              <Badge variant={row.roi > 0 ? 'default' : 'destructive'} className="text-[10px]">
                                {row.roi > 0 ? '+' : ''}{(row.roi * 100).toFixed(0)}%
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>{row.country || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Tabla 2: Canales propios (referral sin influencer) ── */}
        {(() => {
          const CHANNEL_LABELS: Record<string, string> = {
            instagram: '📱 Instagram',
            tiktok: '🎵 TikTok',
            google: '🔍 Google',
            friend: '👥 Amigo',
            podcast: '🎙️ Podcast/Blog',
            other: '🔵 Otro',
          };
          const CHANNELS = ['instagram', 'tiktok', 'google', 'friend', 'podcast', 'other'];

          const channelCounts: Record<string, number> = {};
          referralRows.forEach(r => {
            const k = r.referral_source || '';
            if (CHANNELS.includes(k)) {
              channelCounts[k] = (channelCounts[k] || 0) + 1;
            }
          });

          const rrssCoupons = coupons.filter(c => c.type === 'rrss');
          const couponByChannel: Record<string, any> = {};
          rrssCoupons.forEach(c => {
            const src = (c.utm_source || '').toLowerCase();
            if (CHANNELS.includes(src)) couponByChannel[src] = c;
          });

          const channelRows = CHANNELS
            .map(ch => ({
              key: ch,
              label: CHANNEL_LABELS[ch],
              count: channelCounts[ch] || 0,
              coupon: couponByChannel[ch] || null,
            }))
            .filter(r => r.count > 0 || r.coupon)
            .sort((a, b) => b.count - a.count);

          return (
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="text-base">📱 Canales propios (referral sin influencer)</CardTitle>
                <CardDescription>Registros del modal de bienvenida agrupados por canal</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loadingReferral ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando...
                  </div>
                ) : channelRows.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">Sin registros por canales propios</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Canal</TableHead>
                        <TableHead className="text-right">Registros vía referral</TableHead>
                        <TableHead>Cupón RRSS asociado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channelRows.map(row => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell>
                            {row.coupon ? (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                                {row.coupon.coupon_code}
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs flex items-center gap-1"><Icon className="w-3 h-3" />{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
