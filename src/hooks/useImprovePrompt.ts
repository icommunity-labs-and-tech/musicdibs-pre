import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  improvePrompt,
  runAiAction,
  type ImprovePromptInput,
} from "@/services/aiStudioApi";

interface UseImprovePromptOptions {
  /** Max length to trim the improved text to. Default 2500. */
  maxLength?: number;
  /** Toast shown when improvement succeeds. Falsy disables it. */
  successMessage?: string | null;
  /** Override the error toast label. */
  errorMessage?: string;
}

/**
 * Shared hook for the "Improve with AI" button used across AI Studio and
 * promo modules. Exposes `improve` + `isImproving`, and takes care of
 * error normalization + trimming to a configurable max length.
 */
export function useImprovePrompt(options: UseImprovePromptOptions = {}) {
  const { t } = useTranslation();
  const [isImproving, setIsImproving] = useState(false);

  const {
    maxLength = 2500,
    successMessage,
    errorMessage,
  } = options;

  const improve = useCallback(
    async (input: ImprovePromptInput): Promise<string | null> => {
      if (!input.prompt?.trim()) return null;
      setIsImproving(true);
      const result = await runAiAction(() => improvePrompt(input, maxLength));
      setIsImproving(false);
      if (!result.ok) {
        toast.error(errorMessage ?? t("aiShared.error"));
        return null;
      }
      if (successMessage !== null) {
        toast.success(successMessage ?? t("aiShared.improved", "Descripción mejorada"));
      }
      return result.data.improved;
    },
    [maxLength, successMessage, errorMessage, t],
  );

  return { improve, isImproving };
}
