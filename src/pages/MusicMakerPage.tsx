import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Music2, Mic, Shield, Globe2, Megaphone, Zap, Users, Wand2, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const BASE_URL = "https://www.musicdibs.com";
const PATH = "/music-maker";
const URL = `${BASE_URL}${PATH}`;

const FEATURES = [
  { icon: Sparkles, title: "Prompt-based song creation", desc: "Describe genre, mood, tempo and lyrics theme — the music maker returns a full track in minutes." },
  { icon: Mic, title: "AI vocals in any style", desc: "Male, female, rap, whisper, choir, cinematic. Multiple languages supported." },
  { icon: Music2, title: "Instrumentals and stems", desc: "Full arrangements plus editable stems for remixing and mastering." },
  { icon: Wand2, title: "One-click AI mastering", desc: "Streaming-ready loudness and tonal balance without a studio." },
  { icon: Shield, title: "Copyright built in", desc: "Every track gets a blockchain-timestamped certificate proving authorship." },
  { icon: Globe2, title: "Release to 220+ platforms", desc: "Push to Spotify, Apple Music, TikTok and more from the same dashboard." },
];

const USE_CASES = [
  { title: "Content creators", desc: "Original background music you can safely monetize on YouTube, TikTok and Reels." },
  { title: "Indie artists", desc: "Rapidly sketch songs, refine what works and release under your own name." },
  { title: "Podcasters", desc: "Intros, outros and transitions built in seconds with royalty-clear ownership." },
  { title: "Ad and brand teams", desc: "Custom jingles and sonic branding without licensing headaches." },
  { title: "Games and film", desc: "Loops and cues in the exact style your scene needs." },
  { title: "Educators", desc: "Teach composition and production with instant, editable examples." },
];

const COMPARE = [
  { feature: "Setup time", tools: "Hours to install a DAW + plugins", mdb: "0 — works in the browser" },
  { feature: "Skill needed", tools: "Years of production", mdb: "A written prompt" },
  { feature: "Cost floor", tools: "Hundreds in software", mdb: "From free" },
  { feature: "Copyright evidence", tools: "External service", mdb: "Included" },
  { feature: "Distribution", tools: "Separate provider", mdb: "Included" },
];

const FAQ = [
  { q: "What is an AI music maker?", a: "An AI music maker generates full original songs — instrumentation, vocals, lyrics — from a written prompt. Musicdibs is a music maker built for real releases: the songs you generate can be copyrighted on blockchain and distributed to streaming platforms without leaving the app." },
  { q: "Can I use the songs commercially?", a: "Yes. Songs you create on Musicdibs are yours. You can monetize them on YouTube and TikTok, license them for ads, or release them to Spotify and Apple Music. Musicdibs does not take a cut of your streaming royalties." },
  { q: "Do I need any music production experience?", a: "No. You describe the song in plain English. Advanced users can also edit stems, add their own vocals or fine-tune with the AI Studio's inspire and enhance tools." },
  { q: "How does Musicdibs compare to Suno and Udio?", a: "Musicdibs covers the same creation surface plus everything Suno and Udio don't: blockchain copyright certificate, distribution to 220+ platforms, AI cover art, promo videos and manager tools. See our detailed comparisons vs Udio and Loudly." },
  { q: "How long does it take to make a song?", a: "The first draft is ready in under 3 minutes. Adding vocals, remastering and generating cover art typically brings total time to 5–10 minutes." },
];

const MusicMakerPage = () => {
  const seoTitle = "AI Music Maker: Create, Copyright and Release Songs in Minutes | Musicdibs";
  const seoDesc =
    "The all-in-one AI music maker: generate full songs with AI vocals and lyrics, protect your copyright on blockchain, and release to Spotify and 220+ platforms.";

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Musicdibs AI Music Maker",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    url: URL,
    image: "https://www.musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
    description: seoDesc,
    offers: { "@type": "AggregateOffer", lowPrice: "0", highPrice: "399.90", priceCurrency: "EUR", offerCount: "5" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 137 },
    featureList: FEATURES.map((f) => f.title),
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Musicdibs", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Music Maker", item: URL },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO title={seoTitle} description={seoDesc} path={PATH} type="website" lang="en" jsonLd={[softwareSchema, faqSchema, breadcrumbSchema]} />
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-primary text-sm font-medium">AI Music Maker</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-brand bg-clip-text text-transparent">
              The AI music maker built for real releases
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-3xl mx-auto mb-10">
              Generate full songs with AI vocals and lyrics, get a blockchain copyright certificate, and release
              to Spotify and 220+ platforms — from a single account.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl" className="font-semibold">
                  <span className="flex items-center gap-2">Start making music free <ArrowRight className="w-5 h-5" /></span>
                </Button>
              </Link>
              <Link to="/musicdibs-vs-udio">
                <Button variant="outline" size="xl" className="font-semibold">Compare to Udio</Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-10 text-white/60 text-sm">
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 100,000+ artists</span>
              <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Blockchain copyright</span>
              <span className="flex items-center gap-2"><Globe2 className="w-4 h-4" /> 220+ platforms</span>
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Songs in minutes</span>
            </div>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">Everything an AI music maker should do</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <div className="w-11 h-11 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">Who uses the Musicdibs music maker</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {USE_CASES.map((u, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-2">{u.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{u.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10 text-white">Traditional tools vs Musicdibs</h2>
            <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-4 text-white/60 font-bold text-xs uppercase tracking-wide">Aspect</th>
                    <th className="px-4 py-4 text-center text-white/70 font-bold">DAW + plugins</th>
                    <th className="px-4 py-4 text-center bg-primary/10 border-x border-primary/30 text-white font-bold">Musicdibs</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r, i) => (
                    <tr key={i} className={`border-b border-white/5 last:border-b-0 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                      <td className="px-5 py-4 text-white/80 font-medium">{r.feature}</td>
                      <td className="px-4 py-4 text-center text-white/70">{r.tools}</td>
                      <td className="px-4 py-4 text-center bg-primary/5 border-x border-primary/20 text-white/90">{r.mdb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-20 bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Why creators pick Musicdibs</h2>
            <ul className="space-y-3 max-w-2xl mx-auto">
              <li className="flex gap-3 text-white/80"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> No commission on your streaming royalties.</li>
              <li className="flex gap-3 text-white/80"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> Blockchain-timestamped proof of authorship for every track.</li>
              <li className="flex gap-3 text-white/80"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> AI covers, videos and social creatives from the same account.</li>
              <li className="flex gap-3 text-white/80"><Check className="w-5 h-5 text-success shrink-0 mt-1" /> Multi-artist manager panel for labels and agencies.</li>
            </ul>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10 text-white">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQ.map((f, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3">{f.q}</h3>
                  <p className="text-white/70 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="text-center bg-gradient-to-r from-primary/10 to-brand/10 border border-primary/20 rounded-2xl p-12">
            <Megaphone className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">Make a song. Release it today.</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">Free to start. No credit card. Distribute your first single tomorrow.</p>
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">Try the music maker <ArrowRight className="w-5 h-5" /></span>
              </Button>
            </Link>
          </section>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default MusicMakerPage;
