import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Pencil, FileSignature, CheckCircle2, AlertCircle, CreditCard, Clock } from 'lucide-react';

const ARTIST_TIERS = [3, 6, 10, 15, 25, 50] as const;

interface ManagerLead {
  id: string;
  name: string | null;
  email: string;
  num_artists_estimated: number | null;
  num_artists_range: string | null;
  annual_works_estimated: number | null;
  needs_distribution: boolean | null;
  needs_ai_studio: boolean | null;
  message: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
}

interface ManagerAccount {
  contract_id: string;
  manager_user_id: string;
  company_name: string;
  contact_email: string;
  contact_phone?: string | null;
  max_artists: number;
  artists_used: number;
  credits_included: number;
  includes_distribution: boolean;
  includes_ai_studio: boolean;
  annual_price_eur: number;
  contract_start: string;
  contract_end: string;
  status: string;
  notes?: string | null;
  stripe_addon_item_id?: string | null;
  stripe_addon_active?: boolean;
}

type ContractForm = {
  manager_email: string;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  max_artists: string;
  credits_included: string;
  includes_distribution: boolean;
  includes_ai_studio: boolean;
  annual_price_eur: string;
  contract_start: string;
  contract_end: string;
  notes: string;
  contact_request_id?: string;
};

const isoToday = () => new Date().toISOString().slice(0, 10);
const isoPlusYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

const emptyForm = (): ContractForm => ({
  manager_email: '',
  company_name: '',
  contact_email: '',
  contact_phone: '',
  max_artists: '3',
  credits_included: '0',
  includes_distribution: true,
  includes_ai_studio: false,
  annual_price_eur: '0',
  contract_start: isoToday(),
  contract_end: isoPlusYear(),
  notes: '',
});

