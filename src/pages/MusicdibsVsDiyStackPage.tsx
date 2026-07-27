import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Shield, Music2, Radio, Megaphone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

/**
 * Comparison landing: Musicdibs vs the typical DIY stack.
 * Compares an actual multi-tool workflow (Suno/Udio + DistroKid/CD Baby +
 * no protection + Groover/SubmitHub) to Musicdibs as a single account.
 * Reuses the same table + section pattern as the other comparison landings.
 */

const PATH = "/musicdibs-vs-diy-stack";
const URL = `https://www.musicdibs.com${PATH}`;

type Row = { feature: string; stack: string | boolean; musicdibs: string | boolean; highlight?: boolean };

const TABLE_ROWS: Row[] = [
  { feature: "Number of tools needed", stack: "3-4 separate products", musicdibs: "1 platform" },
  { feature: "Number of subscriptions / payments", stack: "3-4 recurring bills", musicdibs: "1 account" },
  { feature: "Number of logins to remember", stack: "3-4 accounts", musicdibs: "1 login" },
  {
    feature: "Legal protection of authorship (blockchain)",
    stack: false,
    musicdibs: "Yes — public chains",
    highlight: true,
  },
  { feature: "Data continuity between steps", stack: "Manual re-uploads and re-tagging", musicdibs: "Native" },
  { feature: "Time from creation to release", stack: "Days — you're the glue between tools", musicdibs: "Hours — one workflow" },
  { feature: "Support when something breaks", stack: "3-4 different helpdesks", musicdibs: "1 support team" },
];

const STACK_TOOLS = [
  { role: "Create", example: "Suno / Udio" },
  { role: "Distribute", example: "DistroKid / CD Baby" },
  { role: "Protect authorship", example: "Nothing, usually" },
  { role: "Promote", example: "Groover / SubmitHub" },
];

const STEPS = [
  { icon: Music2, title: "1. Create", desc: "Same AI creation power — vocals, lyrics, mastering, cover art — inside the same account." },
  { icon: Shield, title: "2. Protect", desc: "Certify authorship on public blockchains. Something no DIY stack combination gives you by default." },
  { icon: Radio, title: "3. Distribute", desc: "Release to 220+ platforms with royalty splits — no separate distributor account." },
  { icon: Megaphone, title: "4. Promote", desc: "Access to a real creator community and promo tools without a third-party pay-to-review platform." },
];

const FAQ = [
  {
    q: "Isn't a DIY stack cheaper?",
    a: "Sometimes on paper, rarely in practice. Add up 3-4 subscriptions, the time spent moving files between tools, and the cost of not having any authorship evidence when a dispute happens — the DIY stack usually stops looking cheap.",
  },
  {
    q: "Can I migrate my catalog from DistroKid or CD Baby?",
    a: "Yes. Musicdibs supports ISRC-matched migration so your existing streams and playlist placements aren't affected when you switch distribution.",
  },
  {
    q: "What breaks when authorship isn't registered before release?",
    a: "The moment someone copies, samples or claims your work, you have no independent timestamp to point at. Streaming platforms handle disputes based on evidence, not on who yells first — and 'I uploaded it to a distributor' is not the same as certified authorship.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-5 h-5 text-success mx-auto stroke-[3]" />;
  if (value === false) return <X className="w-5 h-5 text-destructive mx-auto stroke-[3]" />;
  return <span className="text-white/90 text-sm font-medium">{value}</span>;
}

const MusicdibsVsDiyStackPage = () => {
  const seoTitle = "Musicdibs vs a DIY Music Stack: One Platform vs Four Tools";
  const seoDesc =
    "Suno + DistroKid + no protection + Groover is a stack, not a workflow. See what an all-in-one music platform actually saves you — in tools, time and rights.";

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
      { "@type": "ListItem", position: 2, name: "Musicdibs vs DIY Stack", item: URL },
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
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-5 py-2 mb-6">
              <Shield className="w-5 h-5 text-brand" />
              <span className="text-brand text-sm font-medium">Musicdibs vs a DIY Stack</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
              Four tools stitched together isn't a workflow. It's a bill.
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-3xl mx-auto mb-10">
              Suno or Udio to create. DistroKid or CD Baby to distribute. Groover or SubmitHub to promote.
              And, in most cases, nothing at all to prove you actually made it. Here's what happens when all
              of that lives in one account.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Consolidate your workflow <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </header>

          {/* Stack breakdown */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">The typical DIY stack today</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STACK_TOOLS.map((t) => (
                <div
                  key={t.role}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
                >
                  <div className="text-xs uppercase tracking-wide text-brand font-bold mb-2">{t.role}</div>
                  <div className="text-white/90 font-semibold">{t.example}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Comparison table */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-3 text-white">Honest comparison</h2>
            <p className="text-white/60 text-center mb-10 text-sm max-w-xl mx-auto">
              Comparison based on the most common independent-artist stack in 2026.
            </p>
            <div className="overflow-x-auto rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-5 text-white/60 font-bold text-xs uppercase tracking-wide w-1/2">
                      Feature
                    </th>
                    <th className="px-4 py-5 text-center text-white/70 font-bold">DIY Stack</th>
                    <th className="px-4 py-5 text-center bg-brand/10 border-x border-brand/30 text-white font-bold">
                      Musicdibs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/5 last:border-b-0 ${
                        row.highlight ? "bg-brand/10" : i % 2 === 0 ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <td className="px-5 py-4 text-white/80 font-medium">
                        {row.feature}
                        {row.highlight && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-brand font-bold">
                            Key difference
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center"><Cell value={row.stack} /></td>
                      <td className="px-4 py-4 text-center bg-brand/5 border-x border-brand/20">
                        <Cell value={row.musicdibs} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">To be fair to the DIY stack</h2>
            <p className="text-white/70 leading-relaxed">
              Every tool in a typical DIY stack is genuinely good at what it does. Suno and Udio are great
              creators. DistroKid and CD Baby are reliable distributors. Groover and SubmitHub can put a track
              in front of curators. The problem isn't any single one of them — it's that nobody in that stack
              is responsible for the parts between them, and no one is responsible for proving you own the
              output.
            </p>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">The complete flow with Musicdibs</h2>
            <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">
              Four steps, one account, one workflow.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                    <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                    <p className="text-white/70 leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <Link to="/all-in-one-music-platform">
                <Button variant="hero" size="lg" className="font-semibold">
                  <span className="flex items-center gap-2">
                    See the full platform <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </section>

          <section className="mb-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Why artists trust Musicdibs</h2>
            <ul className="space-y-3 max-w-2xl mx-auto">
              <li className="text-white/80 leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                Blockchain certification on public chains — independent of any single vendor.
              </li>
              <li className="text-white/80 leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                Legally valid internationally under the Berne Convention and WIPO Copyright Treaty.
              </li>
              <li className="text-white/80 leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                100,000+ artists already using the platform.
              </li>
            </ul>
          </section>

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

          <section className="text-center bg-gradient-to-r from-brand/10 to-primary/10 border border-brand/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">One account. Fewer bills. Real protection.</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Try the full workflow — free registration for your first work.
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

export default MusicdibsVsDiyStackPage;
