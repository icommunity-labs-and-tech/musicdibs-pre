import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Section {
  id: string;
  label: string;        // e.g. "Verso 1", "Coro" — empty for pre-header content
  open: "[" | "(";      // bracket style preserved
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

const HEADER_RE = /^\s*([\[\(])\s*([^\]\)]{1,40})\s*([\]\)])\s*$/;

function parseLyrics(text: string): Section[] {
  const lines = (text || "").split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  let counter = 0;
  const pushCurrent = () => {
    if (current) {
      current.body = current.body.replace(/\s+$/g, "");
      sections.push(current);
    }
  };
  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m) {
      pushCurrent();
      current = {
        id: `s-${counter++}`,
        label: m[2].trim(),
        open: m[1] === "(" ? "(" : "[",
        body: "",
      };
    } else {
      if (!current) {
        current = { id: `s-${counter++}`, label: "", open: "[", body: "" };
      }
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  pushCurrent();
  // Trim leading blank lines in each body
  return sections.map((s) => ({ ...s, body: s.body.replace(/^\n+/, "") }));
}

function assemble(sections: Section[]): string {
  return sections
    .map((s) =>
      s.label
        ? `${s.open}${s.label}${s.open === "(" ? ")" : "]"}\n${s.body}`.trim()
        : s.body.trim()
    )
    .filter((b) => b.length > 0)
    .join("\n\n");
}

export function LyricsSectionsEditor({ value, onChange, context }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>(() => parseLyrics(value));
  const [regenIdx, setRegenIdx] = useState<number | null>(null);

  // Re-parse only when external value differs from our assembled value (new generation).
  const assembled = useMemo(() => assemble(sections), [sections]);
  useEffect(() => {
    if (value !== assembled) {
      setSections(parseLyrics(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Propagate edits upward
  useEffect(() => {
    if (assembled !== value) onChange(assembled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assembled]);

  const updateBody = (idx: number, body: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, body } : s)));
  };

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
          existingLyrics: assembled,
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message);
      }
      const newFull: string = (data as any).lyrics || "";
      const parsed = parseLyrics(newFull);
      // Find matching section by normalized label
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      const match = parsed.find((p) => norm(p.label) === norm(section.label));
      if (match) {
        setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, body: match.body } : s)));
      } else {
        // Fallback: replace whole lyrics
        setSections(parsed);
      }
      toast({ title: t("aiCreate.lyricsGenerated") });
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" });
    } finally {
      setRegenIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      {sections.map((s, idx) => (
        <div key={s.id} className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {s.label || "—"}
            </span>
            {s.label && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => regenerateSection(idx)}
                disabled={regenIdx !== null}
              >
                {regenIdx === idx ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {t("aiCreate.regenSection").replace(":", "")}
              </Button>
            )}
          </div>
          <Textarea
            value={s.body}
            onChange={(e) => updateBody(idx, e.target.value)}
            className="font-mono text-sm leading-relaxed min-h-[100px] bg-background"
            disabled={regenIdx === idx}
          />
        </div>
      ))}
    </div>
  );
}
