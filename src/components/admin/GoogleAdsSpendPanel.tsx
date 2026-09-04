import { AlertCircle, BarChart3, CalendarClock, DollarSign, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const primaryConversions = data.objective_conversions.filter((row) => isPrimaryObjective(row.objective));
  const secondaryConversions = data.objective_conversions.filter((row) => !isPrimaryObjective(row.objective));
  const totalPrimary = primaryConversions.reduce((sum, row) => sum + row.conversions, 0);
  const totalSecondary = secondaryConversions.reduce((sum, row) => sum + row.conversions, 0);

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
          El gasto se muestra por campaña. Las conversiones principales son registros, leads y compras; las secundarias son visitas a páginas clave y otras acciones de observación.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Gasto total" value={money(totalSpend, data.currency)} icon={<DollarSign className="h-3.5 w-3.5" />} />
          <Metric label="Conversiones principales" value={totalPrimary.toLocaleString('es-ES')} icon={<Target className="h-3.5 w-3.5" />} />
          <Metric label="Clics" value={totalClicks.toLocaleString('es-ES')} />
          <Metric label="Impresiones" value={totalImpressions.toLocaleString('es-ES')} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DataList title="Gasto por campaña">
            {data.campaign_spend.length === 0 ? <Empty /> : data.campaign_spend.map((row) => (
              <div key={row.campaign_name} className="flex items-center justify-between gap-4 border-b last:border-0 py-2 text-sm">
                <span className="min-w-0 truncate">{row.campaign_name}</span>
                <span className="shrink-0 font-medium">{money(row.spend, data.currency)}</span>
              </div>
            ))}
          </DataList>
          <DataList title={`Conversiones principales (${totalPrimary.toLocaleString('es-ES')})`}>
            {primaryConversions.length === 0 ? <Empty /> : primaryConversions.map((row) => (
              <div key={row.objective} className="flex items-center justify-between gap-4 border-b last:border-0 py-2 text-sm">
                <span className="min-w-0 truncate">{row.objective}</span>
                <span className="shrink-0 font-medium">{row.conversions.toLocaleString('es-ES')}</span>
              </div>
            ))}
          </DataList>
          <DataList title={`Acciones secundarias · visitas y observación (${totalSecondary.toLocaleString('es-ES')})`}>
            {secondaryConversions.length === 0 ? <Empty /> : secondaryConversions.map((row) => (
              <div key={row.objective} className="flex items-center justify-between gap-4 border-b last:border-0 py-2 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{row.objective}</span>
                <span className="shrink-0 font-medium text-muted-foreground">{row.conversions.toLocaleString('es-ES')}</span>
              </div>
            ))}
          </DataList>
        </div>

        {data.last_14_days && (
          <div className="rounded-md border bg-muted/10 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                Ventana de conversión de 14 días
              </p>
              <span className="text-xs text-muted-foreground">Últimos 14 días, independiente del periodo</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Conversiones (14 d)" value={data.last_14_days.total_conversions.toLocaleString('es-ES')} icon={<Target className="h-3.5 w-3.5" />} />
              <Metric label="Valor conversiones (14 d)" value={money(data.last_14_days.total_value, data.currency)} icon={<DollarSign className="h-3.5 w-3.5" />} />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {data.last_14_days.by_objective.length === 0 ? <Empty /> : data.last_14_days.by_objective.map((row) => (
                <div key={row.objective} className="flex items-center justify-between gap-4 border-b last:border-0 py-2 text-sm">
                  <span className="min-w-0 truncate">{row.objective}</span>
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

function DataList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
      <div className="max-h-56 overflow-y-auto">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-sm text-muted-foreground">Sin datos en este periodo</p>;
}
