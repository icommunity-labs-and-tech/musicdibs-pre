/**
 * Persistencia de los identificadores de clic de Google Ads (gclid, gbraid,
 * wbraid) durante 90 días, con criterio last-click: un clic nuevo sobrescribe
 * al anterior. Así la compra conserva el origen aunque el usuario se registre,
 * confirme el email y pague en otra sesión.
 */

const STORAGE_KEY = 'md_gclick';
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface GoogleClickIds {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
}

interface StoredClickIds extends GoogleClickIds {
  captured_at: number;
}

const KEYS = ['gclid', 'gbraid', 'wbraid'] as const;

function readFromUrl(): GoogleClickIds {
  const result: GoogleClickIds = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of KEYS) {
      const value = params.get(key)?.trim();
      if (value) result[key] = value.slice(0, 500);
    }
  } catch { /* ignore */ }
  return result;
}

function hasAny(ids: GoogleClickIds): boolean {
  return KEYS.some((key) => Boolean(ids[key]));
}

function readStored(): GoogleClickIds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Partial<StoredClickIds>;
    if (typeof data.captured_at !== 'number' || Date.now() - data.captured_at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
    const result: GoogleClickIds = {};
    for (const key of KEYS) {
      const value = data[key];
      if (typeof value === 'string' && value) result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

/** Guarda los click IDs de la URL actual (si hay alguno), sustituyendo a los anteriores. */
export function captureGoogleClickIds(): void {
  const fromUrl = readFromUrl();
  if (!hasAny(fromUrl)) return;
  try {
    const data: StoredClickIds = { ...fromUrl, captured_at: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* localStorage bloqueado o lleno */ }
}

/** Click IDs vigentes: los de la URL actual tienen prioridad sobre los guardados. */
export function getGoogleClickIds(): GoogleClickIds {
  const fromUrl = readFromUrl();
  return hasAny(fromUrl) ? fromUrl : readStored();
}
