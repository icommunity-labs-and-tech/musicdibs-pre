import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

/**
 * Small trust badge shown on AI Studio pages that use KIE/Suno technology.
 * Copy is translated in i18nAIStudio.ts under aiShared.poweredBySuno.
 */
export function PoweredBySunoBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="secondary"
      className={
        "inline-flex items-center gap-1.5 font-medium " +
        "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 " +
        (className || "")
      }
    >
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      {t("aiShared.poweredBySuno", "Tecnología Suno")}
    </Badge>
  );
}
