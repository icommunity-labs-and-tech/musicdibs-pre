import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const CONSENT_STORAGE_KEY = "cookie_consent";
const REOPEN_KEY = "cookie_consent_reopen";

// Regiones que exigen consentimiento (EEE + Reino Unido + Suiza + Quebec)
const CONSENT_COUNTRIES = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH','CA',
];

export async function isConsentRequiredRegion(): Promise<boolean> {
  try {
    const res = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return true;
    const country = (await res.text()).match(/^loc=([A-Z0-9]{2})$/m)?.[1];
    if (!country || country === "XX" || country === "T1") return true;
    return CONSENT_COUNTRIES.includes(country);
  } catch {
    return true;
  }
}

/** Veredicto de consentimiento para cualquier puerta de envío de datos. */
export async function hasAdConsent(): Promise<boolean> {
  const choice = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (choice) return choice === "granted";
  if (sessionStorage.getItem(REOPEN_KEY)) return false;
  return !(await isConsentRequiredRegion());
}

function updateConsent(decision: "granted" | "denied") {
  window.gtag?.("consent", "update", {
    ad_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
    analytics_storage: decision,
  });
}

/** Reabre el banner (enlace "Configuración de cookies" del footer). */
export function reopenCookieSettings() {
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  sessionStorage.setItem(REOPEN_KEY, "1");
  location.reload();
}

const STRINGS: Record<string, { message: string; accept: string; reject: string; label: string }> = {
  es: {
    message: "Usamos cookies para medir la eficacia de nuestros anuncios y el uso de la plataforma. Puedes aceptarlas o rechazarlas; tu elección se puede cambiar en cualquier momento desde el pie de página.",
    accept: "Aceptar",
    reject: "Rechazar",
    label: "Consentimiento de cookies",
  },
  en: {
    message: "We use cookies to measure our ads and platform usage. You can accept or reject them; you can change your choice anytime from the footer.",
    accept: "Accept",
    reject: "Reject",
    label: "Cookie consent",
  },
  "pt-BR": {
    message: "Usamos cookies para medir a eficácia dos nossos anúncios e o uso da plataforma. Você pode aceitá-los ou rejeitá-los; sua escolha pode ser alterada a qualquer momento no rodapé.",
    accept: "Aceitar",
    reject: "Rejeitar",
    label: "Consentimento de cookies",
  },
};

export function ConsentBanner() {
  const { i18n } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (saved === "granted" || saved === "denied") {
      updateConsent(saved);
      return;
    }
    if (sessionStorage.getItem(REOPEN_KEY)) {
      setShow(true);
      return;
    }
    let cancelled = false;
    isConsentRequiredRegion().then((required) => {
      if (required && !cancelled) setShow(true);
    });
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const strings = STRINGS[lang] || STRINGS[lang.split("-")[0]] || STRINGS.en;

  const decide = (decision: "granted" | "denied") => {
    localStorage.setItem(CONSENT_STORAGE_KEY, decision);
    sessionStorage.removeItem(REOPEN_KEY);
    updateConsent(decision);
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label={strings.label}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-lg"
    >
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">{strings.message}</p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => decide("denied")}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {strings.reject}
          </button>
          <button
            onClick={() => decide("granted")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {strings.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
