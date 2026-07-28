import { useMemo } from 'react';

type GtagWindow = Window & {
  gtag?: (command: 'event', eventName: string, parameters: Record<string, string | number>) => void;
};

export interface ABVariant {
  text: string;
  variant?: string;
  className?: string;
}

export interface ABTest {
  id: string;
  variants: ABVariant[];
}

const getSessionId = (): string => {
  const key = 'ab_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
};

const persistEvent = (testId: string, variantIndex: number, variantText: string, eventType: 'impression' | 'click') => {
  try {
    const storageKey = 'ab_test_events_buffer';
    const stored = window.localStorage.getItem(storageKey);
    const events = stored ? JSON.parse(stored) as Array<Record<string, string | number>> : [];
    events.push({
      test_id: testId,
      variant_index: variantIndex,
      variant_text: variantText,
      event_type: eventType,
      session_id: getSessionId(),
      created_at: Date.now(),
    });
    window.localStorage.setItem(storageKey, JSON.stringify(events.slice(-100)));
  } catch {
    // Public landing telemetry must never affect rendering or media playback.
  }
};

export const useABTest = (test: ABTest): ABVariant & { variantIndex: number } => {
  const { id, variants } = test;

  const variantIndex = useMemo(() => {
    const storageKey = `ab_${id}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored !== null) {
      const idx = parseInt(stored, 10);
      if (idx >= 0 && idx < variants.length) return idx;
    }
    const idx = Math.floor(Math.random() * variants.length);
    sessionStorage.setItem(storageKey, String(idx));

    // GA4 event
    if (typeof window !== 'undefined' && (window as GtagWindow).gtag) {
      (window as GtagWindow).gtag?.('event', 'ab_test_impression', {
        test_id: id,
        variant_index: idx,
        variant_text: variants[idx].text,
      });
    }

    // Persist to DB
    persistEvent(id, idx, variants[idx].text, 'impression');

    return idx;
  }, [id, variants.length]);

  return { ...variants[variantIndex], variantIndex };
};

export const trackABClick = (testId: string, variantIndex: number, label: string) => {
  if (typeof window !== 'undefined' && (window as GtagWindow).gtag) {
    (window as GtagWindow).gtag?.('event', 'ab_test_click', {
      test_id: testId,
      variant_index: variantIndex,
      variant_text: label,
    });
  }
  persistEvent(testId, variantIndex, label, 'click');
};
