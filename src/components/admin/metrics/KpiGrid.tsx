import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, Users, UserPlus, Activity, ShieldCheck,
  ShoppingBag, Zap, DollarSign, BarChart3, Target, ShoppingCart,
  Repeat, XCircle, ArrowRightLeft, CheckCircle2, AlertTriangle, Gift, Minus,
} from 'lucide-react';

interface KpiGridProps {
  metrics: any;
}

function computeChange(current: number, prev: number): number | null {
  if (!isFinite(current) || !isFinite(prev)) return null;
  if (prev === 0 && current === 0) return 0;
  if (prev === 0) return null; // sin base comparable
  return parseFloat((((current - prev) / Math.abs(prev)) * 100).toFixed(1));
}

function DeltaChip({ change, invertColor }: { change: number | null; invertColor?: boolean }) {
  if (change === null) {
    return (
      <div className="text-xs flex items-center gap-1 mt-1 text-muted-foreground">
        <Minus className="w-3 h-3" /> — vs anterior
      </div>
    );
  }
  const isPositive = invertColor ? change <= 0 : change >= 0;
  const Icon = change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  return (
    <div className={`text-xs flex items-center gap-1 mt-1 ${change === 0 ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <Icon className="w-3 h-3" />
      {change > 0 ? '+' : ''}{change}% vs anterior
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, sub, subColor, change, invertColor }: {
  label: string;
  value: string | number;
  icon: any;
  sub?: string;
  subColor?: string;
  change?: number | null;
  invertColor?: boolean;
}) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-bold">{value}</span>
        {sub && (
          <div className={`text-xs mt-1 ${subColor || 'text-muted-foreground'}`}>
            {sub}
          </div>
        )}
        {change !== undefined && <DeltaChip change={change ?? null} invertColor={invertColor} />}
      </CardContent>
    </Card>
  );
}

function TrendKpi({ label, value, icon: Icon, change, suffix, invertColor }: {
  label: string; value: string | number; icon: any; change: number; suffix?: string; invertColor?: boolean;
}) {
  const isPositive = invertColor ? change <= 0 : change >= 0;
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-bold">{value}</span>
        <div className={`text-xs flex items-center gap-1 mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />
          }
          {change >= 0 ? '+' : ''}{change}% {suffix || 'vs anterior'}
        </div>
      </CardContent>
    </Card>
  );
}