export default function AdminManagersPage() {
  const [tab, setTab] = useState<'leads' | 'accounts'>('leads');
  const [leads, setLeads] = useState<ManagerLead[]>([]);
  const [accounts, setAccounts] = useState<ManagerAccount[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [leadFilter, setLeadFilter] = useState<'all' | 'pending' | 'converted'>('pending');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ContractForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const payload = leadFilter === 'all' ? {} : { status: leadFilter };
      const res = await adminApi.callAction('get_manager_contact_requests', payload);
      setLeads((res?.requests || []) as ManagerLead[]);
    } catch (e: any) {
      toast.error(e?.message || 'Error cargando leads');
    } finally {
      setLoadingLeads(false);
    }
  }, [leadFilter]);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await adminApi.callAction('get_manager_accounts', {});
      setAccounts((res?.accounts || []) as ManagerAccount[]);
    } catch (e: any) {
      toast.error(e?.message || 'Error cargando managers');
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const openNewFromLead = (lead: ManagerLead) => {
    setEditingContractId(null);
    setForm({
      ...emptyForm(),
      manager_email: lead.email,
      company_name: lead.name || '',
      contact_email: lead.email,
      max_artists: String(lead.num_artists_estimated || 1),
      includes_distribution: lead.needs_distribution ?? true,
      includes_ai_studio: lead.needs_ai_studio ?? false,
      notes: lead.internal_notes || '',
      contact_request_id: lead.id,
    });
    setFormOpen(true);
  };

  const openEditAccount = (acc: ManagerAccount) => {
    setEditingContractId(acc.contract_id);
    setForm({
      manager_email: acc.contact_email,
      company_name: acc.company_name,
      contact_email: acc.contact_email,
      contact_phone: acc.contact_phone || '',
      max_artists: String(acc.max_artists),
      
      credits_included: String(acc.credits_included),
      includes_distribution: acc.includes_distribution,
      includes_ai_studio: acc.includes_ai_studio,
      annual_price_eur: String(acc.annual_price_eur),
      contract_start: acc.contract_start?.slice(0, 10) || isoToday(),
      contract_end: acc.contract_end?.slice(0, 10) || isoPlusYear(),
      notes: acc.notes || '',
    });
    setFormOpen(true);
  };

  const openNewBlank = () => {
    setEditingContractId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const submitContract = async () => {
    if (!form.manager_email.trim()) return toast.error('Email del manager requerido');
    if (!form.company_name.trim()) return toast.error('Nombre de empresa requerido');
    const maxA = Number(form.max_artists);
    if (!maxA || maxA < 1) return toast.error('Máximo de artistas debe ser >= 1');

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        manager_email: form.manager_email.trim(),
        company_name: form.company_name.trim(),
        contact_email: (form.contact_email || form.manager_email).trim(),
        contact_phone: form.contact_phone.trim() || undefined,
        max_artists: maxA,
        
        credits_included: Number(form.credits_included) || 0,
        includes_distribution: form.includes_distribution,
        includes_ai_studio: form.includes_ai_studio,
        annual_price_eur: Number(form.annual_price_eur) || 0,
        contract_start: form.contract_start,
        contract_end: form.contract_end,
        notes: form.notes.trim() || undefined,
        apply_stripe_addon: !form.skip_stripe_addon,
      };
      if (form.contact_request_id) payload.contact_request_id = form.contact_request_id;

      const res = await adminApi.callAction('upsert_manager_contract', payload);
      if (res?.error) throw new Error(res.error);

      const savedMsg = editingContractId ? 'Contrato actualizado.' : 'Contrato guardado.';
      const stripe = res?.stripe as
        | { applied?: boolean; already_had_addon?: boolean; reason?: string }
        | undefined;

      if (form.skip_stripe_addon) {
        toast.success(`${savedMsg} Add-on de Stripe omitido (facturación manual).`);
      } else if (!stripe) {
        toast.success(savedMsg);
      } else if (stripe.applied && stripe.already_had_addon) {
        toast.message(`${savedMsg} El manager ya tenía este mismo tier activo en Stripe, no se duplicó ningún cobro.`);
      } else if (stripe.applied) {
        toast.success(`${savedMsg} Add-on aplicado en Stripe (se facturará junto con su suscripción actual).`);
      } else {
        toast.warning(`${savedMsg} ${stripe.reason || 'No se pudo aplicar el add-on en Stripe. Aplícalo manualmente.'}`, { duration: 8000 });
      }

      setFormOpen(false);
      setTab('accounts');
      await Promise.all([loadAccounts(), loadLeads()]);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('user') && msg.toLowerCase().includes('not')) {
        toast.error('No existe ninguna cuenta MusicDibs con ese email. El manager debe registrarse primero.');
      } else {
        toast.error(msg || 'Error al guardar el contrato');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const now = Date.now();
  const daysToEnd = (iso: string) => Math.floor((new Date(iso).getTime() - now) / 86400000);

  const filteredLeads = useMemo(() => leads, [leads]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Managers</h1>
          <p className="text-sm text-muted-foreground">Gestión de leads y contratos de managers multi-artista</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadLeads(); loadAccounts(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
          <Button onClick={openNewBlank}>
            <FileSignature className="w-4 h-4 mr-2" /> Nuevo contrato
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="accounts">Managers activos ({accounts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card>
            <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Leads de managers</CardTitle>
                <CardDescription>Solicitudes recibidas desde la landing de managers</CardDescription>
              </div>
              <div className="flex gap-1">
                {(['pending', 'converted', 'all'] as const).map((s) => (
                  <Button key={s} size="sm" variant={leadFilter === s ? 'default' : 'outline'} onClick={() => setLeadFilter(s)}>
                    {s === 'pending' ? 'Pendientes' : s === 'converted' ? 'Convertidos' : 'Todos'}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingLeads ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : filteredLeads.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sin leads</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Nº artistas</TableHead>
                        <TableHead>Distribución</TableHead>
                        <TableHead>AI Studio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.name || '—'}</TableCell>
                          <TableCell className="text-xs">{l.email}</TableCell>
                          <TableCell>{l.num_artists_estimated ?? l.num_artists_range ?? '—'}</TableCell>
                          <TableCell>{l.needs_distribution ? 'Sí' : 'No'}</TableCell>
                          <TableCell>{l.needs_ai_studio ? 'Sí' : 'No'}</TableCell>
                          <TableCell>
                            <Badge variant={l.status === 'converted' ? 'default' : 'secondary'}>{l.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {l.status !== 'converted' && (
                              <Button size="sm" onClick={() => openNewFromLead(l)}>Convertir a contrato</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Managers activos</CardTitle>
              <CardDescription>Contratos vigentes con su uso actual</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : accounts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sin managers activos</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Artistas</TableHead>
                        
                        <TableHead>Precio/año</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Stripe</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((a) => {
                        const full = a.artists_used >= a.max_artists;
                        const days = daysToEnd(a.contract_end);
                        const expiring = days >= 0 && days <= 30;
                        const highlight = full
                          ? 'bg-destructive/10'
                          : expiring
                            ? 'bg-orange-500/10'
                            : '';
                        return (
                          <TableRow key={a.contract_id} className={highlight}>
                            <TableCell className="font-medium">{a.company_name}</TableCell>
                            <TableCell className="text-xs">{a.contact_email}</TableCell>
                            <TableCell>
                              <span className={full ? 'font-bold text-destructive' : ''}>
                                {a.artists_used} / {a.max_artists}
                              </span>
                            </TableCell>
                            
                            <TableCell>{a.annual_price_eur} €</TableCell>
                            <TableCell className="text-xs">{a.contract_start?.slice(0, 10)}</TableCell>
                            <TableCell className="text-xs">
                              {a.contract_end?.slice(0, 10)}
                              {expiring && <div className="text-orange-600 text-[10px]">en {days}d</div>}
                            </TableCell>
                            <TableCell><Badge>{a.status}</Badge></TableCell>
                            <TableCell>
                              {a.stripe_addon_item_id ? (
                                <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
                                  <CheckCircle2 className="w-3 h-3" /> Add-on
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-orange-600 border-orange-500/40">
                                  <AlertCircle className="w-3 h-3" /> Sin add-on
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => openEditAccount(a)}>
                                <Pencil className="w-3 h-3 mr-1" /> Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContractId ? 'Editar contrato de manager' : 'Nuevo contrato de manager'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Email del manager *</Label>
              <Input
                type="email"
                value={form.manager_email}
                onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
                placeholder="manager@empresa.com"
                disabled={!!editingContractId}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Debe existir una cuenta MusicDibs con este email.</p>
            </div>
            <div>
              <Label>Nombre empresa / sello *</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <Label>Email de contacto</Label>
              <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="por defecto = email del manager" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
            <div>
              <Label>Máximo de artistas * (tier Stripe)</Label>
              <Select value={form.max_artists} onValueChange={(v) => setForm({ ...form, max_artists: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona tier" /></SelectTrigger>
                <SelectContent>
                  {ARTIST_TIERS.map((t) => (
                    <SelectItem key={t} value={String(t)}>{t} artistas</SelectItem>
                  ))}
                  {!ARTIST_TIERS.includes(Number(form.max_artists) as any) && form.max_artists && (
                    <SelectItem value={form.max_artists}>{form.max_artists} (personalizado)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">Solo estos tiers existen como price en Stripe. Para otros valores, marca abajo "no cobrar automáticamente".</p>
            </div>
            <div>
              <Label>Créditos incluidos</Label>
              <Input type="number" min={0} value={form.credits_included} onChange={(e) => setForm({ ...form, credits_included: e.target.value })} />
            </div>
            <div>
              <Label>Precio anual (EUR)</Label>
              <Input type="number" min={0} step="0.01" value={form.annual_price_eur} onChange={(e) => setForm({ ...form, annual_price_eur: e.target.value })} />
            </div>
            <div>
              <Label>Inicio contrato</Label>
              <Input type="date" value={form.contract_start} onChange={(e) => setForm({ ...form, contract_start: e.target.value })} />
            </div>
            <div>
              <Label>Fin contrato</Label>
              <Input type="date" value={form.contract_end} onChange={(e) => setForm({ ...form, contract_end: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <Label className="text-sm">Incluye distribución</Label>
              <Switch checked={form.includes_distribution} onCheckedChange={(v) => setForm({ ...form, includes_distribution: v })} />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <Label className="text-sm">Incluye AI Studio</Label>
              <Switch checked={form.includes_ai_studio} onCheckedChange={(v) => setForm({ ...form, includes_ai_studio: v })} />
            </div>
            <div className="md:col-span-2 flex items-start gap-2 rounded border p-3 bg-muted/30">
              <Checkbox
                id="skip-stripe"
                checked={form.skip_stripe_addon}
                onCheckedChange={(v) => setForm({ ...form, skip_stripe_addon: v === true })}
              />
              <div className="grid gap-1 leading-none">
                <Label htmlFor="skip-stripe" className="text-sm cursor-pointer">
                  No cobrar automáticamente en Stripe (gestionar facturación aparte)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Marca esto si el precio pactado no coincide con ningún tier fijo o si prefieres facturar manualmente.
                </p>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Notas internas</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submitContract} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
