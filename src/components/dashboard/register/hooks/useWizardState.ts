import { useCallback, useState } from 'react';
import { initialWizardData, type WizardData } from '../types';

interface Prefill {
  title?: string;
  type?: string;
  description?: string;
  audioUrl?: string;
}

/**
 * Centralised wizard state: form data, current step and result payload.
 * Extracted from RegistrationWizard to keep the component thin and
 * make the state transitions easier to test.
 */
export function useWizardState(prefill?: Prefill) {
  const [data, setData] = useState<WizardData>(() => {
    const init = { ...initialWizardData };
    if (prefill) {
      if (prefill.title) init.title = prefill.title;
      if (prefill.type) init.workType = prefill.type;
      if (prefill.description) init.description = prefill.description;
      if (prefill.audioUrl) init.aiAudioUrl = prefill.audioUrl;
    }
    return init;
  });

  const [step, setStep] = useState(-1);
  const [resultId, setResultId] = useState('');
  const [resultHash, setResultHash] = useState('');

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setData({ ...initialWizardData });
    setStep(-1);
    setResultId('');
    setResultHash('');
  }, []);

  return {
    data,
    setData,
    step,
    setStep,
    resultId,
    setResultId,
    resultHash,
    setResultHash,
    update,
    reset,
  };
}
