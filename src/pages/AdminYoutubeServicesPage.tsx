import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Youtube, Eye, ExternalLink, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

type YtRequest = {
  id: string;
  user_id: string;
  user_email?: string;
  user_display_name?: string;
  service_type: 'content_id' | 'oac';
  status: string;
  form_data: Record<string, any> | null;
  amount_gross: number | null;
  currency: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; badge: string }> = {
  draft:           { label: 'Borrador',       badge: 'bg-muted text-muted-foreground' },
  pending_payment: { label: 'Pago pendiente', badge: 'bg-yellow-500/20 text-yellow-400' },
  submitted:       { label: 'Enviado',        badge: 'bg-blue-500/20 text-blue-400' },
  in_review:       { label: 'En revisión',    badge: 'bg-orange-500/20 text-orange-400' },
  approved:        { label: 'Aprobado',       badge: 'bg-emerald-500/20 text-emerald-400' },
  rejected:        { label: 'Rechazado',      badge: 'bg-destructive/20 text-destructive' },
  cancelled:       { label: 'Cancelado',      badge: 'bg-muted text-muted-foreground line-through' },
};

const statusBadge = (s: string) => {
  const o = STATUS_LABEL[s];
  return o ? <Badge className={o.badge}>{o.label}</Badge> : <Badge variant="outline">{s}</Badge>;
};

const serviceBadge = (t: string) =>
  t === 'oac'
    ? <Badge className="bg-purple-500/20 text-purple-400">OAC</Badge>
    : <Badge className="bg-blue-500/20 text-blue-400">Content ID</Badge>;

const FIELD_LABELS: Record<string, string> = {
  artist_name: 'Nombre artístico',
  song_title: 'Título de la canción',
  track_title: 'Título de la canción',
  isrc: 'ISRC',
  youtube_channel_url: 'Canal YouTube',
  channel_url: 'Canal YouTube',
  youtube_channel_id: 'ID Canal YouTube',
  distributor: 'Distribuidora',
  release_date: 'Fecha de lanzamiento',
  genre: 'Género',
  email: 'Email de contacto',
};

const prettyKey = (k: string) => FIELD_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const isUrlKey = (k: string) => k.includes('url') || k.includes('channel_url');

