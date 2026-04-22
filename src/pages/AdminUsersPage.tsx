import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Users, MoreHorizontal, Search, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown, X, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UserDetailSheet from '@/components/admin/UserDetailSheet';
import AdminUserModals from '@/components/admin/AdminUserModals';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type SortKey = 'created_at' | 'updated_at' | 'display_name' | 'available_credits' | 'subscription_plan' | 'kyc_status';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [stripeFilter, setStripeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Sorting
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [creditModal, setCreditModal] = useState<{ open: boolean; userId: string; email: string; currentCredits: number }>({ open: false, userId: '', email: '', currentCredits: 0 });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: '', email: '' });
  const [bulkConfirm, setBulkConfirm] = useState<{ open: boolean; op: 'block' | 'unblock' | 'kyc_verified' | 'kyc_pending' | null; label: string }>({ open: false, op: null, label: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(page * pageSize, search, pageSize, {
        kyc_filter: kycFilter === 'all' ? '' : kycFilter,
        plan_filter: planFilter === 'all' ? '' : planFilter,
        stripe_filter: stripeFilter === 'all' ? '' : stripeFilter,
        status_filter: statusFilter === 'all' ? '' : statusFilter,
        role_filter: roleFilter === 'all' ? '' : roleFilter,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }, [page, pageSize, search, kycFilter, planFilter, stripeFilter, statusFilter, roleFilter, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, pageSize, kycFilter, planFilter, stripeFilter, statusFilter, roleFilter, sortBy, sortDir]);

  const handleSearch = () => { setPage(0); load(); };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortBy !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleSetKyc = async (userId: string, status: string) => {
    try { await adminApi.setKyc(userId, status); toast.success('KYC actualizado'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleToggleBlock = async (userId: string, blocked: boolean) => {
    if (!confirm(blocked ? '¿Bloquear este usuario?' : '¿Desbloquear este usuario?')) return;
    try { await adminApi.toggleBlock(userId, blocked); toast.success(blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (!confirm(isAdmin ? '¿Dar rol de admin a este usuario?' : '¿Quitar rol de admin a este usuario?')) return;
    try { await adminApi.setAdminRole(userId, isAdmin); toast.success(isAdmin ? 'Admin asignado' : 'Admin revocado'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleToggleManager = async (userId: string, isManager: boolean) => {
    if (!confirm(isManager ? '¿Dar rol de manager a este usuario?' : '¿Quitar rol de manager a este usuario?')) return;
    try { await adminApi.setManagerRole(userId, isManager); toast.success(isManager ? 'Manager asignado' : 'Manager revocado'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const kycBadge = (status: string) => {
    const map: Record<string, string> = { verified: 'bg-green-500/20 text-green-400', pending: 'bg-yellow-500/20 text-yellow-400', unverified: 'bg-muted text-muted-foreground', rejected: 'bg-destructive/20 text-destructive' };
    return <Badge className={map[status] || map.unverified}>{status}</Badge>;
  };

  const togglePageSelection = (checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) users.forEach(u => { if (u.user_id !== user?.id) next.add(u.user_id); });
      else users.forEach(u => next.delete(u.user_id));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const allPageSelected = useMemo(() => {
    const selectable = users.filter(u => u.user_id !== user?.id);
    return selectable.length > 0 && selectable.every(u => selectedIds.has(u.user_id));
  }, [users, selectedIds, user?.id]);

  const somePageSelected = users.some(u => selectedIds.has(u.user_id)) && !allPageSelected;

  const runBulk = async (op: 'block' | 'unblock' | 'kyc_verified' | 'kyc_pending') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await adminApi.bulkUserAction(ids, op);
      toast.success(`${res.success} actualizados${res.failed ? `, ${res.failed} fallidos` : ''}`);
      setSelectedIds(new Set());
      load();
    } catch (e: any) { toast.error(e.message); }
    setBulkConfirm({ open: false, op: null, label: '' });
  };

  const handleBulkExport = () => {
    const selected = users.filter(u => selectedIds.has(u.user_id));
    if (selected.length === 0) return;
    const headers = ['user_id', 'email', 'display_name', 'subscription_plan', 'available_credits', 'kyc_status', 'is_blocked', 'roles', 'works_count', 'stripe_customer_id', 'created_at'];
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = selected.map(u => [u.user_id, u.email, u.display_name, u.subscription_plan, u.available_credits, u.kyc_status, u.is_blocked ? 'true' : 'false', (u.roles || []).join('|'), u.works_count, u.stripe_customer_id || '', u.created_at].map(escape).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `usuarios_seleccion_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${selected.length} usuarios exportados`);
  };

  const clearFilters = () => {
    setKycFilter('all'); setPlanFilter('all'); setStripeFilter('all'); setStatusFilter('all'); setRoleFilter('all');
    setSearch(''); setPage(0);
  };

  const activeFiltersCount = [kycFilter, planFilter, stripeFilter, statusFilter, roleFilter].filter(f => f !== 'all').length + (search ? 1 : 0);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) { for (let i = 0; i < totalPages; i++) pages.push(i); }
    else {
      pages.push(0);
      if (page > 3) pages.push('ellipsis');
      const start = Math.max(1, page - 1);
      const end = Math.min(totalPages - 2, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 4) pages.push('ellipsis');
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
        {!loading && <span className="text-sm text-muted-foreground ml-2">{total.toLocaleString()} usuarios</span>}
      </div>

      {/* Search + Export */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por email o nombre..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-9" />
        </div>
        <Button onClick={handleSearch} variant="secondary">Buscar</Button>
        <Button variant="outline" size="sm" onClick={async () => {
          try {
            const res = await adminApi.exportCsv('users');
            const blob = new Blob([res.csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
            toast.success('CSV descargado');
          } catch (e: any) { toast.error(e.message); }
        }}>
          <Download className="h-4 w-4 mr-1" /> Exportar todo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap p-3 rounded-lg border border-border/40 bg-muted/20">
        <span className="text-xs font-medium text-muted-foreground">Filtros:</span>
        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={v => { setKycFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="KYC" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los KYC</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={v => { setPlanFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            <SelectItem value="Free">Free</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Annual">Annual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stripeFilter} onValueChange={v => { setStripeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Stripe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Stripe (todos)</SelectItem>
            <SelectItem value="linked">Vinculado</SelectItem>
            <SelectItem value="unlinked">Sin vincular</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
            <X className="h-3 w-3 mr-1" /> Limpiar ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-primary/40 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.size} usuario{selectedIds.size === 1 ? '' : 's'} seleccionado{selectedIds.size === 1 ? '' : 's'}</span>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <Download className="h-3 w-3 mr-1" /> Exportar selección
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkConfirm({ open: true, op: 'kyc_verified', label: 'marcar KYC como Verificado' })}>KYC → Verificado</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkConfirm({ open: true, op: 'kyc_pending', label: 'marcar KYC como Pendiente' })}>KYC → Pendiente</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkConfirm({ open: true, op: 'block', label: 'bloquear' })}>Bloquear</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkConfirm({ open: true, op: 'unblock', label: 'desbloquear' })}>Desbloquear</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpiar</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected ? true : (somePageSelected ? 'indeterminate' : false)}
                  onCheckedChange={c => togglePageSelection(!!c)}
                  aria-label="Seleccionar página"
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('display_name')}>
                <div className="flex items-center gap-1">Usuario <SortIcon k="display_name" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('subscription_plan')}>
                <div className="flex items-center gap-1">Plan <SortIcon k="subscription_plan" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('available_credits')}>
                <div className="flex items-center gap-1">Créditos <SortIcon k="available_credits" /></div>
              </TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('kyc_status')}>
                <div className="flex items-center gap-1">KYC <SortIcon k="kyc_status" /></div>
              </TableHead>
              <TableHead>Obras</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                <div className="flex items-center gap-1">Alta <SortIcon k="created_at" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('updated_at')}>
                <div className="flex items-center gap-1">Últ. actividad <SortIcon k="updated_at" /></div>
              </TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.user_id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedUser(u)}>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(u.user_id)}
                    onCheckedChange={c => toggleOne(u.user_id, !!c)}
                    disabled={u.user_id === user?.id}
                    aria-label="Seleccionar usuario"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{u.display_name || u.email?.split('@')[0] || '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{u.subscription_plan}</Badge></TableCell>
                <TableCell className="font-mono">{u.available_credits}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(u.roles || ['user']).map((r: string) => (
                      <Badge key={r} className={
                        r === 'admin' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                          r === 'manager' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-muted text-muted-foreground'
                      }>{r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{kycBadge(u.kyc_status)}</TableCell>
                <TableCell>{u.works_count}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.updated_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {u.stripe_customer_id
                    ? <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Vinculado</Badge>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {u.is_blocked
                    ? <Badge className="bg-destructive/20 text-destructive">Bloqueado</Badge>
                    : <Badge className="bg-green-500/20 text-green-400">Activo</Badge>}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCreditModal({ open: true, userId: u.user_id, email: u.email, currentCredits: u.available_credits })}>
                        Ajustar créditos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSetKyc(u.user_id, 'verified')}>KYC → Verificado</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetKyc(u.user_id, 'pending')}>KYC → Pendiente</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetKyc(u.user_id, 'rejected')}>KYC → Rechazado</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={async () => {
                        try {
                          await adminApi.sendPasswordReset(u.user_id);
                          toast.success(`Enlace de recuperación enviado a ${u.email}`);
                        } catch (e: any) {
                          toast.error(e.message || 'Error al enviar el enlace');
                        }
                      }}>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Enviar enlace de recuperar contraseña
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleBlock(u.user_id, !u.is_blocked)}>
                        {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggleAdmin(u.user_id, !(u.roles || []).includes('admin'))}
                        disabled={u.user_id === user?.id && (u.roles || []).includes('admin')}
                      >
                        {(u.roles || []).includes('admin') ? 'Quitar admin' : 'Dar admin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleManager(u.user_id, !(u.roles || []).includes('manager'))}>
                        {(u.roles || []).includes('manager') ? 'Quitar manager' : 'Dar manager'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={u.user_id === user?.id}
                        onClick={() => setDeleteModal({ open: true, userId: u.user_id, email: u.email })}
                      >
                        Forzar eliminación de cuenta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrando {Math.min(page * pageSize + 1, total)}–{Math.min((page + 1) * pageSize, total)} de {total.toLocaleString()}</span>
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <span>por página</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          {getPageNumbers().map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p)}>{p + 1}</Button>
            )
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <AdminUserModals
        creditModal={creditModal}
        setCreditModal={setCreditModal}
        deleteModal={deleteModal}
        setDeleteModal={setDeleteModal}
        onRefresh={load}
      />

      <UserDetailSheet user={selectedUser} open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)} />

      <AlertDialog open={bulkConfirm.open} onOpenChange={open => !open && setBulkConfirm({ open: false, op: null, label: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción en bloque</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres {bulkConfirm.label} a {selectedIds.size} usuario{selectedIds.size === 1 ? '' : 's'}? Esta acción quedará registrada en el log de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkConfirm.op && runBulk(bulkConfirm.op)}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
