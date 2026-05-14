import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Mic,
  FileText,
  Music2,
  Wand2,
  Globe2,
  Shield,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  Users,
  Zap,
  Workflow,
  Rocket,
} from "lucide-react";
import heroImage from "@/assets/ai-song-generator-hero.jpg";

const BASE_URL = "https://www.musicdibs.com";
const PATH = "/ai-song-generator";
const FULL_URL = `${BASE_URL}${PATH}`;

const TRUST = [
  { icon: Users, label: "+100,000 artists" },
  { icon: Shield, label: "Blockchain-certified protection" },
  { icon: Globe2, label: "Global distribution" },
  { icon: Zap, label: "AI-powered workflow" },
];

const FLOW = [
  { icon: Sparkles, title: "Create", desc: "Generate full songs, lyrics and vocals from a single prompt." },
  { icon: Shield, title: "Protect", desc: "Blockchain-certified proof of authorship in minutes." },
  { icon: Globe2, title: "Distribute", desc: "Release to Spotify, Apple Music and 150+ platforms." },
  { icon: Megaphone, title: "Promote", desc: "AI-generated covers, videos and social campaigns." },
];

const FEATURES = [
  { icon: Mic, title: "AI vocals", desc: "Studio-grade synthetic voices in any style or language." },
  { icon: FileText, title: "AI lyrics", desc: "Original lyrics co-written with AI in seconds." },
  { icon: Music2, title: "Song generation", desc: "Full instrumentals and arrangements from a prompt." },
  { icon: Wand2, title: "Music mastering", desc: "Automatic mastering tuned for streaming platforms." },
  { icon: Globe2, title: "Distribution", desc: "Worldwide release with royalty collection." },
  { icon: Shield, title: "Copyright protection", desc: "Immutable blockchain timestamp on every track." },
  { icon: Megaphone, title: "AI promo tools", desc: "Covers, video clips and ad creatives generated for you." },
  { icon: Workflow, title: "All-in-one workflow", desc: "Create, protect, release and promote without leaving the app." },
];

const COMPARE = [
  { feature: "Time to first song", trad: "Days or weeks", mdb: "Under 5 minutes" },
  { feature: "Tools required", trad: "DAW + plugins + distributor + lawyer", mdb: "One platform" },
  { feature: "Copyright proof", trad: "External registration", mdb: "Built-in blockchain certificate" },
  { feature: "Distribution", trad: "Separate service & fees", mdb: "Included" },
  { feature: "Promo assets", trad: "Hire designers", mdb: "AI-generated in seconds" },
  { feature: "Learning curve", trad: "Steep", mdb: "Prompt-based" },
];

const FAQ = [
  {
    q: "How does an AI song generator work?",
    a: "You describe the song you want — genre, mood, lyrics theme, vocal style — and the AI generates a complete track including instrumentation, vocals and lyrics. Musicdibs combines multiple specialized models so each layer of the song is produced at studio quality.",
  },
  {
    q: "Can I monetize AI-generated music?",
    a: "Yes. Songs created on Musicdibs can be distributed to streaming platforms and you keep 100% of the royalties. As long as you own the prompt and the generation, the resulting work is yours to commercialize.",
  },
  {
    q: "Can I distribute AI songs to Spotify?",
    a: "Yes. Musicdibs distributes to Spotify, Apple Music, Amazon Music, YouTube Music, TikTok, Deezer, Tidal and 150+ stores worldwide directly from the dashboard.",
  },
  {
    q: "Who owns AI-generated songs?",
    a: "On Musicdibs, you own the songs you generate. You retain authorship rights and can register them on blockchain to prove the date and authorship of your creation, which is admissible as technical evidence in most jurisdictions.",
  },
  {
    q: "Can I protect AI-generated music?",
    a: "Yes. Every track can be registered on blockchain with a tamper-proof timestamp recognized under the Berne Convention in 180+ countries. You receive a downloadable certificate with a public verification link.",
  },
];