function FormDataView({ data }: { data: Record<string, any> | null }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex gap-2 items-start rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Formulario no completado — contactar al usuario para recopilar datos</span>
      </div>
    );
  }
  const entries = Object.entries(data);
  return (
    <div className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
      {entries.map(([k, v]) => {
        const val = v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        const isUrl = isUrlKey(k) && typeof v === 'string' && /^https?:/.test(v);
        return (
          <div key={k} className="contents">
            <span className="text-muted-foreground">{prettyKey(k)}</span>
            {isUrl ? (
              <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">
                {val} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="break-words whitespace-pre-wrap">{val}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminYoutubeServicesPage() {
  const [requests, setRequests] = useState<YtRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<YtRequest | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<YtRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listYoutubeServiceRequests(statusFilter, typeFilter);
      setRequests((res?.requests || []) as YtRequest[]);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (selected) setNotesDraft(selected.admin_notes || '');
  }, [selected]);

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.trim().toLowerCase();
    return requests.filter(r =>
      (r.user_email || '').toLowerCase().includes(q) ||
      (r.user_display_name || '').toLowerCase().includes(q)
    );
  }, [requests, search]);

  const updateStatus = async (r: YtRequest, new_status: string, extra: { rejection_reason?: string } = {}) => {
    try {
      await adminApi.updateYoutubeServiceRequest(r.id, { new_status, ...extra });
      toast.success(`Estado actualizado a "${STATUS_LABEL[new_status]?.label || new_status}"`);
      await load();
      setSelected(prev => prev && prev.id === r.id ? { ...prev, status: new_status, ...(extra.rejection_reason ? { rejection_reason: extra.rejection_reason } : {}) } : prev);
    } catch (e: any) { toast.error(e.message); }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await adminApi.updateYoutubeServiceRequest(selected.id, { admin_notes: notesDraft });
      toast.success('Notas guardadas');
      setSelected(prev => prev ? { ...prev, admin_notes: notesDraft } : prev);
      load();
    } catch (e: any) { toast.error(e.message); }
    setSavingNotes(false);
  };

  const changeServiceType = async (r: YtRequest, service_type: string) => {
    try {
      await adminApi.updateYoutubeServiceRequest(r.id, { service_type });
      toast.success('Tipo de servicio actualizado');
      setSelected(prev => prev && prev.id === r.id ? { ...prev, service_type: service_type as any } : prev);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    await updateStatus(rejectTarget, 'rejected', { rejection_reason: rejectionReason });
    setRejectTarget(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Youtube className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-bold">Servicios YouTube</h1>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="w-52">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="content_id">Content ID</SelectItem>
                <SelectItem value="oac">OAC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Buscar por email/nombre</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="usuario@dominio.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin solicitudes</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{r.user_email || '—'}</span>
                      {r.user_display_name && <span className="text-xs text-muted-foreground">{r.user_display_name}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{serviceBadge(r.service_type)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-sm">
                    {r.amount_gross != null ? `${r.amount_gross} ${(r.currency || '').toUpperCase()}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.submitted_at
                      ? format(new Date(r.submitted_at), 'dd/MM/yy HH:mm')
                      : <span className="text-muted-foreground">Pendiente</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(r)} className="gap-1">
                      <Eye className="h-4 w-4" /> Ver detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Youtube className="h-5 w-5 text-red-500" />
              <span>{selected?.service_type === 'oac' ? 'OAC' : 'Content ID'} — {selected?.user_email || selected?.user_id}</span>
            </DialogTitle>
            <button onClick={() => setSelected(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm">
                {statusBadge(selected.status)}
                <span className="text-muted-foreground">Creada: {format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>

              {/* Pago */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Datos de pago</h3>
                <div className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
                  <span className="text-muted-foreground">Importe</span>
                  <span>{selected.amount_gross != null ? `${selected.amount_gross} ${(selected.currency || '').toUpperCase()}` : '—'}</span>
                  <span className="text-muted-foreground">Payment Intent</span>
                  <span>
                    {selected.stripe_payment_intent_id ? (
                      <a href={`https://dashboard.stripe.com/payments/${selected.stripe_payment_intent_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">
                        {selected.stripe_payment_intent_id} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : '—'}
                  </span>
                  <span className="text-muted-foreground">Pagado el</span>
                  <span>{selected.paid_at ? format(new Date(selected.paid_at), 'dd/MM/yyyy HH:mm') : '—'}</span>
                </div>
              </section>

              {/* Form data */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Datos del formulario</h3>
                <FormDataView data={selected.form_data} />
              </section>

              {/* Rejection reason if rejected */}
              {selected.rejection_reason && (
                <section>
                  <h3 className="text-sm font-semibold mb-2 text-destructive">Motivo de rechazo</h3>
                  <p className="text-sm whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/10 p-3">{selected.rejection_reason}</p>
                </section>
              )}

              {/* Admin notes */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Notas de administración</h3>
                <Textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={3} placeholder="Notas internas..." />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={saveNotes} disabled={savingNotes || notesDraft === (selected.admin_notes || '')}>Guardar notas</Button>
                </div>
              </section>

              {/* Actions */}
              <section className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Acciones</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.status === 'submitted' && (
                    <Button onClick={() => updateStatus(selected, 'in_review')}>Marcar en revisión</Button>
                  )}
                  {selected.status === 'in_review' && (
                    <>
                      <Button onClick={() => updateStatus(selected, 'approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white">Aprobar</Button>
                      <Button variant="destructive" onClick={() => { setRejectTarget(selected); setRejectionReason(''); }}>Rechazar</Button>
                    </>
                  )}
                  {(selected.status === 'approved' || selected.status === 'rejected') && (
                    <Button variant="outline" onClick={() => updateStatus(selected, 'in_review')}>Revertir a en revisión</Button>
                  )}
                </div>

                <div className="mt-4 flex items-end gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Corregir tipo de servicio</Label>
                    <Select value={selected.service_type} onValueChange={v => changeServiceType(selected, v)}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content_id">Content ID</SelectItem>
                        <SelectItem value="oac">OAC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection reason dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={open => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo del rechazo. Quedará registrado en la solicitud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Motivo del rechazo..." rows={4} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject} disabled={!rejectionReason.trim()}>Rechazar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
