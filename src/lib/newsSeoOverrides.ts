/**
 * Exact title / meta description overrides for high-impression, low-CTR blog
 * articles (based on Google Search Console, last 90 days).
 * Keyed by slug. Titles are used verbatim (no brand suffix appended).
 */
export interface NewsSeoOverride {
  title: string;
  description: string;
}

export const NEWS_SEO_OVERRIDES: Record<string, NewsSeoOverride> = {
  "how-to-get-spotify-artist-id": {
    title: "Find Your Spotify Artist ID in Under 60 Seconds (Free Tool)",
    description:
      "Need your Spotify Artist ID for distribution, playlisting, or verification? Step-by-step guide plus a free lookup tool — get it in under a minute.",
  },
  "best-suno-ai-alternative": {
    title: "Best Suno AI Alternative in 2026: Top 5 Tools Compared",
    description:
      "Suno AI hit a wall? Compare the 5 best AI music generation alternatives in 2026 — pricing, output quality, and rights ownership, side by side.",
  },
  "what-is-an-oac-on-youtube-and-how-to-set-it-up": {
    title: "YouTube OAC Explained: Set Up Your Official Artist Channel",
    description:
      "What is a YouTube OAC and why does it matter for artists? Learn what it unlocks and follow our step-by-step setup guide — free, takes 10 minutes.",
  },
};

export const getNewsSeoOverride = (slug?: string): NewsSeoOverride | undefined =>
  slug ? NEWS_SEO_OVERRIDES[slug] : undefined;
