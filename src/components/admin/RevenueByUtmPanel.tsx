import { AlertCircle, Globe2, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export type RevenueByUtmData = {
  by_campaign: Array<{
    campaign: string;
    source: string;
    medium: string;
    orders: number;
    buyers: number;
    revenue: number;
    net: number;
    avg_ticket: number;
  }>;
  by_country: Array<{ country: string; orders: number; revenue: number; net: number; avg_ticket: number }>;
  by_campaign_country: Array<{ campaign: string; country: string; orders: number; revenue: number }>;
  total_orders: number;
  total_revenue: number;
  currency: string;
  range: { start: string; end: string };
};

type Props = {
  data: RevenueByUtmData | null;
  loading: boolean;
  error: string | null;
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value || 0);

export function RevenueByUtmPanel({ data, loading, error }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Ingresos por campaña y país (UTM real)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Ingresos por campaña y país (UTM real)</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { currency } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Ingresos por campaña y país (UTM real)
            <Badge variant="secondary" className="text-[10px]">{currency}</Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {data.total_orders} pedidos · {money(data.total_revenue, currency)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Por campaña (utm_campaign de cada compra)</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Fuente / medio</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Compradores</TableHead>
                  <TableHead className="text-right">Ticket medio</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_campaign.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Sin compras en el periodo</TableCell></TableRow>
                )}
                {data.by_campaign.map((row) => (
                  <TableRow key={row.campaign}>
                    <TableCell className="font-medium">{row.campaign}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.source} / {row.medium}</TableCell>
                    <TableCell className="text-right">{row.orders}</TableCell>
                    <TableCell className="text-right">{row.buyers}</TableCell>
                    <TableCell className="text-right">{money(row.avg_ticket, currency)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(row.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Globe2 className="h-3.5 w-3.5" /> Por país de facturación
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Ticket medio</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_country.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Sin datos</TableCell></TableRow>
                )}
                {data.by_country.map((row) => (
                  <TableRow key={row.country}>
                    <TableCell className="font-medium">{row.country}</TableCell>
                    <TableCell className="text-right">{row.orders}</TableCell>
                    <TableCell className="text-right">{money(row.avg_ticket, currency)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(row.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {data.by_campaign_country.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Cruce campaña × país (top 100)</p>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_campaign_country.map((row) => (
                    <TableRow key={`${row.campaign}-${row.country}`}>
                      <TableCell>{row.campaign}</TableCell>
                      <TableCell>{row.country}</TableCell>
                      <TableCell className="text-right">{row.orders}</TableCell>
                      <TableCell className="text-right font-semibold">{money(row.revenue, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