export default function KpiGrid({ metrics }: KpiGridProps) {
  const m = metrics;
  const prev = (m.prev || {}) as Record<string, number>;
  const roundCurrency = (value: number) => Math.round(value * 100) / 100;
  const revenueSeries = Array.isArray(m.timeSeries?.revenue) ? m.timeSeries.revenue : [];
  const hasSeriesBreakdown = revenueSeries.some(
    (point: { gross?: unknown; iva?: unknown; fee?: unknown }) => point.gross != null || point.iva != null || point.fee != null,
  );
  const seriesTotals = revenueSeries.reduce(
    (acc: { gross: number; iva: number; fees: number }, point: { gross?: unknown; iva?: unknown; fee?: unknown }) => ({
      gross: acc.gross + (Number(point.gross) || 0),
      iva: acc.iva + (Number(point.iva) || 0),
      fees: acc.fees + (Number(point.fee) || 0),
    }),
    { gross: 0, iva: 0, fees: 0 },
  );
  const periodGross = roundCurrency(hasSeriesBreakdown ? seriesTotals.gross : Number(m.periodGross ?? 0));
  const periodIva = roundCurrency(hasSeriesBreakdown
    ? seriesTotals.iva
    : Number(m.periodIva ?? Math.max(0, periodGross - (m.periodRevenue ?? 0) - (m.periodFees ?? 0))));
  const periodFees = roundCurrency(hasSeriesBreakdown ? seriesTotals.fees : Number(m.periodFees ?? 0));
  // Neto real = Bruto − IVA − comisiones Stripe (debe cuadrar con las tarjetas mostradas)
  const periodNet = roundCurrency(periodGross - periodIva - periodFees);
  const feesPending = periodFees === 0 && periodGross > 0;

  // Conversión del periodo: clientes nuevos / registrados nuevos del periodo
  const newUsersThisPeriod = Number(m.newUsersThisMonth || 0);
  const convRate = newUsersThisPeriod > 0
    ? ((m.customersNew || 0) / newUsersThisPeriod * 100)
    : 0;
  const prevConvRate = (prev.newUsersThisMonth || 0) > 0
    ? ((prev.customersNew || 0) / (prev.newUsersThisMonth || 0) * 100)
    : 0;

  const wcUsers = Number(m.welcomeCreditUsers ?? 0);
  const wcConv = Number(m.welcomeCreditConverted ?? 0);
  const wcNet = Number(m.welcomeCreditNetRevenue ?? 0);
  const wcRate = wcUsers > 0 ? (wcConv / wcUsers) * 100 : 0;

  const singleTopup = (m.unitsSoldSingle ?? 0) + (m.unitsSoldTopup ?? 0);
  const prevSingleTopup = (prev.unitsSoldSingle ?? 0) + (prev.unitsSoldTopup ?? 0);

  return (
    <div className="space-y-4">
      {/* ── Registrados ── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Registrados
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Registrados totales" value={m.totalUsers} icon={Users}
            change={computeChange(Number(m.totalUsers ?? 0), Number(prev.totalUsers ?? 0))}
          />
          <TrendKpi
            label="Nuevos registros"
            value={m.newUsersThisMonth}
            icon={UserPlus}
            change={m.newUsersChange || 0}
          />
          <KpiCard label="Verificados KYC" value={m.verifiedUsers || 0} icon={ShieldCheck}
            sub={m.totalUsers > 0 ? `${((m.verifiedUsers || 0) / m.totalUsers * 100).toFixed(1)}% del total` : undefined}
            change={computeChange(Number(m.verifiedUsers ?? 0), Number(prev.verifiedUsers ?? 0))}
          />
          <KpiCard label="Activos (30d)" value={m.activeUsers30d || 0} icon={Activity}
            sub={m.totalUsers > 0 ? `MAU: ${((m.activeUsers30d || 0) / m.totalUsers * 100).toFixed(1)}%` : undefined}
            change={computeChange(Number(m.activeUsers30d ?? 0), Number(prev.activeUsers30d ?? 0))}
          />
        </div>

      </div>

      {/* ── Clientes ── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5" /> Clientes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <KpiCard label="Clientes totales" value={m.customersTotal ?? m.activeSubscriptions ?? 0} icon={ShoppingBag}
            change={computeChange(Number(m.customersTotal ?? m.activeSubscriptions ?? 0), Number(prev.customersTotal ?? 0))}
          />

          <KpiCard label="Clientes nuevos" value={m.customersNew ?? 0} icon={UserPlus}
            sub="En el periodo"
            change={computeChange(Number(m.customersNew ?? 0), Number(prev.customersNew ?? 0))}
          />
          <KpiCard label="Clientes recurrentes" value={m.customersReturning ?? 0} icon={Repeat}
            sub="Recompra en periodo"
            change={computeChange(Number(m.customersReturning ?? 0), Number(prev.customersReturning ?? 0))}
          />
          <KpiCard label="Tasa registro → cliente" value={`${convRate.toFixed(1)}%`} icon={ArrowRightLeft}
            sub="Conversión"
            change={computeChange(convRate, prevConvRate)}
          />
          <KpiCard label="Ticket medio" value={`€${m.averageOrderValue ?? m.arpu ?? 0}`} icon={DollarSign}
            sub="AOV del periodo"
            change={computeChange(Number(m.averageOrderValue ?? 0), Number(prev.averageOrderValue ?? 0))}
          />
          <KpiCard
            label="Conv. crédito regalo"
            value={`${wcRate.toFixed(1)}%`}
            icon={Gift}
            sub={`${wcConv}/${wcUsers} usaron · €${wcNet.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} neto`}
            change={computeChange(wcRate, Number(prev.welcomeCreditRate ?? 0))}
          />
        </div>
      </div>

      {/* ── Ventas ── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" /> Ventas
        </h3>
        {/* Revenue breakdown stack */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <KpiCard
            label="Bruto"
            value={`€${periodGross.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            sub="Total facturado"
            change={computeChange(periodGross, Number(prev.periodGross ?? 0))}
          />
          <KpiCard
            label="IVA (Stripe)"
            value={`€${periodIva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={BarChart3}
            sub="Impuesto leído de Stripe"
            change={computeChange(periodIva, Number(prev.periodIva ?? 0))}
          />
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Comisiones Stripe
                {feesPending && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="w-3 h-3 text-amber-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Datos pendientes de sincronización con Stripe</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                €{periodFees.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className={`text-xs mt-1 ${feesPending ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {feesPending ? 'Pendiente sincronización' : 'Descontado del neto'}
              </div>
              <DeltaChip
                change={computeChange(periodFees, Number(prev.periodFees ?? 0))}
                invertColor
              />
            </CardContent>
          </Card>
          <Card className="border-green-500/40 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs flex items-center gap-1 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Neto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                €{periodNet.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="text-xs mt-1 text-green-700/70 dark:text-green-400/70">
                Bruto − IVA − Stripe fees
              </div>
              <DeltaChip change={computeChange(periodNet, Number(prev.periodNet ?? 0))} />
            </CardContent>
          </Card>
        </div>
        {/* Volumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Órdenes" value={m.totalOrders ?? 0} icon={ShoppingCart} sub="En el periodo"
            change={computeChange(Number(m.totalOrders ?? 0), Number(prev.totalOrders ?? 0))}
          />
          <KpiCard label="Suscripciones anuales" value={m.unitsSoldAnnual ?? 0} icon={BarChart3}
            sub={m.revenueAnnual ? `€${m.revenueAnnual.toLocaleString()}` : undefined}
            change={computeChange(Number(m.unitsSoldAnnual ?? 0), Number(prev.unitsSoldAnnual ?? 0))}
          />
          <KpiCard label="Suscripciones mensuales" value={m.unitsSoldMonthly ?? 0} icon={BarChart3}
            sub={m.revenueMonthly ? `€${m.revenueMonthly.toLocaleString()}` : undefined}
            change={computeChange(Number(m.unitsSoldMonthly ?? 0), Number(prev.unitsSoldMonthly ?? 0))}
          />
          <KpiCard label="Free (individuales + topups)" value={singleTopup} icon={Zap}
            sub={`€${((m.revenueSingle ?? 0) + (m.revenueTopup ?? 0)).toLocaleString()}`}
            change={computeChange(singleTopup, prevSingleTopup)}
          />
        </div>
      </div>

      {/* ── Suscripciones ── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Suscripciones
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <TrendKpi label="MRR" value={`€${(m.mrr || 0).toLocaleString()}`} icon={DollarSign} change={m.mrrChange || 0} />
          <KpiCard label="Activas" value={m.activeSubscriptions || 0} icon={CheckCircle2}
            change={computeChange(Number(m.activeSubscriptions ?? 0), Number(prev.activeSubscriptions ?? 0))}
          />

          <KpiCard label="Renov. mensuales" value={m.renewalsMonthly ?? 0} icon={Repeat} sub="En el periodo"
            change={computeChange(Number(m.renewalsMonthly ?? 0), Number(prev.renewalsMonthly ?? 0))}
          />
          <KpiCard label="Renov. anuales" value={m.renewalsAnnual ?? 0} icon={Repeat} sub="En el periodo"
            change={computeChange(Number(m.renewalsAnnual ?? 0), Number(prev.renewalsAnnual ?? 0))}
          />
          <TrendKpi label="Churn Rate" value={`${m.churnRate || 0}%`} icon={BarChart3} change={m.churnChange || 0} invertColor />
          <KpiCard label="Cancelaciones" value={m.cancelledThisMonth || 0} icon={XCircle}
            subColor={m.cancelledThisMonth > 0 ? 'text-destructive' : 'text-green-600'}
            sub={m.cancelledThisMonth > 0 ? 'En el periodo' : 'Sin cancelaciones'}
            change={computeChange(Number(m.cancelledThisMonth ?? 0), Number(prev.cancelledThisMonth ?? 0))}
            invertColor
          />
        </div>
      </div>
    </div>
  );
}
