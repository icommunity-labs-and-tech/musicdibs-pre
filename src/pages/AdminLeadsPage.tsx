import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Mail, ShoppingCart, FileMusic } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';

interface LeadRow {
  id: string;
  title: string;
  created_at: string;
  email: string;
  name: string;
}

interface PurchaseRow {
  id: string;
  created_at: string;
  email: string;
  name: string;
  amount: number;
  currency: string;
  product: string;
}

const fmtDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
      })
    : '—';

export default function AdminLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await adminApi.getLeadsAndPurchases(200);
        if (!active) return;
        setLeads(data?.leads || []);
        setPurchases(data?.purchases || []);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Error cargando leads');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const term = q.trim().toLowerCase();
  const filteredLeads = leads.filter(
    (l) => !term || l.email.toLowerCase().includes(term) || (l.title || '').toLowerCase().includes(term),
  );
  const filteredPurchases = purchases.filter(
    (p) => !term || p.email.toLowerCase().includes(term) || (p.product || '').toLowerCase().includes(term),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads y compras</h1>
        <p className="text-sm text-muted-foreground">
          Leads de registro de obra y compras pagadas, con email y fecha.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileMusic className="h-4 w-4" /> Leads de registro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '—' : leads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Compras registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '—' : purchases.length}</p>
          </CardContent>
        </Card>
      </div>

      <Input
        placeholder="Buscar por email, obra o producto…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Leads ({filteredLeads.length})</TabsTrigger>
            <TabsTrigger value="purchases">Compras ({filteredPurchases.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                          Sin leads
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {l.email || '—'}
                          </TableCell>
                          <TableCell>{l.title || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(l.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                          Sin compras
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPurchases.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {p.email || '—'}
                          </TableCell>
                          <TableCell>{p.product || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {p.amount.toFixed(2)} {p.currency}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(p.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
