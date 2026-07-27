import { Helmet } from "react-helmet-async";
import "@/styles/landing-ai-studio.css";
import { BackgroundScene } from "@/components/landing/BackgroundScene";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { VoiceToProduction } from "@/components/landing/VoiceToProduction";
import { PromoVisualsShowcase } from "@/components/landing/PromoVisualsShowcase";
import { SocialBanner } from "@/components/landing/SocialBanner";

import { Footer } from "@/components/landing/Footer";

export default function IAMusicStudio() {
  return (
    <>
      <Helmet>
        <title>Musicdibs IA Music Studio · Crea, masteriza y domina con IA</title>
        <meta
          name="description"
          content="Estudio musical con IA para crear canciones desde cero, masterizar, generar material promocional y diseñar artistas virtuales en minutos."
        />
        <meta property="og:title" content="Musicdibs IA Music Studio" />
        <meta
          property="og:description"
          content="Crea. Perfecciona. Domina con IA. El estudio musical definitivo."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.musicdibs.com/ia-music-studio" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Musicdibs IA Music Studio",
            serviceType: "Estudio musical con inteligencia artificial",
            description:
              "Estudio musical con IA para crear canciones desde cero, masterizar audio, generar material promocional visual y diseñar artistas virtuales en minutos.",
            areaServed: "Worldwide",
            url: "https://www.musicdibs.com/ia-music-studio",
            provider: {
              "@type": "Organization",
              name: "Musicdibs",
              url: "https://www.musicdibs.com",
              logo: "https://www.musicdibs.com/logo.png",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "EUR",
              price: "0",
              availability: "https://schema.org/InStock",
              url: "https://www.musicdibs.com/ia-music-studio",
            },
          })}
        </script>
      </Helmet>


      <div className="landing-ai-studio">
        <main className="relative min-h-screen overflow-hidden">
          <BackgroundScene />
          <Navbar />
          <Hero />
          <VoiceToProduction />
          <PromoVisualsShowcase />

          <section className="relative py-28 sm:py-36">
            <div className="mx-auto max-w-5xl px-6 text-center animate-fade-in">
              <p
                className="font-display font-semibold tracking-tight text-foreground/90 text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.15]"
                style={{ textWrap: "balance" as any }}
              >
                Y cuando tu canción esté lista…{" "}
                <span className="block sm:inline text-foreground/70 font-medium">
                  también puedes{" "}
                </span>
                <span
                  className="bg-clip-text text-transparent font-bold"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, oklch(0.85 0.25 322), oklch(0.72 0.28 295))",
                    filter:
                      "drop-shadow(0 0 24px oklch(0.68 0.27 322 / 0.45))",
                  }}
                >
                  registrar sus derechos de autor
                </span>
                <span className="text-foreground/70 font-medium"> y </span>
                <span
                  className="bg-clip-text text-transparent font-semibold"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, oklch(0.92 0.05 322), oklch(0.85 0.12 295))",
                  }}
                >
                  distribuirla internacionalmente
                </span>
                <span className="text-foreground/70 font-medium"> con </span>
                <span className="text-foreground font-semibold">Musicdibs</span>
                <span className="text-foreground/70">.</span>
              </p>
            </div>
          </section>

          <SocialBanner />
          <Footer />
        </main>
      </div>
    </>
  );
}
