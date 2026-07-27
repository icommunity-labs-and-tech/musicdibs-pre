import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Shield, Music2, Radio, Megaphone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

/**
 * Comparison landing: Musicdibs vs Loudly.
 * Loudly already covers creation + distribution — no false wins claimed there.
 * The only visually highlighted differentiator: blockchain-certified legal
 * protection, which Loudly does not provide.
 */

const PATH = "/musicdibs-vs-loudly";
const URL = `https://www.musicdibs.com${PATH}`;

type Row = {
  feature: string;
  loudly: string | boolean;
  musicdibs: string | boolean;
  highlight?: boolean;
};

const TABLE_ROWS: Row[] = [
  { feature: "Create tracks with AI", loudly: true, musicdibs: true },
  { feature: "Distribution to major streaming platforms", loudly: true, musicdibs: "Yes — 220+ platforms" },
  {
    feature: "Legal proof of authorship / blockchain certification",
    loudly: false,
    musicdibs: "Blockchain-certified",
    highlight: true,
  },
  { feature: "Editable stems and lyric assist", loudly: "Limited", musicdibs: true },
  { feature: "Promo materials (covers, videos, social)", loudly: "Limited", musicdibs: true },
  { feature: "Royalty retention on distribution", loudly: "Varies by plan", musicdibs: "100%" },
  { feature: "Manager / roster tools", loudly: false, musicdibs: true },
];

const STEPS = [
  { icon: Music2, title: "1. Create", desc: "AI-assisted composition, vocals, mastering and lyrics in one workspace." },
  { icon: Shield, title: "2. Protect", desc: "Blockchain-certify authorship before publishing anywhere. Loudly does not do this step." },
  { icon: Radio, title: "3. Distribute", desc: "Release to 220+ platforms with royalty splits included." },
  { icon: Megaphone, title: "4. Promote", desc: "Covers, promo videos and access to a real creator community." },
];

const FAQ = [
  {
    q: "Isn't Loudly enough if I just want to make and release AI music?",
    a: "If your only goal is making a track and pushing it to a few platforms, Loudly can do that. What it doesn't do is give you legal evidence that you created the work — so if it gets copied, sampled or claimed by someone else, you have nothing to point at.",
  },
  {
    q: "Do I need to give up Loudly to use Musicdibs?",
    a: "No. If you like Loudly's creation tools, you can still register whatever you produce on Musicdibs to add the protection layer.",
  },
  {
    q: "What does 'blockchain-certified' actually mean here?",
    a: "Your work's hash is registered on public chains (Ethereum, Polygon, Solana) with a timestamp — independent, immutable, and internationally recognized under the Berne Convention.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-5 h-5 text-success mx-auto stroke-[3]" />;
  if (value === false) return <X className="w-5 h-5 text-destructive mx-auto stroke-[3]" />;
  return <span className="text-page-fg text-sm font-medium">{value}</span>;
}

const MusicdibsVsLoudlyPage = () => {
  const seoTitle = "Musicdibs vs Loudly: AI Music with Legal Protection Built In";
  const seoDesc =
    "Loudly makes AI music. Musicdibs makes AI music you can prove you own. Honest comparison of features, distribution and copyright protection.";

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
      { "@type": "ListItem", position: 2, name: "Musicdibs vs Loudly", item: URL },
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
              <span className="text-brand text-sm font-medium">Musicdibs vs Loudly</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
              Loudly makes AI music. Musicdibs makes AI music you can prove you own.
            </h1>
            <p className="text-page-fg-muted text-lg md:text-xl max-w-3xl mx-auto mb-10">
              Both platforms let you create and release music with AI. The difference is what happens the
              moment someone else claims your track — and whether you have anything to show for it.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Create and protect your first track <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-3 text-primary-foreground">Honest comparison</h2>
            <p className="text-page-fg-subtle text-center mb-10 text-sm max-w-xl mx-auto">
              Loudly data based on publicly available product information as of 2026.
            </p>
            <div className="overflow-x-auto rounded-2xl bg-page-surface backdrop-blur-sm border border-page-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-page-border">
                    <th className="text-left px-5 py-5 text-page-fg-subtle font-bold text-xs uppercase tracking-wide w-1/2">
                      Feature
                    </th>
                    <th className="px-4 py-5 text-center text-page-fg-muted font-bold">Loudly</th>
                    <th className="px-4 py-5 text-center bg-brand/10 border-x border-brand/30 text-primary-foreground font-bold">
                      Musicdibs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-page-border last:border-b-0 ${
                        row.highlight
                          ? "bg-brand/10"
                          : i % 2 === 0
                            ? "bg-primary-foreground/[0.02]"
                            : ""
                      }`}
                    >
                      <td className="px-5 py-4 text-page-fg-muted font-medium">
                        {row.feature}
                        {row.highlight && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-brand font-bold">
                            Key difference
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center"><Cell value={row.loudly} /></td>
                      <td className="px-4 py-4 text-center bg-brand/5 border-x border-brand/20">
                        <Cell value={row.musicdibs} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-16 bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-foreground mb-4">To be fair to Loudly</h2>
            <p className="text-page-fg-muted leading-relaxed">
              Loudly built a genuinely good AI music generation product with a clean UX and a fair pricing
              tier for casual creators. If your work never leaves social media loops and you never need to
              defend authorship, it does what it says. This page is about the moment your music starts
              mattering enough for someone else to want it.
            </p>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-primary-foreground">The complete flow with Musicdibs</h2>
            <p className="text-page-fg-subtle text-center mb-12 max-w-xl mx-auto">
              Four steps, one account, one workflow.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
                    <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="text-xl font-bold text-primary-foreground mb-3">{s.title}</h3>
                    <p className="text-page-fg-muted leading-relaxed">{s.desc}</p>
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

          <section className="mb-20 bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-foreground mb-6 text-center">Why artists trust Musicdibs</h2>
            <ul className="space-y-3 max-w-2xl mx-auto">
              <li className="text-page-fg-muted leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                Blockchain certification on public chains (Ethereum, Polygon, Solana).
              </li>
              <li className="text-page-fg-muted leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                Legally valid internationally, aligned with the Berne Convention and WIPO Copyright Treaty.
              </li>
              <li className="text-page-fg-muted leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-success shrink-0 mt-1" />
                100,000+ artists already using the platform.
              </li>
            </ul>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10 text-primary-foreground">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQ.map((f, i) => (
                <div key={i} className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-primary-foreground mb-3">{f.q}</h3>
                  <p className="text-page-fg-muted leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="text-center bg-gradient-to-r from-brand/10 to-primary/10 border border-brand/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">Create with AI. Own it for real.</h2>
            <p className="text-page-fg-muted mb-8 max-w-xl mx-auto">
              Register your first work today and see how the full workflow feels.
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

export default MusicdibsVsLoudlyPage;
