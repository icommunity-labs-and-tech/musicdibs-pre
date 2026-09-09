import { AlertCircle, MousePointerClick } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export type UtmVisitsData = {
  total_visits: number;
  by_source: Array<{ source: string; medium: string; campaign: string; visits: number; top_landing: string }>;
  range: { start: string; end: string };
};

type Props = {
  data: UtmVisitsData | null;
  loading: boolean;
  error: string | null;
};

export function UtmVisitsPanel({ data, loading, error }: Props) {
  const title = (
    <CardTitle className="text-base flex items-center gap-2">
      <MousePointerClick className="h-4 w-4 text-primary" />
      Visitas por campaña y origen (UTM)
    </CardTitle>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title}
          <Badge variant="secondary" className="text-[10px]">{data.total_visits} visitas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fuente</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead>Campaña</TableHead>
                <TableHead>Página de entrada</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.by_source.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Sin visitas con UTM en el periodo
                  </TableCell>
                </TableRow>
              )}
              {data.by_source.map((row) => (
                <TableRow key={`${row.source}-${row.medium}-${row.campaign}`}>
                  <TableCell className="font-medium">{row.source}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.medium}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.campaign}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.top_landing}</TableCell>
                  <TableCell className="text-right font-semibold">{row.visits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
