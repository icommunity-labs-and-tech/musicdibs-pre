import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, Users, UserPlus, Activity, ShieldCheck,
  Music, ShoppingBag, Zap, DollarSign, BarChart3, Target, ShoppingCart,
  Repeat, XCircle, ArrowRightLeft, CheckCircle2, AlertTriangle,
} from 'lucide-react';

interface KpiGridProps {
  metrics: any;
}

function KpiCard({ label, value, icon: Icon, sub, subColor }: {
  label: string; value: string | number; icon: any; sub?: string; subColor?: string;
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
  const periodGross = Number(m.periodGross ?? 0);
  const periodIva = Number(m.periodIva ?? Math.max(0, periodGross - (m.periodRevenue ?? 0) - (m.periodFees ?? 0)));
  const periodFees = Number(m.periodFees ?? 0);
  const periodNet = Number(m.periodRevenue ?? m.totalRevenue ?? 0);
  const feesPending = periodFees === 0 && periodGross > 0;

  const convRate = m.totalUsers > 0
    ? ((m.customersTotal || 0) / m.totalUsers * 100).toFixed(1)
    : m.conversionRate || '0';

  return (
    <div className="space-y-4">
      {/* ── Registrados ── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Registrados
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Registrados totales" value={m.totalUsers} icon={Users} />
          <TrendKpi
            label="Nuevos registros"
            value={m.newUsersThisMonth}
            icon={UserPlus}
            change={m.newUsersChange || 0}
          />
          <KpiCard label="Verificados KYC" value={m.verifiedUsers || 0} icon={ShieldCheck}
            sub={m.totalUsers > 0 ? `${((m.verifiedUsers || 0) / m.totalUsers * 100).toFixed(1)}% del total` : undefined}
          />
          <KpiCard label="Activos (30d)" value={m.activeUsers30d || 0} icon={Activity}
            sub={m.totalUsers > 0 ? `MAU: ${((m.activeUsers30d || 0) / m.totalUsers * 100).toFixed(1)}%` : undefined}
          />
        </div>
      </div>

      {/* ── Clientes ── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5" /> Clientes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Clientes totales" value={m.customersTotal ?? m.activeSubscriptions ?? 0} icon={ShoppingBag} />
          <KpiCard label="Clientes nuevos" value={m.customersNew ?? 0} icon={UserPlus}
            sub="En el periodo"
          />
          <KpiCard label="Clientes recurrentes" value={m.customersReturning ?? 0} icon={Repeat}
            sub="Recompra en periodo"
          />
          <KpiCard label="Tasa registro → cliente" value={`${convRate}%`} icon={ArrowRightLeft}
            sub="Conversión"
          />
          <KpiCard label="Ticket medio" value={`€${m.averageOrderValue ?? m.arpu ?? 0}`} icon={DollarSign}
            sub="AOV del periodo"
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
          />
          <KpiCard
            label="IVA (21%)"
            value={`€${periodIva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={BarChart3}
            sub="Impuesto incluido"
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
                Pre-IVA − Stripe fees
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Volumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Órdenes" value={m.totalOrders ?? 0} icon={ShoppingCart} sub="En el periodo" />
          <KpiCard label="Suscripciones anuales" value={m.unitsSoldAnnual ?? 0} icon={BarChart3}
            sub={m.revenueAnnual ? `€${m.revenueAnnual.toLocaleString()}` : undefined}
          />
          <KpiCard label="Suscripciones mensuales" value={m.unitsSoldMonthly ?? 0} icon={BarChart3}
            sub={m.revenueMonthly ? `€${m.revenueMonthly.toLocaleString()}` : undefined}
          />
          <KpiCard label="Free (individuales + topups)" value={(m.unitsSoldSingle ?? 0) + (m.unitsSoldTopup ?? 0)} icon={Zap}
            sub={`€${((m.revenueSingle ?? 0) + (m.revenueTopup ?? 0)).toLocaleString()}`}
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
          <KpiCard label="Activas" value={m.activeSubscriptions || 0} icon={CheckCircle2} />
          <KpiCard label="Renov. mensuales" value={m.renewalsMonthly ?? 0} icon={Repeat} sub="En el periodo" />
          <KpiCard label="Renov. anuales" value={m.renewalsAnnual ?? 0} icon={Repeat} sub="En el periodo" />
          <TrendKpi label="Churn Rate" value={`${m.churnRate || 0}%`} icon={BarChart3} change={m.churnChange || 0} invertColor />
          <KpiCard label="Cancelaciones" value={m.cancelledThisMonth || 0} icon={XCircle}
            subColor={m.cancelledThisMonth > 0 ? 'text-destructive' : 'text-green-600'}
            sub={m.cancelledThisMonth > 0 ? 'En el periodo' : 'Sin cancelaciones'}
          />
        </div>
      </div>
    </div>
  );
}
