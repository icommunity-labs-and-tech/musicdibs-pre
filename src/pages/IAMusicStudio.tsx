import { Helmet } from "react-helmet-async";
import "@/styles/landing-ai-studio.css";
import { BackgroundScene } from "@/components/landing/BackgroundScene";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { VoiceToProduction } from "@/components/landing/VoiceToProduction";
import { PromoVisualsShowcase } from "@/components/landing/PromoVisualsShowcase";
import { SocialBanner } from "@/components/landing/SocialBanner";
import { EcosystemContinuation } from "@/components/landing/EcosystemContinuation";
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
        <link rel="canonical" href="https://musicdibs.com/ia-music-studio" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>

      <div className="landing-ai-studio">
        <main className="relative min-h-screen overflow-hidden">
          <BackgroundScene />
          <Navbar />
          <Hero />
          <VoiceToProduction />
          <PromoVisualsShowcase />
          <SocialBanner />
          <Footer />
        </main>
      </div>
    </>
  );
}
