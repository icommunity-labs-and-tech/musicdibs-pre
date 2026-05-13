// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Fetches published blog posts from Supabase to include /news/:slug entries.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.musicdibs.com";

const SUPABASE_URL = "https://kmwehyixenybegwhqljx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttd2VoeWl4ZW55YmVnd2hxbGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDEwMzQsImV4cCI6MjA5MDAxNzAzNH0.DZ2gEjz_DAkHfEetYo72NAUbdhq2lui9rIrMysWJUNo";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/distribution", changefreq: "monthly", priority: "0.9" },
  { path: "/marketing", changefreq: "monthly", priority: "0.9" },
  { path: "/ai-studio", changefreq: "monthly", priority: "0.9" },
  { path: "/ai-studio/create", changefreq: "monthly", priority: "0.7" },
  { path: "/ai-studio/edit", changefreq: "monthly", priority: "0.7" },
  { path: "/ai-studio/inspire", changefreq: "monthly", priority: "0.7" },
  { path: "/ai-studio/video", changefreq: "monthly", priority: "0.7" },
  { path: "/ai-studio/covers", changefreq: "monthly", priority: "0.7" },
  { path: "/ai-studio/vocal", changefreq: "monthly", priority: "0.7" },
  { path: "/ai-studio/promo-material", changefreq: "monthly", priority: "0.7" },
  { path: "/manager", changefreq: "monthly", priority: "0.8" },
  { path: "/partners", changefreq: "monthly", priority: "0.6" },
  { path: "/news", changefreq: "weekly", priority: "0.8" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/legal-validity", changefreq: "yearly", priority: "0.5" },
  { path: "/contact", changefreq: "yearly", priority: "0.5" },
  { path: "/verify", changefreq: "yearly", priority: "0.5" },
  { path: "/sla", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/login", changefreq: "yearly", priority: "0.4" },
];

async function fetchBlogPosts(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,updated_at&published=eq.true&order=updated_at.desc&limit=2000`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) {
      console.warn(`[sitemap] blog_posts fetch failed: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string }>;
    return rows
      .filter((r) => r.slug)
      .map((r) => ({
        path: `/news/${r.slug}`,
        lastmod: r.updated_at?.split("T")[0],
        changefreq: "monthly" as const,
        priority: "0.6",
      }));
  } catch (err) {
    console.warn(`[sitemap] blog_posts fetch error:`, err);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const blogEntries = await fetchBlogPosts();
  const all = [...staticEntries, ...blogEntries];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(all));
  console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${blogEntries.length} blog)`);
}

main();
