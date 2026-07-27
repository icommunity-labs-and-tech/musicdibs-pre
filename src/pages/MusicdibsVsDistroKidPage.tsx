import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Shield, Music2, Radio, Megaphone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

/**
 * Comparison landing: Musicdibs vs DistroKid.
 * English-only page (SEO target market). Content signed off by product:
 * Musicdibs does not charge commission on streaming royalties. Competitor
 * data based on publicly available DistroKid pricing (2026).
 */

const PATH = "/musicdibs-vs-distrokid";
const URL = `https://www.musicdibs.com${PATH}`;

const TABLE_ROWS: { feature: string; distrokid: string | boolean; musicdibs: string | boolean }[] = [
  { feature: "Distribute to Spotify, Apple Music, TikTok, etc.", distrokid: true, musicdibs: "Yes — 220+ platforms" },
  { feature: "Create music with AI (vocals, mastering, lyrics)", distrokid: false, musicdibs: true },
  { feature: "Legal proof of authorship / copyright registration", distrokid: false, musicdibs: "Blockchain-certified" },
  { feature: "Protection before you publish, not after", distrokid: false, musicdibs: true },
  { feature: "Promotion to an existing audience", distrokid: false, musicdibs: "300k+ followers across social" },
  { feature: "Commission on your streaming royalties", distrokid: "None (unlimited plan)", musicdibs: "None" },
  { feature: "Pricing model", distrokid: "Annual subscription, per-artist add-ons", musicdibs: "Credit-based, single plan" },
];

const STEPS = [
  { icon: Music2, title: "1. Create", desc: "Generate or finish your track with AI-assisted tools: vocals, mastering, lyric help." },
  { icon: Shield, title: "2. Protect", desc: "Certify your work on the blockchain with a timestamp before you publish anywhere, on any platform." },
  { icon: Radio, title: "3. Distribute", desc: "Release to 220+ platforms including Spotify, Apple Music and TikTok." },
  { icon: Megaphone, title: "4. Promote", desc: "Get visibility through our social channels and creator community." },
];

