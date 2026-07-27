import { Link } from "react-router-dom";
import { ArrowRight, Check, Music2, Shield, Radio, Megaphone, Users, Layers } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

/**
 * Pillar page — /all-in-one-music-platform
 * Category-level authority page. Linked from footer (only landing of this
 * bunch that lives in the footer) and from every /musicdibs-vs-X landing.
 * English-only, self-referencing canonical, SoftwareApplication JSON-LD.
 */

const PATH = "/all-in-one-music-platform";
const URL = `https://www.musicdibs.com${PATH}`;

const STEPS = [
  {
    icon: Music2,
    title: "1. Create",
    desc: "Compose with AI-assisted tools: lyrics, vocals, mastering, cover art, promo videos — from a single dashboard.",
  },
  {
    icon: Shield,
    title: "2. Protect",
    desc: "Certify your work on public blockchains (Ethereum, Polygon, Solana) with a timestamp before it goes public.",
  },
  {
    icon: Radio,
    title: "3. Distribute",
    desc: "Release to Spotify, Apple Music, TikTok and 200+ other platforms with royalty splits for collaborators.",
  },
  {
    icon: Megaphone,
    title: "4. Promote",
    desc: "Get visibility through our creator community, social channels and promo tools built in the same account.",
  },
];

const REASONS = [
  {
    title: "One login, one bill",
    desc: "Stop juggling four subscriptions, four passwords and four support inboxes to release a single song.",
  },
  {
    title: "No gaps in your rights",
    desc: "When creation, protection and distribution live in separate tools, ownership evidence falls through the cracks. Here it doesn't.",
  },
  {
    title: "Faster from idea to release",
    desc: "Everything a track needs — lyrics, master, cover, certification, distribution, promo — happens in the same workflow.",
  },
  {
    title: "Built for independents and managers",
    desc: "Whether you release your own music or manage a roster, the same platform scales with you.",
  },
];

const AllInOneMusicPlatformPage = () => {
  const seoTitle = "All-in-One Music Platform for Independent Artists";
  const seoDesc =
    "One platform for the full music release workflow: AI-assisted creation, blockchain copyright protection, distribution to 200+ platforms and built-in promotion.";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Musicdibs",
    url: "https://www.musicdibs.com",
    logo: "https://www.musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
    sameAs: [
      "https://twitter.com/musicdibs",
      "https://www.instagram.com/musicdibs/",
      "https://www.tiktok.com/@musicdibs_",
      "https://www.youtube.com/@Musicdibs",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Musicdibs",
    url: "https://www.musicdibs.com",
    inLanguage: ["es", "en", "pt-BR"],
    publisher: { "@type": "Organization", name: "Musicdibs", url: "https://www.musicdibs.com" },
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Musicdibs",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description: seoDesc,
    url: URL,
    image: "https://www.musicdibs.com/og-image.png",
    inLanguage: "en",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock", url: "https://www.musicdibs.com/#pricing" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 1240,
      bestRating: 5,
      worstRating: 1,
    },
    publisher: {
      "@type": "Organization",
      name: "Musicdibs",
      url: "https://www.musicdibs.com",
      logo: { "@type": "ImageObject", url: "https://www.musicdibs.com/og-image.png" },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Musicdibs", item: "https://www.musicdibs.com" },
      { "@type": "ListItem", position: 2, name: "All-in-One Music Platform", item: URL },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={PATH}
        type="website"
        lang="en"
        jsonLd={[organizationSchema, websiteSchema, appSchema, breadcrumbSchema]}
      />
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <header className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-5 py-2 mb-6">
              <Layers className="w-5 h-5 text-brand" />
              <span className="text-brand text-sm font-medium">All-in-One Music Platform</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
              Create. Protect. Distribute. Promote. All in one platform.
            </h1>
            <p className="text-page-fg-muted text-lg md:text-xl max-w-3xl mx-auto mb-10">
              Every step of a music release — from the first idea to the first stream — lives in the same
              account. One workflow instead of four tools stitched together.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Start free <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </header>

          {/* 4-step diagram */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">The four steps, one platform</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="relative bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-6 flex flex-col"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-page-fg-muted leading-relaxed text-sm">{s.desc}</p>
                    {i < STEPS.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand/60" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Why standalone tools aren't enough */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">Why standalone tools aren't enough</h2>
            <p className="text-page-fg-muted mb-6 leading-relaxed">
              Most independent artists today are running a stack of 3-4 disconnected products to release a
              single song: something to create with, something to certify (usually nothing), something to
              distribute, and something to promote. Every extra tool adds a login, a subscription and a place
              where responsibility gets fuzzy.
            </p>
            <p className="text-page-fg-muted leading-relaxed">
              The real problem isn't the price of any single tool — it's the gaps between them. Rights
              evidence rarely gets created before distribution starts. Collaborator splits live in a spreadsheet
              nobody signs. Promo tools don't know what was actually released. Every gap becomes a dispute
              waiting to happen.
            </p>
          </section>

          {/* Reasons grid */}
          <section className="mb-20">
            <div className="grid md:grid-cols-2 gap-6">
              {REASONS.map((r, i) => (
                <div key={i} className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
                  <div className="flex items-start gap-3 mb-3">
                    <Check className="w-6 h-6 text-success shrink-0 mt-0.5" />
                    <h3 className="text-xl font-bold text-white">{r.title}</h3>
                  </div>
                  <p className="text-page-fg-muted leading-relaxed pl-9">{r.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Social proof */}
          <section className="mb-20 bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-10 text-center">
            <Users className="w-10 h-10 text-brand mx-auto mb-4" />
            <p className="text-2xl md:text-3xl font-bold text-white mb-3">100,000+ artists</p>
            <p className="text-page-fg-muted max-w-xl mx-auto">
              already release, protect and promote their music with Musicdibs — from bedroom producers to
              managed rosters.
            </p>
          </section>

          {/* Comparisons — only link the ones already published */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">Compare Musicdibs</h2>
            <p className="text-page-fg-subtle text-center mb-10 max-w-xl mx-auto">
              Honest side-by-side comparisons with the tools most artists already use.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Link
                to="/musicdibs-vs-distrokid"
                className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-6 hover:border-brand/40 transition-colors group"
              >
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand transition-colors">
                  Musicdibs vs DistroKid
                </h3>
                <p className="text-page-fg-muted text-sm">Distribution only vs the full release workflow.</p>
              </Link>
            </div>
          </section>

          {/* Final CTA */}
          <section className="text-center bg-gradient-to-r from-brand/10 to-primary/10 border border-brand/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">One platform. Every step.</h2>
            <p className="text-page-fg-muted mb-8 max-w-xl mx-auto">
              Start free — register your first work and see the full workflow in one account.
            </p>
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  Try Musicdibs free <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </section>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default AllInOneMusicPlatformPage;
