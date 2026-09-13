import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { AudioContentRisk } from "@/lib/validateAudioContent";

interface ContentWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk: Exclude<AudioContentRisk, "none">;
  detected: string[];
  explanation?: string;
  onContinue: () => void;
}

export function ContentWarningDialog({
  open,
  onOpenChange,
  risk,
  detected,
  explanation,
  onContinue,
}: ContentWarningDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {t("aiCreate.contentWarningTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                {risk === "copyrighted_lyrics"
                  ? t("aiCreate.contentWarningLyricsDesc")
                  : t("aiCreate.contentWarningArtistDesc")}
              </p>
              {explanation && <p className="text-sm italic text-muted-foreground">{explanation}</p>}
              {detected.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("aiCreate.contentWarningDetected")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {detected.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t("aiCreate.contentWarningNoCharge")}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("aiCreate.contentWarningEdit")}</AlertDialogCancel>
          <Button variant="outline" onClick={onContinue}>
            {t("aiCreate.contentWarningContinue")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
