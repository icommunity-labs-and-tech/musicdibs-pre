import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Shield, Music2, Radio, Megaphone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const PATH = "/musicdibs-vs-udio";
const URL = `https://www.musicdibs.com${PATH}`;

type Row = {
  feature: string;
  udio: string | boolean;
  musicdibs: string | boolean;
  highlight?: boolean;
};

const TABLE_ROWS: Row[] = [
  { feature: "Generate full songs with AI", udio: true, musicdibs: true },
  { feature: "AI vocals and lyrics", udio: true, musicdibs: true },
  { feature: "Stems / editable tracks", udio: "Limited", musicdibs: true },
  {
    feature: "Blockchain copyright certificate",
    udio: false,
    musicdibs: "Included",
    highlight: true,
  },
  {
    feature: "Distribution to Spotify, Apple, TikTok (220+ platforms)",
    udio: false,
    musicdibs: "Included",
    highlight: true,
  },
  { feature: "Royalty commission by the platform", udio: "N/A — no distribution", musicdibs: "0% — you keep 100%" },
  { feature: "AI covers, promo videos and social creatives", udio: false, musicdibs: true },
  { feature: "Manager / multi-artist roster tools", udio: false, musicdibs: true },
  { feature: "Commercial license clarity", udio: "Depends on plan", musicdibs: "Yours, timestamped on-chain" },
];

const STEPS = [
  { icon: Music2, title: "1. Create", desc: "Prompt-based generation of songs, vocals, lyrics and mastering in one workspace." },
  { icon: Shield, title: "2. Protect", desc: "One-click blockchain certification before releasing. Udio does not offer this." },
  { icon: Radio, title: "3. Distribute", desc: "Ship to Spotify, Apple Music, TikTok and 220+ stores from the same dashboard." },
  { icon: Megaphone, title: "4. Promote", desc: "Generate covers, video clips and social ad creatives with AI." },
];

const FAQ = [
  {
    q: "Is Musicdibs a direct alternative to Udio?",
    a: "Yes for the creation side — Musicdibs has AI song generation, vocals and lyrics comparable to Udio's core use case. The difference is what happens next: on Musicdibs you can also copyright, distribute and promote the track from the same account.",
  },
  {
    q: "Can I release Udio songs to Spotify?",
    a: "Udio itself does not distribute to streaming platforms. You would need to upload the file to a separate distributor. On Musicdibs distribution is built in and there is no per-release fee on paid plans.",
  },
  {
    q: "Who owns the songs I create?",
    a: "On Musicdibs the generated song is yours and you receive a blockchain-timestamped certificate proving authorship, admissible as technical evidence under the Berne Convention in 180+ countries.",
  },
  {
    q: "Do I have to give up Udio to use Musicdibs?",
    a: "No. If you like Udio's output on certain genres you can still create there and register/distribute the final file on Musicdibs to add the protection and release layers.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-5 h-5 text-emerald-400 mx-auto stroke-[3]" />;
  if (value === false) return <X className="w-5 h-5 text-red-400 mx-auto stroke-[3]" />;
  return <span className="text-white/90 text-sm font-medium">{value}</span>;
}

const MusicdibsVsUdioPage = () => {
  const seoTitle = "Musicdibs vs Udio: AI Song Generation Plus Copyright and Distribution";
  const seoDesc =
    "Udio generates AI songs. Musicdibs generates them, blockchain-certifies your copyright and distributes to Spotify and 220+ platforms. Honest 2026 comparison.";

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Musicdibs",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    url: "https://www.musicdibs.com",
    image: "https://www.musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
    description: seoDesc,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "6.90",
      highPrice: "399.90",
      priceCurrency: "EUR",
      offerCount: "5",
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 137 },
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
      { "@type": "ListItem", position: 2, name: "Musicdibs vs Udio", item: URL },
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
        jsonLd={[softwareSchema, faqSchema, breadcrumbSchema]}
      />
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-5 py-2 mb-6">
              <Shield className="w-5 h-5 text-pink-400" />
              <span className="text-pink-300 text-sm font-medium">Musicdibs vs Udio</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Udio generates songs. Musicdibs releases them, protects them and gets them paid.
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-3xl mx-auto mb-10">
              Both platforms let you create studio-quality tracks with AI. The difference is what happens after
              you hit "generate": copyright evidence, distribution to Spotify and promo assets, all in one place.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">
                    Create and release your first track <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
              <Link to="/ai-song-generator">
                <Button variant="outline" size="xl" className="font-semibold">
                  See the AI Song Generator
                </Button>
              </Link>
            </div>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-3 text-white">Honest comparison</h2>
            <p className="text-white/60 text-center mb-10 text-sm max-w-xl mx-auto">
              Udio data based on publicly available product information as of 2026.
            </p>
            <div className="overflow-x-auto rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-5 text-white/60 font-bold text-xs uppercase tracking-wide w-1/2">
                      Feature
                    </th>
                    <th className="px-4 py-5 text-center text-white/70 font-bold">Udio</th>
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
                      <td className="px-4 py-4 text-center"><Cell value={row.udio} /></td>
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
            <h2 className="text-2xl font-bold text-white mb-4">To be fair to Udio</h2>
            <p className="text-white/70 leading-relaxed">
              Udio pushed the quality bar on AI vocal generation and is a strong choice if all you want is to
              generate a track and download the file. This page is about what happens the moment that track
              starts mattering — when you want it on Spotify, when you need to prove you made it, or when
              someone else uploads it as their own.
            </p>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">The complete flow on Musicdibs</h2>
            <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">
              Four steps, one account, no third-party tools.
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
            <div className="text-center mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/all-in-one-music-platform">
                <Button variant="hero" size="lg" className="font-semibold">
                  <span className="flex items-center gap-2">
                    See the full platform <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
              <Link to="/musicdibs-vs-distrokid">
                <Button variant="outline" size="lg">Musicdibs vs DistroKid</Button>
              </Link>
              <Link to="/musicdibs-vs-loudly">
                <Button variant="outline" size="lg">Musicdibs vs Loudly</Button>
              </Link>
            </div>
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
            <h2 className="text-3xl font-bold text-white mb-4">Generate with AI. Release for real.</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Sign up free and create, protect and distribute your first song today.
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

export default MusicdibsVsUdioPage;
