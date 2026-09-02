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

const PAGE_SIZES = [10, 25, 50] as const;

type PageKey = "works" | "form";

interface PaginationState {
  pageSize: (typeof PAGE_SIZES)[number];
  pages: Record<PageKey, number>;
}

function useCampaignPagination(items: WorkLead[] | FormLead[], key: PageKey, state: PaginationState, setState: React.Dispatch<React.SetStateAction<PaginationState>>) {
  const totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  const currentPage = Math.min(state.pages[key], totalPages);
  const start = (currentPage - 1) * state.pageSize;
  const paginated = useMemo(() => items.slice(start, start + state.pageSize), [items, start, state.pageSize]);

  const setPage = (p: number) =>
    setState((prev) => ({ ...prev, pages: { ...prev.pages, [key]: Math.max(1, Math.min(p, totalPages)) } }));

  return { currentPage, totalPages, paginated, start, setPage };
}

export function CampaignLeadsPanel() {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageSize: 10,
    pages: { works: 1, form: 1 },
  });

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

          <PaginatedTable
            items={work_leads}
            tabKey="works"
            pagination={pagination}
            setPagination={setPagination}
            emptyMessage="Sin registros todavía."
            columns={[
              { header: "Fecha", render: (l) => <TableCell className="whitespace-nowrap text-xs">{fmtDate(l.created_at)}</TableCell> },
              { header: "Obra", render: (l) => <TableCell className="text-sm">{l.title}</TableCell> },
              { header: "Usuario", render: (l) => <TableCell className="text-sm text-muted-foreground">{l.user_name || "—"}</TableCell> },
            ]}
          />

          <PaginatedTable
            items={form_leads}
            tabKey="form"
            pagination={pagination}
            setPagination={setPagination}
            emptyMessage="Sin leads del formulario todavía."
            columns={[
              { header: "Fecha", render: (l) => <TableCell className="whitespace-nowrap text-xs">{fmtDate(l.created_at)}</TableCell> },
              { header: "Nombre", render: (l) => <TableCell className="text-sm">{l.name}</TableCell> },
              { header: "Email", render: (l) => <TableCell className="text-sm text-muted-foreground">{l.email}</TableCell> },
              { header: "Perfil", render: (l) => <TableCell className="text-sm text-muted-foreground">{l.profile || "—"}</TableCell> },
            ]}
          />
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface Column<T> {
  header: string;
  render: (item: T) => React.ReactNode;
}

function PaginatedTable<T extends { id: string }>({
  items,
  tabKey,
  pagination,
  setPagination,
  emptyMessage,
  columns,
}: {
  items: T[];
  tabKey: PageKey;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  emptyMessage: string;
  columns: Column<T>[];
}) {
  const { currentPage, totalPages, paginated, start, setPage } = useCampaignPagination(
    items,
    tabKey,
    pagination,
    setPagination
  );

  return (
    <TabsContent value={tabKey} className="mt-3 space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead key={i}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground py-6">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item) => <TableRow key={item.id}>{columns.map((c) => c.render(item))}</TableRow>)
            )}
          </TableBody>
        </Table>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Mostrar</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) =>
                setPagination((prev) => ({
                  ...prev,
                  pageSize: Number(v) as PaginationState["pageSize"],
                  pages: { ...prev.pages, [tabKey]: 1 },
                }))
              }
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>por página</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {start + 1}-{Math.min(start + pagination.pageSize, items.length)} de {items.length}
            </span>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(currentPage - 1)}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem className="px-2 text-muted-foreground">
                Página {currentPage} de {totalPages}
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </TabsContent>
  );
}