const AISongGeneratorPage = () => {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AI Song Generator for Creators",
    url: FULL_URL,
    description:
      "Create, protect and distribute AI-generated music from one platform. AI vocals, lyrics, mastering, blockchain copyright and global distribution.",
    inLanguage: "en",
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Musicdibs AI Song Generator",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: FULL_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "1240" },
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
      { "@type": "ListItem", position: 1, name: "Musicdibs", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "AI Song Generator", item: FULL_URL },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title="AI Song Generator for Creators"
        description="Create, protect and distribute AI-generated music from one platform. AI vocals, lyrics, mastering, blockchain copyright and global distribution."
        path={PATH}
        type="website"
        locale="en"
        jsonLd={[webPageSchema, softwareSchema, faqSchema, breadcrumbSchema]}
      />
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-pink-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-white/80 text-sm font-medium">Create. Protect. Distribute. Promote.</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-br from-white via-pink-200 to-purple-300 bg-clip-text text-transparent leading-tight animate-fade-in">
            AI Song Generator for Creators
          </h1>
          <p className="text-white/70 text-lg md:text-2xl max-w-3xl mx-auto mb-10 animate-fade-in">
            Create, protect and distribute AI-generated music from one platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-16 animate-fade-in">
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  Create your first AI song <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="hero" size="xl" className="font-semibold">
                See how it works
              </Button>
            </a>
          </div>
          <div className="relative max-w-5xl mx-auto animate-fade-in">
            <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/30 to-purple-500/30 blur-2xl rounded-3xl" />
            <img
              src={heroImage}
              alt="AI music studio dashboard generating a song with waveform visualization"
              width={1280}
              height={800}
              className="relative rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="px-6 py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST.map((t, i) => (
            <div key={i} className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                <t.icon className="w-5 h-5 text-pink-400" />
              </div>
              <span className="text-white/80 text-sm md:text-base font-medium">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">From idea to release in minutes</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              One workflow. Four steps. Zero friction.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {FLOW.map((f, i) => (
              <div
                key={i}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-pink-500/40 transition-all hover-scale"
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-pink-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-24 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Everything you need, AI-native</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              A complete music suite built around generative AI.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="w-11 h-11 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXAMPLES */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Songs generated on Musicdibs</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              From bedroom pop to cinematic scores — every genre, every mood.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { genre: "Synthwave", mood: "Dreamy nights", color: "from-pink-500 to-purple-600" },
              { genre: "Lo-fi Hip Hop", mood: "Late study", color: "from-blue-500 to-cyan-500" },
              { genre: "Cinematic", mood: "Epic trailer", color: "from-orange-500 to-red-500" },
              { genre: "Indie Pop", mood: "Summer roadtrip", color: "from-purple-500 to-pink-500" },
              { genre: "Ambient", mood: "Deep focus", color: "from-emerald-500 to-teal-500" },
              { genre: "Trap", mood: "Late drive", color: "from-yellow-500 to-orange-500" },
              { genre: "Acoustic", mood: "Morning coffee", color: "from-amber-500 to-pink-500" },
              { genre: "Electronic", mood: "Festival drop", color: "from-fuchsia-500 to-indigo-500" },
            ].map((s, i) => (
              <div
                key={i}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-80`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-white/70 text-xs font-medium mb-1">AI-generated</div>
                  <div className="text-white font-bold">{s.genre}</div>
                  <div className="text-white/80 text-sm">{s.mood}</div>
                </div>
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/40 transition-all">
                  <Music2 className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-6 py-24 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Musicdibs vs traditional workflows
            </h2>
            <p className="text-white/60 text-lg">Faster. All-in-one. AI-native. Creator-first.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="text-white/60 text-sm font-medium">Feature</div>
              <div className="text-white/60 text-sm font-medium">Traditional</div>
              <div className="text-pink-300 text-sm font-bold">Musicdibs</div>
            </div>
            {COMPARE.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-6 py-4 border-b border-white/5 last:border-0 items-center"
              >
                <div className="text-white font-medium text-sm md:text-base">{row.feature}</div>
                <div className="text-white/50 text-sm md:text-base">{row.trad}</div>
                <div className="text-white text-sm md:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  {row.mdb}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {["Faster", "All-in-one", "AI-native", "Creator-first"].map((b) => (
              <span
                key={b}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-200 text-sm font-medium"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Frequently asked questions</h2>
            <p className="text-white/60 text-lg">Everything you need to know about AI song generation.</p>
          </div>
          <div className="space-y-4">
            {FAQ.map((f, i) => (
              <details
                key={i}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 open:border-pink-500/30"
              >
                <summary className="flex items-center justify-between cursor-pointer text-white font-semibold text-lg">
                  {f.q}
                  <ArrowRight className="w-5 h-5 text-pink-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-4 text-white/70 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 text-center text-white/60 text-sm">
            Learn more about{" "}
            <Link to="/copyright-a-song" className="text-pink-300 hover:text-pink-200 underline">
              how to copyright a song
            </Link>
            ,{" "}
            <Link to="/register-a-song" className="text-pink-300 hover:text-pink-200 underline">
              registering a song
            </Link>
            ,{" "}
            <Link to="/faq" className="text-pink-300 hover:text-pink-200 underline">
              the full FAQ
            </Link>{" "}
            or{" "}
            <Link to="/" className="text-pink-300 hover:text-pink-200 underline">
              pricing &amp; plans
            </Link>
            .
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24">
        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent p-12 md:p-20 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
          <Rocket className="w-12 h-12 text-pink-400 mx-auto mb-6 relative" />
          <h2 className="relative text-3xl md:text-5xl font-bold text-white mb-4">
            Launch your first AI-powered release today.
          </h2>
          <p className="relative text-white/70 text-lg max-w-2xl mx-auto mb-8">
            Join thousands of creators building, protecting and releasing music with AI.
          </p>
          <div className="relative flex flex-wrap justify-center gap-4">
            <Link to="/login">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  Create your first AI song <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
            <Link to="/register-a-song">
              <Button variant="hero" size="xl" className="font-semibold">
                Protect your music
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AISongGeneratorPage;
