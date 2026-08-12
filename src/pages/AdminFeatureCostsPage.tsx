import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Save, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<string, string> = {
  gratis: 'Gratis',
  registro: 'Registro',
  distribucion: 'Distribución',
  musica: 'Creación musical',
  audio: 'Audio y voz',
  visual: 'Imagen y vídeo',
  promo: 'Promoción',
};
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

// Default emoji icons for rows without an explicit icon. Key-specific entries take precedence;
// otherwise we fall back to the category. Used for the auto-assign helper and the preview fallback.
const DEFAULT_ICON_BY_KEY: Record<string, string> = {
  register_work: '📝',
  promote_work: '📢',
  promote_premium: '⭐',
  generate_audio: '🎵',
  generate_audio_song: '🎶',
  generate_audio_elevenlabs: '🎶',
  generate_vocal_track_kie: '🎙️',
  clone_voice: '🎤',
  edit_audio: '✂️',
  enhance_audio: '✨',
  enhance_add_vocals: '🎤',
  enhance_cover: '🔄',
  enhance_extend: '⏩',
  enhance_instrumental: '🎹',
  generate_cover: '🎨',
  generate_lyrics: '🎼',
  generate_press_release: '📰',
  generate_video: '🎬',
  improve_prompt: '💡',
  instagram_creative: '📸',
  youtube_thumbnail: '▶️',
  event_poster: '📅',
  social_poster: '📢',
  social_video: '📱',
  midi_generate: '🎹',
  one_click_create: '⚡',
  voice_translation_per_min: '🗣️',
  promo_social_regenerate_copies: '📝',
  promo_social_regenerate_image: '🖼️',
  distribution_single_annual: '🌍',
  distribution_album_annual: '🌐',
  distribution_single_monthly: '🌍',
  distribution_album_monthly: '🌐',
  distribution_single_free: '🆓',
  distribution_album_free: '🆓',
};

const DEFAULT_ICON_BY_CATEGORY: Record<string, string> = {
  gratis: '🎁',
  registro: '📝',
  distribucion: '🌐',
  musica: '🎵',
  audio: '🎙️',
  visual: '🎨',
  promo: '📢',
  promotion: '📢',
};

const getDefaultIcon = (key: string, category: string) =>
  DEFAULT_ICON_BY_KEY[key] || DEFAULT_ICON_BY_CATEGORY[category] || '•';

interface OperationRow {
  operation_key: string;
  operation_name: string;
  operation_icon: string | null;
  credits_cost: number;
  euro_cost: number | null;
  category: string;
  is_annual_only: boolean | null;
  display_order: number;
  is_active: boolean | null;
  description: string | null;
  model_name: string | null;
  llm_provider: string | null;
  llm_model: string | null;
}

type SortField = 'operation_key' | 'operation_name' | 'category' | 'credits_cost' | 'display_order' | 'is_annual_only' | 'is_active';
type SortDir = 'asc' | 'desc';

