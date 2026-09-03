import { AlertCircle, Languages, UserPlus, FormInput } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export type LeadsByLanguageData = {
  by_language: Array<{ language: string; signups: number; form_leads: number; total: number }>;
  by_campaign: Array<{ campaign: string; signups: number; form_leads: number; total: number }>;
  signups: Array<{
    user_id: string;
    email: string;
    language: string;
    created_at: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    landing_path: string | null;
  }>;
  form_leads: Array<{
    id: string;
    name: string;
    email: string;
    language: string;
    profile: string | null;
    created_at: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
  }>;
  range: { start: string; end: string };
};

type Props = {
  data: LeadsByLanguageData | null;
  loading: boolean;
  error: string | null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const utmLabel = (source: string | null, medium: string | null, campaign: string | null) => {
  if (!source && !medium && !campaign) return '—';
  return [source, medium, campaign].filter(Boolean).join(' / ');
};

export function LeadsByLanguagePanel({ data, loading, error }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Leads por idioma (registros y formulario)</CardTitle></CardHeader>
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
        <CardHeader><CardTitle className="text-base">Leads por idioma (registros y formulario)</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalSignups = data.signups.length;
  const totalForm = data.form_leads.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            Leads por idioma (registros y formulario)
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalSignups} registros · {totalForm} leads de formulario
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Por idioma del lead</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Idioma</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">Formulario</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_language.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Sin leads en el periodo</TableCell></TableRow>
                )}
                {data.by_language.map((row) => (
                  <TableRow key={row.language}>
                    <TableCell className="font-medium uppercase">{row.language}</TableCell>
                    <TableCell className="text-right">{row.signups}</TableCell>
                    <TableCell className="text-right">{row.form_leads}</TableCell>
                    <TableCell className="text-right font-semibold">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Por campaña (utm_campaign del lead)</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">Formulario</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_campaign.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Sin datos</TableCell></TableRow>
                )}
                {data.by_campaign.map((row) => (
                  <TableRow key={row.campaign}>
                    <TableCell className="font-medium">{row.campaign}</TableCell>
                    <TableCell className="text-right">{row.signups}</TableCell>
                    <TableCell className="text-right">{row.form_leads}</TableCell>
                    <TableCell className="text-right font-semibold">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" /> Registros de usuario (UTM capturado en el signup)
            <Badge variant="secondary" className="text-[10px]">máx. 500</Badge>
          </p>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>UTM (fuente / medio / campaña)</TableHead>
                  <TableHead>Landing</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.signups.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sin registros en el periodo</TableCell></TableRow>
                )}
                {data.signups.slice(0, 500).map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="text-xs">{row.email}</TableCell>
                    <TableCell className="uppercase text-xs">{row.language}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{utmLabel(row.utm_source, row.utm_medium, row.utm_campaign)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.landing_path || '—'}</TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap">{fmtDate(row.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <FormInput className="h-3.5 w-3.5" /> Leads del formulario (landing campañas)
          </p>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>UTM (fuente / medio / campaña)</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.form_leads.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sin leads de formulario en el periodo</TableCell></TableRow>
                )}
                {data.form_leads.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{row.email}</TableCell>
                    <TableCell className="uppercase text-xs">{row.language}</TableCell>
                    <TableCell className="text-xs">{row.profile || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{utmLabel(row.utm_source, row.utm_medium, row.utm_campaign)}</TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap">{fmtDate(row.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
