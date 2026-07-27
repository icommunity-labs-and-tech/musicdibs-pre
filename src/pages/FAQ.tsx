import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const { t } = useTranslation();

  const items = (t("faq.items", { returnObjects: true }) || []) as Array<{ q: string; a: string }>;
  const sortedItems = [...items].sort((a, b) => a.q.localeCompare(b.q));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sortedItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={t("faq.title")}
        description={t("faq.seo_description")}
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
            {t("faq.title")}
          </h1>
          <p className="text-page-fg-subtle text-center mb-12 text-lg">
            {t("faq.subtitle")}
          </p>

          <Accordion type="single" collapsible className="space-y-3">
            {sortedItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-page-surface border border-page-border rounded-xl px-6 data-[state=open]:bg-page-surface transition-colors"
              >
                <AccordionTrigger className="text-left text-page-fg hover:text-page-fg py-5 text-base font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-page-fg-muted leading-relaxed pb-5 whitespace-pre-line">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ;
