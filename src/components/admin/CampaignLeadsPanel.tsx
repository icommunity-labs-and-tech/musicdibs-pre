import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Target, FileMusic, Mail, AlertCircle } from "lucide-react";
import { adminApi } from "@/services/adminApi";

/**
 * Panel de leads de campaña para /dashboard/admin/campaigns.
 *
 * Muestra el impacto real de las campañas de Google Ads:
 *  - Leads "registro de obra" (evento work_registered_lead) con su fecha.
 *  - Leads del formulario de la landing /registro-gratis.
 */

interface Totals {
  total: number;
  today: number;
  last7: number;
  last30: number;
}

interface WorkLead {
  id: string;
  title: string;
  created_at: string;
  user_name: string | null;
}

interface FormLead {
  id: string;
  name: string;
  email: string;
  profile: string | null;
  created_at: string;
}

interface LeadsResponse {
  totals: { works: Totals; form: Totals };
  work_leads: WorkLead[];
  form_leads: FormLead[];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });

function KpiCard({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function CampaignLeadsPanel() {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = (await adminApi.getRegistrationLeads(50)) as LeadsResponse;
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error cargando los leads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Leads de campaña</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Leads de campaña</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error || "No se han podido cargar los leads."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totals, work_leads, form_leads } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Leads de campaña
          <Badge variant="secondary" className="text-[10px]">Google Ads</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Registros de obra (conversión <code>work_registered_lead</code>) y leads del formulario de /registro-gratis. Horas en zona Europe/Madrid.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileMusic className="h-3.5 w-3.5" /> Registros de obra
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Hoy" value={totals.works.today} />
            <KpiCard label="Últimos 7 días" value={totals.works.last7} />
            <KpiCard label="Últimos 30 días" value={totals.works.last30} />
            <KpiCard label="Total histórico" value={totals.works.total} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Formulario landing /registro-gratis
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Hoy" value={totals.form.today} />
            <KpiCard label="Últimos 7 días" value={totals.form.last7} />
            <KpiCard label="Últimos 30 días" value={totals.form.last30} />
            <KpiCard label="Total histórico" value={totals.form.total} />
          </div>
        </div>

        <Tabs defaultValue="works">
          <TabsList>
            <TabsTrigger value="works">Registros ({work_leads.length})</TabsTrigger>
            <TabsTrigger value="form">Formulario ({form_leads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="works" className="mt-3">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {work_leads.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">Sin registros todavía.</TableCell></TableRow>
                  ) : work_leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(l.created_at)}</TableCell>
                      <TableCell className="text-sm">{l.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.user_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="form" className="mt-3">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form_leads.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Sin leads del formulario todavía.</TableCell></TableRow>
                  ) : form_leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(l.created_at)}</TableCell>
                      <TableCell className="text-sm">{l.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.profile || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
