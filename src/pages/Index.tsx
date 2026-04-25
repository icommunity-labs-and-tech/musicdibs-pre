import { ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ArtistsBanner } from "@/components/ArtistsBanner";
import { SEO } from "@/components/SEO";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy-load below-fold sections to reduce initial JS and improve TTI
const WhyChooseSection = lazyWithRetry(() => import("@/components/WhyChooseSection").then(m => ({ default: m.WhyChooseSection })));
const AIStudioShowcase = lazyWithRetry(() => import("@/components/AIStudioShowcase").then(m => ({ default: m.AIStudioShowcase })));
const BridgeStatement = lazyWithRetry(() => import("@/components/BridgeStatement").then(m => ({ default: m.BridgeStatement })));
const PromoVisualsShowcase = lazyWithRetry(() => import("@/components/PromoVisualsShowcase").then(m => ({ default: m.PromoVisualsShowcase })));
const MasteringHighlight = lazyWithRetry(() => import("@/components/MasteringHighlight").then(m => ({ default: m.MasteringHighlight })));
const DistributionSection = lazyWithRetry(() => import("@/components/DistributionSection").then(m => ({ default: m.DistributionSection })));
const TestimonialsSection = lazyWithRetry(() => import("@/components/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const PricingSection = lazyWithRetry(() => import("@/components/PricingSection").then(m => ({ default: m.PricingSection })));
const RoyaltiesCalculator = lazyWithRetry(() => import("@/components/RoyaltiesCalculator").then(m => ({ default: m.RoyaltiesCalculator })));

const ManagerBannerSection = lazyWithRetry(() => import("@/components/ManagerBannerSection").then(m => ({ default: m.ManagerBannerSection })));
const Footer = lazyWithRetry(() => import("@/components/Footer").then(m => ({ default: m.Footer })));

const DeferredSection = ({ children, minHeight = 320 }: { children: ReactNode; minHeight?: number }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender]);

  return <div ref={ref} style={!shouldRender ? { minHeight } : undefined}>{shouldRender ? children : null}</div>;
};

const Index = () => {
  return (
    <div className="min-h-screen page-bg">
      <SEO
        title="Musicdibs - Registro y Distribución Musical"
        description="Distribuye tu música en Spotify, Apple Music, YouTube Music y más de 150 plataformas digitales. Protege tus derechos con certificación blockchain."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Musicdibs",
            url: "https://musicdibs.com",
            logo: "https://musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
            description: "Plataforma de registro y distribución musical digital con certificación blockchain.",
            sameAs: [
              "https://www.youtube.com/@Musicdibs",
              "https://www.instagram.com/musicdibs",
              "https://www.tiktok.com/@musicdibs"
            ],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              availableLanguage: ["Spanish", "English", "Portuguese", "French", "Italian", "German"]
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Musicdibs",
            description: "Registro de obras con certificación blockchain y distribución en más de 150 plataformas digitales.",
            brand: { "@type": "Brand", name: "Musicdibs" },
            offers: [
              {
                "@type": "Offer",
                name: "Essential",
                price: "2.99",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                name: "Professional",
                price: "4.99",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                name: "Premium",
                price: "9.99",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock"
              }
            ]
          }
        ]}
      />
      <Navbar />
      <HeroSection />
      <ArtistsBanner />
      <DeferredSection minHeight={520}><Suspense fallback={null}><WhyChooseSection /></Suspense></DeferredSection>
      <DeferredSection minHeight={620}><Suspense fallback={null}><AIStudioShowcase /></Suspense></DeferredSection>
      <DeferredSection minHeight={220}><Suspense fallback={null}><BridgeStatement /></Suspense></DeferredSection>
      <DeferredSection minHeight={980}><Suspense fallback={null}><PromoVisualsShowcase /></Suspense></DeferredSection>
      <DeferredSection minHeight={520}><Suspense fallback={null}><MasteringHighlight /></Suspense></DeferredSection>
      <DeferredSection minHeight={560}><Suspense fallback={null}><DistributionSection /></Suspense></DeferredSection>
      <DeferredSection minHeight={560}><Suspense fallback={null}><RoyaltiesCalculator /></Suspense></DeferredSection>
      <DeferredSection minHeight={520}><Suspense fallback={null}><TestimonialsSection /></Suspense></DeferredSection>
      <DeferredSection minHeight={720}><Suspense fallback={null}><PricingSection /></Suspense></DeferredSection>
      <DeferredSection minHeight={520}><Suspense fallback={null}><ManagerBannerSection /></Suspense></DeferredSection>
      <DeferredSection minHeight={360}><Suspense fallback={null}><Footer /></Suspense></DeferredSection>
    </div>
  );
};

export default Index;
