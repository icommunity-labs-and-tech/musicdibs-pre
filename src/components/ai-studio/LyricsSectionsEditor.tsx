import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Pencil, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Section {
  id: string;
  label: string;
  body: string;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  context: {
    description?: string;
    genre?: string;
    mood?: string;
    style?: string;
    language?: string;
    rhymeScheme?: string;
    pov?: string;
  };
}

// Only square-bracket headers count as section delimiters.
// Parenthetical lines like "(full energy, catchy melody)" are content, not headers.
const HEADER_RE = /^\s*\[\s*([^\]]{1,60})\s*\]\s*$/;

function parseLyrics(text: string): Section[] {
  const lines = (text || "").split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  let counter = 0;
  const pushCurrent = () => {
    if (current) {
      current.body = current.body.replace(/^\n+|\s+$/g, "");
      if (current.label || current.body.trim()) sections.push(current);
    }
  };
  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m) {
      pushCurrent();
      current = { id: `s-${counter++}`, label: m[1].trim(), body: "" };
    } else {
      if (!current) current = { id: `s-${counter++}`, label: "", body: "" };
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  pushCurrent();
  return sections;
}

function assemble(sections: Section[]): string {
  return sections
    .map((s) => (s.label ? `[${s.label}]\n${s.body}`.trimEnd() : s.body.trimEnd()))
    .filter((b) => b.length > 0)
    .join("\n\n");
}

function preview(body: string): string {
  const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 2);
  const text = lines.join(" · ");
  return text.length > 90 ? text.slice(0, 87) + "…" : text;
}

export function LyricsSectionsEditor({ value, onChange, context }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<string>("");
  const lastEmittedRef = useRef<string>(value);

  const sections = useMemo(() => parseLyrics(value), [value]);

  const emit = (next: string) => {
    lastEmittedRef.current = next;
    onChange(next);
  };

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setDraft(sections[idx].body);
  };
  const saveEdit = () => {
    if (editIdx === null) return;
    const next = sections.map((s, i) => (i === editIdx ? { ...s, body: draft } : s));
    emit(assemble(next));
    setEditIdx(null);
  };
  const cancelEdit = () => setEditIdx(null);

  const regenerateSection = async (idx: number) => {
    const section = sections[idx];
    if (!section.label) return;
    setRegenIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("lyrics-generator", {
        body: {
          description: context.description,
          genre: context.genre,
          mood: context.mood,
          style: context.style,
          language: context.language,
          rhymeScheme: context.rhymeScheme,
          pov: context.pov,
          regenerateSection: section.label,
          existingLyrics: value,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      const newFull: string = (data as any).lyrics || "";
      const parsed = parseLyrics(newFull);
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      const match = parsed.find((p) => norm(p.label) === norm(section.label));
      if (match) {
        const next = sections.map((s, i) => (i === idx ? { ...s, body: match.body } : s));
        emit(assemble(next));
      } else {
        emit(newFull);
      }
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" });
    } finally {
      setRegenIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Main editable textarea: always visible, shows full lyrics */}
      <Textarea
        value={value}
        onChange={(e) => emit(e.target.value)}
        className="font-mono text-sm leading-relaxed min-h-[280px] bg-background"
      />

      {/* Compact section list below, for quick per-section edit/regen */}
      {sections.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/20 divide-y divide-border/40">
          {sections.map((s, idx) => {
            const isEditing = editIdx === idx;
            const isRegen = regenIdx === idx;
            return (
              <div key={s.id} className="px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-primary shrink-0 min-w-[64px]">
                    {s.label || "—"}
                  </span>
                  {!isEditing && (
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {preview(s.body) || <em className="opacity-60">…</em>}
                    </span>
                  )}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(idx)}
                        disabled={regenIdx !== null}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {s.label && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => regenerateSection(idx)}
                          disabled={regenIdx !== null}
                          title="Regenerate"
                        >
                          {isRegen ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="font-mono text-sm leading-relaxed min-h-[160px] bg-background"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
