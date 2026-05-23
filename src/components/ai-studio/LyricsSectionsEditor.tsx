import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (next: string) => void;
  context: Record<string, string | undefined>;
}

export function LyricsSectionsEditor({ value, onChange }: Props) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono text-sm leading-relaxed min-h-[280px] bg-background"
    />
  );
}
