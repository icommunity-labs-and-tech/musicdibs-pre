import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, Plus } from 'lucide-react';
import type { DraftWork } from '@/services/dashboardApi';

interface DraftsModalProps {
  open: boolean;
  drafts: DraftWork[];
  onContinue: (draftId: string) => void;
  onStartNew: () => void;
}

export function DraftsModal({ open, drafts, onContinue, onStartNew }: DraftsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onStartNew(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tienes {drafts.length} {drafts.length === 1 ? 'obra sin terminar' : 'obras sin terminar'}</DialogTitle>
          <DialogDescription>
            ¿Quieres continuar con un borrador o empezar un registro nuevo?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                  <FileText className="h-4 w-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.title || 'Sin título'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => onContinue(d.id)}>
                Continuar <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onStartNew} className="gap-1">
            <Plus className="h-4 w-4" /> Empezar registro nuevo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
