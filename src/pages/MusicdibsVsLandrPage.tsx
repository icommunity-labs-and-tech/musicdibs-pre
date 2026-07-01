import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Shield, Music2, Radio, Megaphone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

/**
 * Comparison landing: Musicdibs vs LANDR.
 * LANDR already covers mastering + distribution + samples — no false wins.
 * Only highlighted differentiator: blockchain-certified authorship
 * registration, which LANDR does not provide.
 */

const PATH = "/musicdibs-vs-landr";
const URL = `https://www.musicdibs.com${PATH}`;

type Row = { feature: string; landr: string | boolean; musicdibs: string | boolean; highlight?: boolean };

const TABLE_ROWS: Row[] = [
  { feature: "AI mastering", landr: true, musicdibs: true },
  { feature: "Distribution to streaming platforms", landr: true, musicdibs: "Yes — 220+ platforms" },
  { feature: "Sample and plugin library", landr: true, musicdibs: "Limited" },
  {
    feature: "Blockchain-certified authorship registration",
    landr: false,
    musicdibs: "Yes — public chains",
    highlight: true,
  },
  { feature: "AI song creation (lyrics, vocals, full tracks)", landr: false, musicdibs: true },
  { feature: "Promo materials (covers, videos, social)", landr: false, musicdibs: true },
  { feature: "Royalty retention on distribution", landr: "Varies by plan", musicdibs: "100%" },
];

const STEPS = [
  { icon: Music2, title: "1. Create", desc: "AI mastering, plus full-track generation, vocals, lyrics and cover art." },
  { icon: Shield, title: "2. Protect", desc: "Blockchain-certify authorship on Ethereum, Polygon and Solana before publishing. LANDR does not." },
  { icon: Radio, title: "3. Distribute", desc: "Release to 220+ platforms with royalty splits between collaborators." },
  { icon: Megaphone, title: "4. Promote", desc: "Auto-generate covers, promo videos and social clips in the same account." },
];

const FAQ = [
  {
    q: "If I already master and distribute with LANDR, why add Musicdibs?",
    a: "LANDR handles the audio quality and the streaming platforms. What it doesn't handle is proving you own the master and the composition on a specific date. Musicdibs plugs that gap without you leaving your current workflow.",
  },
  {
    q: "Can I use LANDR mastering and Musicdibs certification together?",
    a: "Yes. Many producers master on LANDR and register the final file on Musicdibs before releasing — anywhere.",
  },
  {
    q: "What makes blockchain registration different from a simple upload date?",
    a: "A platform upload date lives on that platform's servers and disappears if the account or company does. Public-chain certification is independent, immutable and internationally recognized under the Berne Convention.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-5 h-5 text-emerald-400 mx-auto stroke-[3]" />;
  if (value === false) return <X className="w-5 h-5 text-red-400 mx-auto stroke-[3]" />;
  return <span className="text-white/90 text-sm font-medium">{value}</span>;
}

const MusicdibsVsLandrPage = () => {
  const seoTitle = "Musicdibs vs LANDR: Mastering + Distribution vs Full Ownership Workflow";
  const seoDesc =
    "LANDR masters and distributes your music. Musicdibs does that and certifies authorship on the blockchain. Honest side-by-side comparison.";

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
      { "@type": "ListItem", position: 2, name: "Musicdibs vs LANDR", item: URL },
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
            <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-5 py-2 mb-6">
              <Shield className="w-5 h-5 text-pink-400" />
              <span className="text-pink-300 text-sm font-medium">Musicdibs vs LANDR</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              LANDR masters your track. Musicdibs also proves you own it.
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-3xl mx-auto mb-10">
              LANDR is a solid mastering-and-distribution combo. The gap it doesn't cover is authorship
              evidence — the piece that actually matters when your track starts getting attention.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Protect your first master <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-3 text-white">Honest comparison</h2>
            <p className="text-white/60 text-center mb-10 text-sm max-w-xl mx-auto">
              LANDR data based on publicly available product information as of 2026.
            </p>
            <div className="overflow-x-auto rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-5 text-white/60 font-bold text-xs uppercase tracking-wide w-1/2">
                      Feature
                    </th>
                    <th className="px-4 py-5 text-center text-white/70 font-bold">LANDR</th>
                    <th className="px-4 py-5 text-center bg-pink-500/10 border-x border-pink-500/30 text-white font-bold">
                      Musicdibs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/5 last:border-b-0 ${
                        row.highlight ? "bg-pink-500/10" : i % 2 === 0 ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <td className="px-5 py-4 text-white/80 font-medium">
                        {row.feature}
                        {row.highlight && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-pink-300 font-bold">
                            Key difference
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center"><Cell value={row.landr} /></td>
                      <td className="px-4 py-4 text-center bg-pink-500/5 border-x border-pink-500/20">
                        <Cell value={row.musicdibs} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">To be fair to LANDR</h2>
            <p className="text-white/70 leading-relaxed">
              LANDR's AI mastering is one of the more mature products in the space, its sample library is
              genuinely useful, and its distribution works. Nothing in this comparison is a knock on those.
              The point is only what LANDR doesn't try to do — certify authorship — and how that gap changes
              the moment your music starts to matter.
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
                    <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-pink-400" />
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
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                Blockchain certification on public chains — independent of Musicdibs' own infrastructure.
              </li>
              <li className="text-white/80 leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                Legally valid internationally under the Berne Convention and WIPO Copyright Treaty.
              </li>
              <li className="text-white/80 leading-relaxed flex gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
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

          <section className="text-center bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Master it. Prove it. Release it.</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Register your first master today and see the full Musicdibs workflow.
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

export default MusicdibsVsLandrPage;