export default function AdminFeatureCostsPage() {
  const [rows, setRows] = useState<OperationRow[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<OperationRow>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('display_order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const load = async () => {
    // FIX 2026-07-19 (security scan): model_name/llm_provider/llm_model ya no
    // son legibles directamente por authenticated -- se leen via RPC admin-only.
    const { data, error } = await supabase.rpc('get_operation_pricing_admin');
    if (error) {
      toast.error('Error cargando precios');
      return;
    }
    const sorted = ((data as unknown as OperationRow[]) || []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    setRows(sorted);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const sortedRows = [...rows].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = a[sortField]; const bv = b[sortField];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    if (typeof av === 'boolean' && typeof bv === 'boolean') return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
    return 0;
  });

  const handleChange = (key: string, field: keyof OperationRow, value: string | number | boolean) => {
    setEditing(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'credits_cost' || field === 'display_order' ? parseInt(String(value)) || 0 : value,
      },
    }));
  };

  const handleSave = async (row: OperationRow) => {
    const changes = editing[row.operation_key];
    if (!changes) return;

    setSaving(row.operation_key);
    const updatePayload: Partial<OperationRow> = {};
    const fields: (keyof OperationRow)[] = [
      'operation_name', 'credits_cost', 'description', 'operation_icon',
      'model_name', 'llm_provider', 'llm_model', 'category', 'is_annual_only',
    ];
    for (const f of fields) {
      if (changes[f] !== undefined) (updatePayload as Record<string, unknown>)[f] = changes[f];
    }

    const { error } = await supabase
      .from('operation_pricing')
      .update(updatePayload)
      .eq('operation_key', row.operation_key);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`"${row.operation_key}" actualizado`);
      setEditing(prev => { const next = { ...prev }; delete next[row.operation_key]; return next; });
      await load();
    }
    setSaving(null);
  };

  const handleDelete = async (row: OperationRow) => {
    setDeleting(row.operation_key);
    const { error } = await supabase
      .from('operation_pricing')
      .delete()
      .eq('operation_key', row.operation_key);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`"${row.operation_key}" eliminado`);
      await load();
    }
    setDeleting(null);
  };

  const autoAssignMissingIcons = async () => {
    const missing = rows.filter(r => !r.operation_icon);
    if (missing.length === 0) {
      toast.info('Todas las filas ya tienen icono');
      return;
    }
    setAutoAssigning(true);
    let updated = 0;
    for (const row of missing) {
      const icon = getDefaultIcon(row.operation_key, row.category);
      const { error } = await supabase
        .from('operation_pricing')
        .update({ operation_icon: icon })
        .eq('operation_key', row.operation_key);
      if (error) {
        toast.error(`Error actualizando ${row.operation_key}: ${error.message}`);
      } else {
        updated++;
      }
    }
    toast.success(`${updated} de ${missing.length} iconos asignados`);
    await load();
    setAutoAssigning(false);
  };

  const getValue = <K extends keyof OperationRow>(row: OperationRow, field: K): OperationRow[K] => {
    return (editing[row.operation_key]?.[field] ?? row[field]) as OperationRow[K];
  };

  const isDirty = (key: string) => !!editing[key];

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginatedRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const SortableHead = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button type="button" className="flex items-center gap-0.5 hover:text-foreground transition-colors" onClick={() => handleSort(field)}>
        {children}
        <SortIcon field={field} />
      </button>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="rounded-md border">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Precios por Operación</h1>
      <p className="text-sm text-muted-foreground">
        Gestiona los precios de cada operación. Todos los campos son editables. El campo €/operación se calcula automáticamente (créditos × 0,60€).
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tabla de precios ({rows.length} operaciones)</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={autoAssignMissingIcons}
              disabled={autoAssigning}
              title="Rellenar iconos por defecto en las filas vacías"
            >
              {autoAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Auto-asignar iconos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Icono</TableHead>
                  <SortableHead field="operation_key" className="w-[150px]">Clave</SortableHead>
                  <TableHead className="w-[220px]">Modelo IA (proveedor · modelo)</TableHead>
                  <SortableHead field="operation_name" className="w-[180px]">Nombre</SortableHead>
                  <SortableHead field="category" className="w-[140px]">Categoría</SortableHead>
                  <SortableHead field="credits_cost" className="w-[80px]">Créditos</SortableHead>
                  <TableHead className="w-[80px]">€/op</TableHead>
                  <TableHead className="w-[200px]">Descripción (tooltip)</TableHead>
                  <SortableHead field="is_annual_only" className="w-[70px]">Anual</SortableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map(row => (
                  <TableRow key={row.operation_key} className={!row.is_active ? 'opacity-40' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={String(getValue(row, 'operation_icon') || '')}
                          onChange={e => handleChange(row.operation_key, 'operation_icon', e.target.value)}
                          className="h-8 w-12 text-center"
                        />
                        {!getValue(row, 'operation_icon') && (
                          <span className="text-lg opacity-50" title="Icono por defecto">
                            {getDefaultIcon(row.operation_key, row.category)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.operation_key}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          value={String(getValue(row, 'llm_provider') || '')}
                          onChange={e => handleChange(row.operation_key, 'llm_provider', e.target.value)}
                          placeholder="Proveedor"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={String(getValue(row, 'llm_model') || '')}
                          onChange={e => handleChange(row.operation_key, 'llm_model', e.target.value)}
                          placeholder="Modelo"
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={String(getValue(row, 'operation_name') || '')}
                        onChange={e => handleChange(row.operation_key, 'operation_name', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(getValue(row, 'category') || '')}
                        onValueChange={v => handleChange(row.operation_key, 'category', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_KEYS.map(k => (
                            <SelectItem key={k} value={k}>{CATEGORY_LABELS[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={String(getValue(row, 'credits_cost'))}
                        onChange={e => handleChange(row.operation_key, 'credits_cost', e.target.value)}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {((getValue(row, 'credits_cost') || 0) * 0.60).toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={String(getValue(row, 'description') || '')}
                        onChange={e => handleChange(row.operation_key, 'description', e.target.value)}
                        placeholder="Descripción para tooltip..."
                        className="h-16 min-h-[40px] text-xs resize-y"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!!getValue(row, 'is_annual_only')}
                        onCheckedChange={(v) => handleChange(row.operation_key, 'is_annual_only', v)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={isDirty(row.operation_key) ? 'default' : 'ghost'}
                          disabled={!isDirty(row.operation_key) || saving === row.operation_key}
                          onClick={() => handleSave(row)}
                          title="Guardar cambios"
                        >
                          {saving === row.operation_key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deleting === row.operation_key}
                              title="Eliminar fila"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deleting === row.operation_key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar operación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vas a eliminar <span className="font-mono font-semibold">{row.operation_key}</span> ({row.operation_name}).
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(row)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {sortedRows.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pg: number;
                    if (totalPages <= 5) pg = i + 1;
                    else if (page <= 3) pg = i + 1;
                    else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                    else pg = page - 2 + i;
                    return (
                      <PaginationItem key={pg}>
                        <PaginationLink
                          isActive={pg === page}
                          onClick={() => setPage(pg)}
                          className="cursor-pointer"
                        >
                          {pg}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
