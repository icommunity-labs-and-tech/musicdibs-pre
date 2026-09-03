import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  Eye,
  Fingerprint,
  Scale,
  Shield,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { trackSignupCtaClick } from "@/lib/googleAdsConversions";
import {
  CERTIFICATE_PROOF_COPY,
  type CertProofLang,
} from "@/pages/certificateProofCopy";

/**
 * Landing: /certificado-blockchain
 * Secondary destination for the PMax leads campaign. Shows what a blockchain
 * certificate contains, an illustrative authorship-dispute case (clearly
 * labelled as such — no fabricated names or testimonials) and FAQs.
 * Trilingual (es/en/pt-BR) with FAQPage + BreadcrumbList JSON-LD.
 */

const PATH = "/certificado-blockchain";
const BASE_URL = "https://www.musicdibs.com";

const CertificateProofPage = () => {
  const { i18n } = useTranslation();
  const lang: CertProofLang = (["es", "en", "pt-BR"].includes(i18n.language)
    ? i18n.language
    : "es") as CertProofLang;
  const c = CERTIFICATE_PROOF_COPY[lang];
  const fullUrl = `${BASE_URL}${PATH}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
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
      { "@type": "ListItem", position: 2, name: c.h1b, item: fullUrl },
    ],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={c.seoTitle}
        description={c.seoDesc}
        path={PATH}
        lang={lang}
        jsonLd={[faqSchema, breadcrumbSchema]}
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 rounded-full px-4 py-1.5 text-sm text-brand mb-6">
            <Shield className="w-4 h-4" />
            {c.badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-page-fg">
            {c.h1a}{" "}
            <span className="bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
              {c.h1b}
            </span>
          </h1>
          <p className="text-page-fg-muted text-lg max-w-2xl mx-auto mb-8">
            {c.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link
                to="/login?tab=register"
                onClick={() => trackSignupCtaClick("certificate_proof_hero")}
              >
                {c.ctaPrimary} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/verify">
                <Eye className="w-4 h-4 mr-1.5" /> {c.ctaSecondary}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Anatomy of the certificate */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-brand text-sm font-semibold uppercase tracking-wider mb-2">
              {c.anatomyEyebrow}
            </p>
            <h2 className="text-3xl font-bold text-page-fg mb-4">{c.anatomyTitle}</h2>
            <p className="text-page-fg-muted max-w-2xl mx-auto">{c.anatomyDesc}</p>
          </div>

          <div className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8 relative overflow-hidden">
            <span className="absolute top-4 right-4 text-xs font-medium text-brand bg-brand/10 border border-brand/30 rounded-full px-3 py-1">
              {c.sampleLabel}
            </span>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-page-fg">{c.certTitle}</h3>
                <p className="text-success text-sm inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4" /> {c.certVerified}
                </p>
              </div>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
              {c.certFields.map((f) => (
                <div key={f.k} className="border-b border-page-border pb-3">
                  <dt className="text-xs uppercase tracking-wide text-page-fg-muted">
                    {f.k}
                  </dt>
                  <dd className="text-page-fg font-medium mt-0.5 break-all">{f.v}</dd>
                </div>
              ))}
            </dl>
            <a
              href="https://checker.icommunitylabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline inline-flex items-center gap-1.5 text-sm"
            >
              {c.certCheckerLabel} <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-page-fg-muted text-sm mt-6 border-t border-page-border pt-6 flex items-start gap-2">
              <Scale className="w-4 h-4 text-brand mt-0.5 shrink-0" />
              {c.certBerne}
            </p>
          </div>
        </div>
      </section>

      {/* Case story */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-brand text-sm font-semibold uppercase tracking-wider mb-2">
              {c.caseEyebrow}
            </p>
            <h2 className="text-3xl font-bold text-page-fg mb-4">{c.caseTitle}</h2>
            <p className="text-page-fg-muted text-sm max-w-2xl mx-auto italic">
              {c.caseDisclaimer}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {c.caseSteps.map((s) => (
              <div
                key={s.t}
                className="bg-page-surface backdrop-blur-sm border border-page-border rounded-xl p-6"
              >
                <h3 className="text-page-fg font-semibold mb-2">{s.t}</h3>
                <p className="text-page-fg-muted text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {c.caseParagraphs.map((p, i) => (
              <p key={i} className="text-page-fg-muted leading-relaxed">
                {p}
              </p>
            ))}
            <p className="text-page-fg font-medium leading-relaxed border-l-4 border-brand pl-4">
              {c.caseConclusion}
            </p>
          </div>
        </div>
      </section>

      {/* Verify it yourself */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-brand text-sm font-semibold uppercase tracking-wider mb-2">
              {c.verifyEyebrow}
            </p>
            <h2 className="text-3xl font-bold text-page-fg mb-4">{c.verifyTitle}</h2>
            <p className="text-page-fg-muted max-w-2xl mx-auto">{c.verifyDesc}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {c.verifySteps.map((s) => (
              <div
                key={s.t}
                className="bg-page-surface backdrop-blur-sm border border-page-border rounded-xl p-6"
              >
                <h3 className="text-page-fg font-semibold mb-2">{s.t}</h3>
                <p className="text-page-fg-muted text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/verify">
                <Eye className="w-4 h-4 mr-1.5" /> {c.verifyCta}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-brand text-sm font-semibold uppercase tracking-wider mb-2">
              {c.faqEyebrow}
            </p>
            <h2 className="text-3xl font-bold text-page-fg">{c.faqTitle}</h2>
          </div>
          <div className="space-y-4">
            {c.faq.map((f) => (
              <details
                key={f.q}
                className="bg-page-surface backdrop-blur-sm border border-page-border rounded-xl p-6 group"
              >
                <summary className="text-page-fg font-semibold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <Sparkles className="w-4 h-4 text-brand shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-page-fg-muted leading-relaxed mt-4">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-10">
          <h2 className="text-3xl font-bold text-page-fg mb-4">{c.finalTitle}</h2>
          <p className="text-page-fg-muted mb-8 max-w-xl mx-auto">{c.finalDesc}</p>
          <Button asChild size="lg">
            <Link
              to="/login?tab=register"
              onClick={() => trackSignupCtaClick("certificate_proof_final")}
            >
              {c.finalCta} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CertificateProofPage;
