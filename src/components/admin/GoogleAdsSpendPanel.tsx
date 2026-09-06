import { AlertCircle, BarChart3, CalendarClock, DollarSign, MousePointerClick, Target, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

type CampaignSpend = {
  campaign_name: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
};

type ObjectiveConversions = {
  objective: string;
  conversions: number;
  value?: number;
};

// Objetivos que cuentan como conversión real del negocio (registro, lead, compra).
// El resto (vistas de página clave, engagement de YouTube…) son acciones de observación.
const PRIMARY_OBJECTIVES = new Set([
  'Compra Musicdibs',
  'Registro Musicdibs',
  'Lead registro de obra',
]);

const isPrimaryObjective = (objective: string) => PRIMARY_OBJECTIVES.has(objective);

export type GoogleAdsSpendData = {
  campaign_spend: CampaignSpend[];
  objective_conversions: ObjectiveConversions[];
  last_14_days?: {
    total_conversions: number;
    total_value: number;
    by_objective: Array<{ objective: string; conversions: number; value: number }>;
  };
  currency: string;
  range: { start: string; end: string };
  refreshed_at: string;
};

type Props = {
  data: GoogleAdsSpendData | null;
  loading: boolean;
  error: string | null;
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value);

export function GoogleAdsSpendPanel({ data, loading, error }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Gasto real de Google Ads</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Gasto real de Google Ads</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalSpend = data.campaign_spend.reduce((sum, row) => sum + row.spend, 0);
  const totalClicks = data.campaign_spend.reduce((sum, row) => sum + row.clicks, 0);
  const totalImpressions = data.campaign_spend.reduce((sum, row) => sum + row.impressions, 0);
  const totalConvValue = data.objective_conversions.reduce((sum, row) => sum + (row.value ?? 0), 0);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const roi = totalSpend > 0 ? ((totalConvValue - totalSpend) / totalSpend) * 100 : null;
  const roas = totalSpend > 0 ? totalConvValue / totalSpend : null;
  const primaryConversions = data.objective_conversions.filter((row) => isPrimaryObjective(row.objective));
  const secondaryConversions = data.objective_conversions.filter((row) => !isPrimaryObjective(row.objective));
  const totalPrimary = primaryConversions.reduce((sum, row) => sum + row.conversions, 0);
  const totalSecondary = secondaryConversions.reduce((sum, row) => sum + row.conversions, 0);
  const totalActions = totalPrimary + totalSecondary;
  const primaryRate = totalActions > 0 ? Math.round((totalPrimary / totalActions) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Gasto real de Google Ads
            <Badge variant="secondary" className="text-[10px]">{data.currency}</Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">Periodo seleccionado</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Separamos las conversiones que realmente importan (registros, leads y compras) de las visitas y acciones de observación.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Metric label="Gasto total" value={money(totalSpend, data.currency)} icon={<DollarSign className="h-3.5 w-3.5" />} />
          <Metric label="Clics" value={totalClicks.toLocaleString('es-ES')} icon={<MousePointerClick className="h-3.5 w-3.5" />} />
          <Metric label="Impresiones" value={totalImpressions.toLocaleString('es-ES')} icon={<Users className="h-3.5 w-3.5" />} />
          <Metric label="Acciones totales" value={totalActions.toLocaleString('es-ES')} icon={<BarChart3 className="h-3.5 w-3.5" />} />
          <Metric label="CPC medio" value={money(avgCpc, data.currency)} icon={<MousePointerClick className="h-3.5 w-3.5" />} />
          <Metric
            label={roi !== null ? `ROI (ROAS ${roas!.toFixed(2)}x)` : 'ROI'}
            value={roi !== null ? `${roi >= 0 ? '+' : ''}${Math.round(roi).toLocaleString('es-ES')} %` : '—'}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
        </div>
        <p className="text-[11px] text-muted-foreground -mt-3">
          ROI calculado con el valor de conversión que registra Google Ads en el periodo ({money(totalConvValue, data.currency)}): incluye valores reales de compra y valores estimados de registro/lead.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Conversiones principales
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                  {totalPrimary.toLocaleString('es-ES')}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100">
                {primaryRate} % del total
              </Badge>
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
              Registros, leads de obra y compras. Estas acciones optimizan el negocio.
            </p>
            <div className="max-h-44 overflow-y-auto">
              {primaryConversions.length === 0 ? <Empty /> : primaryConversions.map((row) => (
                <div key={row.objective} className="flex items-center justify-between gap-4 border-b last:border-0 border-emerald-200/60 dark:border-emerald-800/40 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-emerald-900 dark:text-emerald-200">{row.objective}</span>
                  <span className="shrink-0 font-semibold text-emerald-800 dark:text-emerald-300">{row.conversions.toLocaleString('es-ES')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  Visitas y acciones secundarias
                </p>
                <p className="text-2xl font-bold mt-1">
                  {totalSecondary.toLocaleString('es-ES')}
                </p>
              </div>
              <Badge variant="secondary">
                {totalActions > 0 ? Math.round((totalSecondary / totalActions) * 100) : 0} % del total
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Vistas de página clave, engagement de YouTube y otras acciones de observación.
            </p>
            <div className="max-h-44 overflow-y-auto">
              {secondaryConversions.length === 0 ? <Empty /> : secondaryConversions.map((row) => (
                <div key={row.objective} className="flex items-center justify-between gap-4 border-b last:border-0 py-2 text-sm">
                  <span className="min-w-0 truncate text-muted-foreground">{row.objective}</span>
                  <span className="shrink-0 font-medium text-muted-foreground">{row.conversions.toLocaleString('es-ES')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Gasto por campaña</p>
          <div className="max-h-56 overflow-y-auto">
            {data.campaign_spend.length === 0 ? <Empty /> : data.campaign_spend.map((row) => (
              <div key={row.campaign_name} className="flex items-center justify-between gap-4 border-b last:border-0 py-2 text-sm">
                <span className="min-w-0 truncate">{row.campaign_name}</span>
                <span className="shrink-0 font-medium">{money(row.spend, data.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {data.last_14_days && (
          <div className="rounded-md border bg-muted/10 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                Ventana de conversión de 14 días
              </p>
              <span className="text-xs text-muted-foreground">Últimos 14 días, independiente del periodo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Metric
                label="Conversiones principales"
                value={data.last_14_days.by_objective.filter((row) => isPrimaryObjective(row.objective)).reduce((sum, row) => sum + row.conversions, 0).toLocaleString('es-ES')}
                icon={<Target className="h-3.5 w-3.5 text-emerald-600" />}
              />
              <Metric
                label="Visitas / secundarias"
                value={data.last_14_days.by_objective.filter((row) => !isPrimaryObjective(row.objective)).reduce((sum, row) => sum + row.conversions, 0).toLocaleString('es-ES')}
                icon={<MousePointerClick className="h-3.5 w-3.5" />}
              />
              <Metric label="Valor conversiones" value={money(data.last_14_days.total_value, data.currency)} icon={<DollarSign className="h-3.5 w-3.5" />} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Distribución principal vs. visitas</span>
                <span>{primaryRate} % principal</span>
              </div>
              <Progress value={primaryRate} className="h-2" />
            </div>

            <div className="max-h-40 overflow-y-auto">
              {data.last_14_days.by_objective.length === 0 ? <Empty /> : data.last_14_days.by_objective.map((row) => (
                <div key={row.objective} className="flex items-center justify-between gap-4 border-b last:border-0 py-2 text-sm">
                  <span className={`min-w-0 truncate ${isPrimaryObjective(row.objective) ? 'font-medium' : 'text-muted-foreground'}`}>
                    {row.objective}
                    {!isPrimaryObjective(row.objective) && (
                      <Badge variant="outline" className="ml-2 text-[10px] font-normal">visita</Badge>
                    )}
                  </span>
                  <span className="shrink-0 font-medium">
                    {row.conversions.toLocaleString('es-ES')}
                    <span className="ml-2 text-xs text-muted-foreground">{money(row.value, data.currency)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-sm text-muted-foreground">Sin datos en este periodo</p>;
}
