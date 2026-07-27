import { Link } from "react-router-dom";
import { ArrowRight, Check, Shield, RefreshCw, ListChecks, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

/**
 * Landing: /switch-to-musicdibs
 * Aimed at artists already distributing (DistroKid, CD Baby, etc.) who are
 * considering adding or switching to Musicdibs. Non-adversarial tone.
 * Core message: this is NOT "leave your distributor" — it's "add what's missing,
 * whether or not you switch". Same technical pattern as the /musicdibs-vs-*
 * comparison landings (lang=en, self-canonical, FAQPage + BreadcrumbList JSON-LD).
 *
 * The step-by-step ISRC migration guide reuses the exact same text already
 * published in the FAQ (see src/i18n.ts key `faq.items` — "Can I bring my songs
 * from another distributor"). Same source of truth, different presentation.
 */

const PATH = "/switch-to-musicdibs";
const URL = `https://www.musicdibs.com${PATH}`;

const STEPS = [
  {
    icon: ListChecks,
    title: "1. Match your metadata exactly",
    desc: "Before creating anything on Musicdibs, gather your existing metadata: title, artist name(s), ISRC and UPC/EAN. These identifiers are what streaming platforms use to keep your streams, playlist placements and reviews attached to your track.",
  },
  {
    icon: RefreshCw,
    title: "2. Create the release on Musicdibs with the same identifiers",
    desc: "Create the release on Musicdibs using the exact same data. Reuse the existing ISRC — do not generate a new one. Reusing the ISRC is what tells DSPs \"this is the same recording\", not a re-upload.",
  },
  {
    icon: Shield,
    title: "3. Request removal at the old distributor once Musicdibs is accepted",
    desc: "Wait until Musicdibs' delivery is accepted before you request takedown at your previous distributor. There will be a brief coexistence period where both deliveries are live — that's normal and expected.",
  },
  {
    icon: Check,
    title: "4. Verify platforms have updated the delivery source",
    desc: "Once the switch is live, check Spotify for Artists and Apple Music for Artists to confirm the track is being served from the new delivery. Your streams, monthly listeners and playlist adds carry over because the ISRC hasn't changed.",
  },
];

const WHAT_STAYS_THE_SAME = [
  "Your total stream count on each track",
  "Your monthly listeners on Spotify, Apple Music, etc.",
  "Editorial and user playlist placements",
  "Your artist page and follower count",
  "Historical royalty statements from the old distributor (they still cover the period before takedown)",
];

const FAQ = [
  {
    q: "Do I actually have to leave my current distributor?",
    a: "No. Many artists keep their existing distributor and only use Musicdibs for what it isn't doing: pre-release blockchain certification, AI creation tools and promotion. Switching distribution is a separate decision.",
  },
  {
    q: "Will I lose my Spotify streams or playlist placements?",
    a: "No, as long as you reuse the same ISRC. Streaming platforms tie streams, monthly listeners and playlist placements to the ISRC of the recording, not to the distributor. Reusing the ISRC on Musicdibs keeps everything attached.",
  },
  {
    q: "How long does the switch take?",
    a: "The Musicdibs delivery itself takes the same time as any other distributor (typically a few days per DSP). The takedown at the previous distributor is separate and depends on their process — that's why we recommend requesting takedown only after Musicdibs is live.",
  },
  {
    q: "What if my old distributor issued the ISRC?",
    a: "ISRCs belong to the recording, not to the distributor — you can keep using it on any other distributor. If you're unsure, most artist dashboards show the ISRC on the track detail page. Copy it exactly (letters and dashes) when creating the release on Musicdibs.",
  },
  {
    q: "Can I switch just some tracks and leave others where they are?",
    a: "Yes. You can migrate track by track. This is often the safest approach: start with one release, confirm streams and placements carry over, then decide whether to migrate the rest of your catalog.",
  },
];

const SwitchToMusicdibsPage = () => {
  const seoTitle = "Switch to Musicdibs — Keep Your Streams and Playlist Placements";
  const seoDesc =
    "Considering switching from DistroKid or CD Baby to Musicdibs? Step-by-step ISRC migration guide. Keep your streams, monthly listeners and playlist placements.";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: seoTitle,
    description: seoDesc,
    inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": URL },
    publisher: {
      "@type": "Organization",
      name: "Musicdibs",
      url: "https://www.musicdibs.com",
      logo: { "@type": "ImageObject", url: "https://www.musicdibs.com/og-image.png" },
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
      { "@type": "ListItem", position: 2, name: "Switch to Musicdibs", item: URL },
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
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-5 py-2 mb-6">
              <RefreshCw className="w-5 h-5 text-brand" />
              <span className="text-brand text-sm font-medium">Switch to Musicdibs</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
              Thinking of switching from DistroKid or CD Baby?
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-3xl mx-auto mb-10">
              This isn't a "leave your distributor" pitch. It's a step-by-step guide for artists
              already distributing elsewhere who are considering adding — or moving to — Musicdibs.
              You keep your streams, your monthly listeners and your playlist placements.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Create your Musicdibs account <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </header>

          {/* Not all or nothing */}
          <section className="mb-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Switching isn't all-or-nothing</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              The most common pattern among artists moving to Musicdibs isn't "burn down the old
              account and start over". It's more incremental:
            </p>
            <ul className="space-y-2 text-white/70 leading-relaxed">
              <li className="pl-6 relative">
                <span className="absolute left-0 text-brand">•</span>
                <strong className="text-white/90">Option A —</strong> keep your existing distributor, add Musicdibs
                for what it isn't doing: blockchain certification, AI creation tools, promotion.
              </li>
              <li className="pl-6 relative">
                <span className="absolute left-0 text-brand">•</span>
                <strong className="text-white/90">Option B —</strong> migrate one release first as a test. Confirm
                streams and placements carry over, then decide whether to move the rest.
              </li>
              <li className="pl-6 relative">
                <span className="absolute left-0 text-brand">•</span>
                <strong className="text-white/90">Option C —</strong> full migration. Same steps, applied to your
                whole catalog.
              </li>
            </ul>
          </section>

          {/* Migration steps */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4">The ISRC migration, step by step</h2>
            <p className="text-white/60 mb-10">
              The process isn't automatic, but it is straightforward. The key rule: don't generate
              new ISRCs and don't delete the original delivery before the new one is live.
            </p>
            <div className="space-y-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex gap-5 items-start"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                      <p className="text-white/70 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 bg-warning/10 border border-warning/20 rounded-2xl p-6 flex gap-4 items-start">
              <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">One thing not to do</h3>
                <p className="text-white/70 leading-relaxed">
                  Don't request takedown at your old distributor <em>before</em> Musicdibs' delivery
                  is accepted, and don't create a new ISRC. Both mistakes reset your stream history
                  on the affected track.
                </p>
              </div>
            </div>
          </section>

          {/* What stays the same */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">What stays the same after switching</h2>
            <p className="text-white/70 mb-6 leading-relaxed">
              Because streaming platforms identify a recording by its ISRC — not by which
              distributor delivered it — everything tied to the ISRC carries over:
            </p>
            <ul className="space-y-3">
              {WHAT_STAYS_THE_SAME.map((item, i) => (
                <li key={i} className="flex gap-3 text-white/80 leading-relaxed">
                  <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10 text-white">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQ.map((f, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3">{f.q}</h3>
                  <p className="text-white/70 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="text-center bg-gradient-to-r from-brand/10 to-primary/10 border border-brand/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Start with one release</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Create your account, migrate one track using its existing ISRC, and see the full
              workflow before you decide about the rest of your catalog.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Try Musicdibs free <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
              <Link to="/musicdibs-vs-distrokid">
                <Button variant="outline" size="xl" className="font-semibold">
                  Read the full comparison
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default SwitchToMusicdibsPage;
