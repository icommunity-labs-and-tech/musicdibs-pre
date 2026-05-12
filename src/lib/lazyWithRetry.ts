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

function isMissingDefaultExportError(error: unknown) {
  return error instanceof Error && /Dynamic import resolved without a default export/i.test(error.message);
}

function isEmptyModuleError(error: unknown) {
  return error instanceof Error && /Dynamic import resolved to empty module/i.test(error.message);
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

type LazyModule<T extends ComponentType<unknown>> = { default?: T } & Record<string, unknown>;
type ImportFactory<T extends ComponentType<unknown>> = () => Promise<LazyModule<T>>;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function lazyWithRetry<T extends ComponentType<unknown>>(importFactory: ImportFactory<T>) {
  return lazy(async () => {
    const tryImport = async (): Promise<{ default: T }> => {
      const mod = await importFactory();
      if (!mod) {
        throw new Error("Dynamic import resolved to empty module");
      }
      if (typeof mod.default === "undefined") {
        // Fall back to the first function/class export (covers components
        // re-exported as named exports without a default).
        const firstComponent = Object.values(mod).find(
          (v) => typeof v === "function"
        );
        if (firstComponent) {
          return { default: firstComponent as T };
        }
        throw new Error("Dynamic import resolved without a default export");
      }
      return { default: mod.default };
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
        if (
          isChunkLoadError(secondError) ||
          isChunkLoadError(firstError) ||
          isMissingDefaultExportError(secondError) ||
          isMissingDefaultExportError(firstError)
        ) {
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