const FAQ = [
  {
    q: "Do I have to stop using DistroKid to use Musicdibs?",
    a: "No. Many artists use Musicdibs specifically to register and protect their work before distributing it — wherever they choose to distribute.",
  },
  {
    q: "Is switching from DistroKid difficult?",
    a: "No. If you want to move distribution to Musicdibs too, we support ISRC-matched migration so your existing streams and playlist placements aren't affected. See the full step-by-step guide at /switch-to-musicdibs.",
  },
  {
    q: "What does Musicdibs protect that DistroKid doesn't?",
    a: "DistroKid handles getting your music onto streaming platforms. It doesn't register your authorship or provide legal proof that you created a work on a specific date — that's what Musicdibs' blockchain certification does.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-5 h-5 text-success mx-auto stroke-[3]" />;
  if (value === false) return <X className="w-5 h-5 text-destructive mx-auto stroke-[3]" />;
  return <span className="text-page-fg text-sm font-medium">{value}</span>;
}

const MusicdibsVsDistroKidPage = () => {
  const seoTitle = "Musicdibs vs DistroKid: Complete Workflow vs Distribution Only";
  const seoDesc =
    "DistroKid is great at distribution. See what's missing — and how Musicdibs covers creation, protection, distribution and promotion in one place.";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Musicdibs vs DistroKid: Complete Workflow vs Distribution Only",
    description: seoDesc,
    inLanguage: "en",
    image: "https://www.musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
    datePublished: "2026-01-15",
    dateModified: "2026-07-20",
    author: { "@type": "Organization", name: "Musicdibs", url: "https://www.musicdibs.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": URL },
    publisher: {
      "@type": "Organization",
      name: "Musicdibs",
      url: "https://www.musicdibs.com",
      logo: { "@type": "ImageObject", url: "https://www.musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png" },
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Musicdibs", item: "https://www.musicdibs.com" },
      { "@type": "ListItem", position: 2, name: "Musicdibs vs DistroKid", item: URL },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={PATH}
        type="article"
        lang="en"
        jsonLd={[articleSchema, faqSchema, breadcrumbSchema]}
      />
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-5 py-2 mb-6">
              <Shield className="w-5 h-5 text-brand" />
              <span className="text-brand text-sm font-medium">Musicdibs vs DistroKid</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
              DistroKid distributes your music. Musicdibs takes care of the whole thing.
            </h1>
            <p className="text-page-fg-muted text-lg md:text-xl max-w-3xl mx-auto mb-10">
              DistroKid is a solid distributor — that's not in question. But distribution is only one step in
              releasing a song. Here's what the rest of your workflow looks like, and how Musicdibs covers it end
              to end.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Create your first release with Musicdibs <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </header>

          {/* Comparison table */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-3 text-white">Honest comparison</h2>
            <p className="text-page-fg-subtle text-center mb-10 text-sm max-w-xl mx-auto">
              DistroKid data based on publicly available pricing as of 2026.
            </p>
            <div className="overflow-x-auto rounded-2xl bg-page-surface backdrop-blur-sm border border-page-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-page-border">
                    <th className="text-left px-5 py-5 text-page-fg-subtle font-bold text-xs uppercase tracking-wide w-1/2">
                      Feature
                    </th>
                    <th className="px-4 py-5 text-center text-page-fg-muted font-bold">DistroKid</th>
                    <th className="px-4 py-5 text-center bg-brand/10 border-x border-brand/30 text-white font-bold">
                      Musicdibs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, i) => (
                    <tr key={i} className={`border-b border-page-border last:border-b-0 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                      <td className="px-5 py-4 text-page-fg-muted font-medium">{row.feature}</td>
                      <td className="px-4 py-4 text-center"><Cell value={row.distrokid} /></td>
                      <td className="px-4 py-4 text-center bg-brand/5 border-x border-brand/20">
                        <Cell value={row.musicdibs} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Fair to DistroKid */}
          <section className="mb-16 bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">To be fair to DistroKid</h2>
            <p className="text-page-fg-muted leading-relaxed">
              DistroKid built one of the fastest, most reliable distribution pipelines in the industry, and for
              artists who only need distribution, it does that job well. This page isn't about which distributor
              is "better" — it's about what happens <em>before</em> and <em>after</em> distribution, which is
              where most independent artists are currently unprotected.
            </p>
          </section>

          {/* What's missing */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">
              What's missing when distribution is the only tool in your workflow
            </h2>
            <p className="text-page-fg-muted mb-4 leading-relaxed">
              Most independent artists today are stitching together 3-4 separate tools to release a single song:
            </p>
            <ul className="space-y-3 mb-8">
              <li className="text-page-fg-muted leading-relaxed pl-6 relative">
                <span className="absolute left-0 text-brand">•</span>
                Something to create or finish the track (often an AI tool like Suno or Udio)
              </li>
              <li className="text-page-fg-muted leading-relaxed pl-6 relative">
                <span className="absolute left-0 text-brand">•</span>
                A distributor to get it onto streaming platforms
              </li>
              <li className="text-page-fg-muted leading-relaxed pl-6 relative">
                <span className="absolute left-0 text-brand">•</span>
                Nothing, usually, to actually prove they made it first — which becomes a problem the moment
                someone else claims the work, samples it without permission, or a platform dispute affects the
                catalog
              </li>
              <li className="text-page-fg-muted leading-relaxed pl-6 relative">
                <span className="absolute left-0 text-brand">•</span>
                A separate promotion tool or agency to get it heard
              </li>
            </ul>
            <p className="text-page-fg-muted leading-relaxed mb-8">
              Each extra tool means another login, another subscription, and another gap where your rights
              aren't actually protected.
            </p>
            <div className="text-center">
              <Link to="/all-in-one-music-platform">
                <Button variant="hero" size="lg" className="font-semibold">
                  <span className="flex items-center gap-2">
                    See the full workflow in 90 seconds <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </section>

          {/* Complete flow */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">The complete flow with Musicdibs</h2>
            <p className="text-page-fg-subtle text-center mb-12 max-w-xl mx-auto">
              All four steps live in one account, one dashboard, one subscription.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
                    <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                    <p className="text-page-fg-muted leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trust */}
          <section className="mb-20 bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Why artists trust Musicdibs</h2>
            <ul className="space-y-3 max-w-2xl mx-auto">
              <li className="text-page-fg-muted leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                Blockchain certification on public, decentralized chains (Ethereum, Polygon, Solana) —
                independent of Musicdibs' own infrastructure.
              </li>
              <li className="text-page-fg-muted leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                Legally valid internationally, aligned with the Berne Convention and WIPO Copyright Treaty.
              </li>
              <li className="text-page-fg-muted leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                Thousands of artists already using the platform.
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10 text-white">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQ.map((f, i) => (
                <div key={i} className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3">{f.q}</h3>
                  <p className="text-page-fg-muted leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="text-center bg-gradient-to-r from-brand/10 to-primary/10 border border-brand/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Start with a free registration</h2>
            <p className="text-page-fg-muted mb-8 max-w-xl mx-auto">
              Protect your first work today and see the full Musicdibs workflow from creation to promotion.
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

export default MusicdibsVsDistroKidPage;
