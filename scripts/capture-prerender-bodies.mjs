#!/usr/bin/env node
/**
 * Capture real rendered body HTML for the SEO landing routes.
 *
 * Why this exists
 * ---------------
 * `scripts/prerender-seo.mjs` rewrites the <head> of every SEO route but used
 * to leave the SPA's empty `<div id="root">` placeholder in the <body>.
 * Googlebot renders JS only opportunistically, so those pages were served as a
 * generic loading shell marked `aria-hidden="true"` — Google classified them
 * as Soft 404 and dropped them from the index.
 *
 * This script loads each route in a real headless browser against the built
 * `dist/`, waits for React to render, and stores the resulting `#root` markup
 * as a snapshot under `prerender-bodies/`. The postbuild step then injects the
 * snapshot into the static HTML for that route, so a crawler without JS gets
 * substantial content while real users still hydrate the SPA on top.
 *
 * Snapshots are committed to the repo so production builds never depend on a
 * browser being installed. Re-run this after meaningful copy or layout changes:
 *
 *   npm run build && node scripts/capture-prerender-bodies.mjs
 *
 * Requires a Chromium binary. Set PLAYWRIGHT_CHROMIUM_PATH when it is not in
 * the default Playwright cache.
 */
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROUTES, snapshotFileName } from "./prerender-routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const OUT_DIR = path.resolve(__dirname, "..", "prerender-bodies");
const PORT = Number(process.env.PRERENDER_PORT || 4317);
const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY || 4);
const NAV_TIMEOUT = 45_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
};

/** Static file server with SPA fallback, so every route resolves to the app. */
const startServer = () =>
  new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const candidate = path.join(DIST, urlPath);
      // Never escape dist/
      if (!candidate.startsWith(DIST)) {
        res.writeHead(403).end();
        return;
      }
      let filePath = candidate;
      try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
      } catch {
        filePath = path.join(DIST, "index.html"); // SPA fallback
      }
      try {
        const body = await fs.readFile(filePath);
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        });
        res.end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    server.on("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });

const loadBrowser = async () => {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    try {
      ({ chromium } = await import("playwright"));
    } catch {
      throw new Error(
        "playwright-core is not installed. Run `npm i -D playwright-core` to capture snapshots.",
      );
    }
  }
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  return chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
};

/**
 * Strip everything a crawler should not see in a static snapshot:
 * interactive-only attributes, portals, and the loading shell.
 */
const CLEANUP_IN_PAGE = () => {
  const root = document.getElementById("root");
  if (!root) return "";
  root.querySelectorAll(".app-lcp-shell").forEach((el) => el.remove());
  // The cookie dialog is the first node in the DOM; leaving it in the snapshot
  // makes the consent copy the first text a crawler reads on every page.
  root.querySelectorAll('[role="dialog"], [role="alertdialog"]').forEach((el) => el.remove());

  // Radix/portal containers and toasts render outside #root, but any leftover
  // aria-hidden wrappers inside would tell Google the content is decorative.
  root.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
    if (el.textContent && el.textContent.trim().length > 120) el.removeAttribute("aria-hidden");
  });
  // Drop media that would trigger a download for a crawler.
  root.querySelectorAll("video source, video").forEach((el) => el.removeAttribute("autoplay"));
  return root.innerHTML;
};

const capture = async (browser, route) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1600 },
    locale: route.locale === "en" ? "en-GB" : route.locale === "pt-BR" ? "pt-BR" : "es-ES",
    userAgent:
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) prerender-capture",
  });
  const page = await context.newPage();
  try {
    await page.goto(`http://127.0.0.1:${PORT}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT,
    });
    // Wait until React has replaced the loading shell with real content.
    await page.waitForFunction(
      () => {
        const root = document.getElementById("root");
        if (!root) return false;
        if (root.querySelector(".app-lcp-shell")) return false;
        return (root.textContent || "").trim().length > 400;
      },
      undefined,
      { timeout: NAV_TIMEOUT },
    );
    // Let lazy sections settle.
    await page.waitForTimeout(600);
    const html = await page.evaluate(CLEANUP_IN_PAGE);
    return html;
  } finally {
    await context.close();
  }
};

const main = async () => {
  try {
    await fs.access(path.join(DIST, "index.html"));
  } catch {
    console.error("[capture-bodies] dist/index.html missing — run the build first.");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await loadBrowser();
  console.log(`[capture-bodies] capturing ${ROUTES.length} routes on port ${PORT}`);

  const queue = [...ROUTES];
  let ok = 0;
  let failed = 0;

  const worker = async () => {
    while (queue.length) {
      const route = queue.shift();
      if (!route) break;
      try {
        const html = await capture(browser, route);
        if (!html || html.trim().length < 500) {
          throw new Error(`rendered body too small (${html?.length || 0} chars)`);
        }
        await fs.writeFile(path.join(OUT_DIR, snapshotFileName(route.path)), html, "utf8");
        ok++;
        console.log(`  ✓ ${route.path} (${html.length} chars)`);
      } catch (err) {
        failed++;
        console.warn(`  ✗ ${route.path} — ${err?.message || err}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await browser.close();
  server.close();
  console.log(`[capture-bodies] done — ${ok} captured, ${failed} failed`);
  if (ok === 0) process.exit(1);
};

main().catch((err) => {
  console.error("[capture-bodies] FAILED:", err);
  process.exit(1);
});
