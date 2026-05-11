import { lazy, type ComponentType } from "react";

const DYNAMIC_IMPORT_RELOAD_KEY = "lazy-dynamic-import-reload";
const PRELOAD_ERROR_RELOAD_KEY = "vite-preload-error-reload";

const browserWindow =
  typeof window === "undefined"
    ? null
    : (window as Window & { __lazyImportRecoveryInstalled?: boolean });

function reloadOnce(storageKey: string) {
  if (!browserWindow) return false;

  try {
    const alreadyReloaded = browserWindow.sessionStorage.getItem(storageKey) === "true";
    if (alreadyReloaded) {
      browserWindow.sessionStorage.removeItem(storageKey);
      return false;
    }

    browserWindow.sessionStorage.setItem(storageKey, "true");
  } catch {
    // Ignore storage access issues and still try a hard reload.
  }

  browserWindow.location.reload();
  return true;
}

function isChunkLoadError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    /Importing a module script failed/i.test(error.message) ||
    /Loading chunk \d+ failed/i.test(error.message) ||
    /error loading dynamically imported module/i.test(error.message)
  );
}

function installPreloadErrorRecovery() {
  if (!browserWindow || browserWindow.__lazyImportRecoveryInstalled) return;

  browserWindow.__lazyImportRecoveryInstalled = true;
  browserWindow.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce(PRELOAD_ERROR_RELOAD_KEY);
  });
}

installPreloadErrorRecovery();

type ImportFactory<T extends ComponentType<any>> = () => Promise<{ default: T }>;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function lazyWithRetry<T extends ComponentType<any>>(importFactory: ImportFactory<T>) {
  return lazy(async () => {
    const tryImport = async () => {
      const mod = await importFactory();
      if (!mod || typeof (mod as any).default === "undefined") {
        throw new Error("Dynamic import resolved without a default export");
      }
      return mod;
    };

    try {
      const module = await tryImport();
      try {
        browserWindow?.sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_KEY);
      } catch {
        // Ignore storage cleanup issues.
      }
      return module;
    } catch (firstError) {
      // Retry once after a small delay (handles transient network/chunk hiccups)
      try {
        await sleep(300);
        const module = await tryImport();
        try {
          browserWindow?.sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_KEY);
        } catch {
          // ignore
        }
        return module;
      } catch (secondError) {
        if (isChunkLoadError(secondError) || isChunkLoadError(firstError)) {
          if (reloadOnce(DYNAMIC_IMPORT_RELOAD_KEY)) {
            // Suspend forever while the page reloads
            return new Promise<never>(() => {});
          }
        }
        throw secondError;
      }
    }
  });
}
