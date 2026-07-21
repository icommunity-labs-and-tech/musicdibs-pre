#!/usr/bin/env node
/**
 * Post-prerender verification.
 *
 * Fails the build (exit 1) if any /news/<slug>/index.html is:
 *   - missing on disk
 *   - missing a non-empty <title>
 *   - missing a <meta name="description"> with non-empty content
 *   - reusing the generic homepage title or description (fallback bleed)
 *   - sharing a title or description with another /news/ page (duplicate)
 *
 * Enumerates the expected slugs from Supabase (same query as the
 * prerender script) so the check catches "prerender skipped blog fetch"
 * silently, which was the original root cause of the duplicate-description
 * regressions.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://kmwehyixenybegwhqljx.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttd2VoeWl4ZW55YmVnd2hxbGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDEwMzQsImV4cCI6MjA5MDAxNzAzNH0.DZ2gEjz_DAkHfEetYo72NAUbdhq2lui9rIrMysWJUNo";

// Fallback strings we must NOT see on a blog article page.
const GENERIC_TITLE_HINTS = ["lovable app", "lovable generated project"];

const readIndex = async () => {
  try {
    return await fs.readFile(path.join(DIST, "index.html"), "utf8");
  } catch {
    return "";
  }
};

const extractTag = (html, regex) => {
  const m = html.match(regex);
  return m ? m[1].trim() : "";
};

const getTitle = (html) => extractTag(html, /<title>([\s\S]*?)<\/title>/i);
const getDescription = (html) =>
  extractTag(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);

const fetchSlugs = async () => {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug&published=eq.true`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => r.slug).filter(Boolean);
};

const main = async () => {
  const errors = [];
  const warnings = [];

  // Load baseline homepage tags so we can detect fallback bleed.
  const indexHtml = await readIndex();
  if (!indexHtml) {
    console.error("[verify-prerender] dist/index.html not found — run `vite build` first.");
    process.exit(1);
  }
  const homeTitle = getTitle(indexHtml).toLowerCase();
  const homeDesc = getDescription(indexHtml).toLowerCase();

  let slugs;
  try {
    slugs = await fetchSlugs();
  } catch (err) {
    console.error(`[verify-prerender] cannot enumerate blog slugs: ${err.message}`);
    process.exit(1);
  }
  if (!slugs.length) {
    console.warn("[verify-prerender] no published blog posts returned — nothing to verify");
    return;
  }

  const titles = new Map(); // title -> [slug]
  const descs = new Map();

  for (const slug of slugs) {
    const file = path.join(DIST, "news", slug, "index.html");
    let html;
    try {
      html = await fs.readFile(file, "utf8");
    } catch {
      errors.push(`missing prerendered file: dist/news/${slug}/index.html`);
      continue;
    }
    const title = getTitle(html);
    const desc = getDescription(html);

    if (!title) errors.push(`[${slug}] empty <title>`);
    if (!desc) errors.push(`[${slug}] missing/empty <meta name="description">`);

    const tLower = title.toLowerCase();
    if (GENERIC_TITLE_HINTS.some((h) => tLower.includes(h))) {
      errors.push(`[${slug}] title still uses Lovable template default: "${title}"`);
    }
    if (title && tLower === homeTitle) {
      errors.push(`[${slug}] title identical to homepage — prerender did not rewrite`);
    }
    if (desc && desc.toLowerCase() === homeDesc) {
      errors.push(`[${slug}] description identical to homepage — prerender did not rewrite`);
    }

    if (title) titles.set(title, [...(titles.get(title) || []), slug]);
    if (desc) descs.set(desc, [...(descs.get(desc) || []), slug]);
  }

  for (const [t, s] of titles) {
    if (s.length > 1) errors.push(`duplicate <title> across ${s.length} posts: "${t}" → ${s.join(", ")}`);
  }
  for (const [d, s] of descs) {
    if (s.length > 1) errors.push(`duplicate <meta description> across ${s.length} posts: "${d.slice(0, 80)}…" → ${s.join(", ")}`);
  }

  if (errors.length) {
    console.error(`\n[verify-prerender] ❌ ${errors.length} issue(s) — build blocked:\n`);
    for (const e of errors) console.error(`  • ${e}`);
    console.error("");
    process.exit(1);
  }
  if (warnings.length) {
    for (const w of warnings) console.warn(`[verify-prerender] ⚠ ${w}`);
  }
  console.log(`[verify-prerender] ✓ ${slugs.length} /news/* pages ship unique title + description`);
};

main().catch((err) => {
  console.error("[verify-prerender] FAILED:", err);
  process.exit(1);
});
