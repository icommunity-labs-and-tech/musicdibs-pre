import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface MetricsChartsProps {
  metrics: any;
  periodType?: 'week' | 'month' | 'year';
}

export default function MetricsCharts({ metrics, periodType = 'month' }: MetricsChartsProps) {
  const m = metrics;

  // Use timeSeries if available (period-aware), fall back to legacy arrays
  const revenueTimeSeries = m.timeSeries?.revenue ?? m.mrrEvolution ?? [];
  const userAcquisitionSeries = (m.timeSeries?.userAcquisition && m.timeSeries.userAcquisition.length > 0)
    ? m.timeSeries.userAcquisition
    : (m.userAcquisition ?? []).map((u: any) => ({ label: u.month, newUsers: u.newUsers, activeUsers: u.activeUsers }));
  const productSeries = (m.timeSeries?.productBreakdown && m.timeSeries.productBreakdown.length > 0)
    ? m.timeSeries.productBreakdown
    : [];

  const periodRevenueSum = revenueTimeSeries.reduce(
    (sum: number, p: any) => sum + (Number(p.value ?? p.mrr ?? 0) || 0),
    0,
  );
  const periodRevenue = m.periodRevenue ?? periodRevenueSum;
  const periodUnits = (m.unitsSoldAnnual ?? 0) + (m.unitsSoldMonthly ?? 0) + (m.unitsSoldSingle ?? 0) + (m.unitsSoldTopup ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Evolution */}
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">📈 Revenue</CardTitle>
                {m._dataSource === "stripe_real" && (
                  <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-500">Stripe Live</Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">€{Math.round(periodRevenueSum).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total del periodo</p>
              </div>
            </div>
            <CardDescription>Ingresos en el periodo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueTimeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} name="Revenue €" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Churn Rate Evolution */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">📉 Churn Rate</CardTitle>
            <CardDescription>Evolución de cancelaciones (últimos 12 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={m.churnEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`${v}%`, 'Churn']} />
                <Line type="monotone" dataKey="churn" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ fill: 'hsl(0, 84%, 60%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders / User Acquisition */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">👥 Registros y Clientes</CardTitle>
            <CardDescription>Nuevos registros vs activos del periodo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={userAcquisitionSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="newUsers" fill="hsl(142, 76%, 36%)" name="Nuevos registros" />
                <Bar dataKey="activeUsers" fill="hsl(217, 91%, 60%)" name="Activos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Units by Product Type */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">📦 Ventas por Producto</CardTitle>
            <CardDescription>
              {productSeries.length > 0 ? 'Unidades por producto a lo largo del periodo' : 'Unidades vendidas en el periodo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              {productSeries.length > 0 ? (
                <BarChart data={productSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="annual" stackId="a" fill="hsl(262, 83%, 58%)" name="Anual" />
                  <Bar dataKey="monthly" stackId="a" fill="hsl(217, 91%, 60%)" name="Mensual" />
                  <Bar dataKey="single" stackId="a" fill="hsl(142, 76%, 36%)" name="Single" />
                  <Bar dataKey="topup" stackId="a" fill="hsl(38, 92%, 50%)" name="Topup" />
                </BarChart>
              ) : (
                <BarChart data={m.productBreakdown || m.featureUsage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="units" fill="hsl(var(--primary))" name="Unidades" />
                  <Bar dataKey="uses" fill="hsl(var(--primary))" name="Usos" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">💳 Revenue por Tipo</CardTitle>
              <CardDescription>Distribución de ingresos por tipo de producto en el periodo</CardDescription>
            </div>
            <div className="text-right flex items-start gap-6">
              <div>
                <p className="text-2xl font-bold">{periodUnits.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Ventas del periodo</p>
              </div>
              <div>
                <p className="text-2xl font-bold">€{Math.round(periodRevenue).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Revenue del periodo</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RevenueBar label="Anual" value={m.revenueAnnual ?? 0} percent={periodRevenue > 0 ? Math.round(((m.revenueAnnual ?? 0) / periodRevenue) * 100) : 0} gradient="from-violet-500 to-purple-600" />
            <RevenueBar label="Mensual" value={m.revenueMonthly ?? 0} percent={periodRevenue > 0 ? Math.round(((m.revenueMonthly ?? 0) / periodRevenue) * 100) : 0} gradient="from-blue-500 to-cyan-600" />
            <RevenueBar label="Singles / Topups" value={(m.revenueSingle ?? 0) + (m.revenueTopup ?? 0)} percent={periodRevenue > 0 ? Math.round((((m.revenueSingle ?? 0) + (m.revenueTopup ?? 0)) / periodRevenue) * 100) : 0} gradient="from-emerald-500 to-teal-600" sub="Compras únicas" />
          </div>

          <Separator className="my-4" />

          {/* Revenue Concentration */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
            <p className="text-xs font-medium mb-3">📍 Revenue Concentration</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Plan más usado</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{m.topPlanName || 'N/A'}</Badge>
                  <span className="font-medium">{m.topPlanPercentage || 0}% usuarios</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Suscripciones activas</span>
                <p className="text-lg font-bold mt-0.5">{m.activeSubscriptions || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Canceladas en periodo</span>
                <p className={`text-lg font-bold mt-0.5 ${(m.cancelledThisMonth || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {m.cancelledThisMonth || 0}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Top plan % revenue</span>
                <p className="text-lg font-bold mt-0.5">{m.top10RevenuePercentage || 0}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueBar({ label, value, percent, gradient, sub }: {
  label: string; value: number; percent: number; gradient: string; sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{label}</Badge>
          <span className="text-sm font-medium">€{value.toLocaleString()}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {sub || `${percent}% del total`}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className={`bg-gradient-to-r ${gradient} h-3 rounded-full transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
