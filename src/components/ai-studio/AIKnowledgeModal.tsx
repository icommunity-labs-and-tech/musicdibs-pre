import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Headphones, Target, RotateCw, Pencil, SlidersHorizontal, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "musicdibs:ai-knowledge-seen";
const DONT_SHOW_KEY = "musicdibs:ai-knowledge-dont-show";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const AIKnowledgeModal = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const [dontShow, setDontShow] = useState(false);

  const blocks = [
    { Icon: Target, title: t("aiStudio.knowledge.notExactTitle"), desc: t("aiStudio.knowledge.notExactDesc") },
    { Icon: RotateCw, title: t("aiStudio.knowledge.iterateTitle"), desc: t("aiStudio.knowledge.iterateDesc") },
    { Icon: Pencil, title: t("aiStudio.knowledge.clearTitle"), desc: t("aiStudio.knowledge.clearDesc") },
    { Icon: SlidersHorizontal, title: t("aiStudio.knowledge.adjustTitle"), desc: t("aiStudio.knowledge.adjustDesc") },
    { Icon: AlertTriangle, title: t("aiStudio.knowledge.importantTitle"), desc: t("aiStudio.knowledge.importantDesc"), warn: true },
  ];

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    if (dontShow) localStorage.setItem(DONT_SHOW_KEY, "1");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Headphones className="w-5 h-5 text-primary" />
            {t("aiStudio.knowledge.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {blocks.map(({ Icon, title, desc, warn }, i) => (
            <div
              key={i}
              className={`flex gap-3 p-3 rounded-lg border ${warn ? "border-amber-500/40 bg-amber-500/5" : "border-border/40 bg-muted/30"}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${warn ? "text-amber-500" : "text-primary"}`} />
              <div>
                <p className="font-semibold text-sm mb-0.5">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox checked={dontShow} onCheckedChange={(v) => setDontShow(!!v)} />
            {t("aiStudio.knowledge.dontShowAgain")}
          </label>
          <Button onClick={handleClose}>👉 {t("aiStudio.knowledge.gotIt")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useAIKnowledgeAutoShow = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    const dontShow = localStorage.getItem(DONT_SHOW_KEY);
    if (!seen && !dontShow) setOpen(true);
  }, []);
  return [open, setOpen] as const;
};
