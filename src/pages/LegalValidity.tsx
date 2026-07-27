import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Shield, Lock, Globe, FileCheck, Link as LinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const LegalValidity = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Validez Legal" description="Conoce la validez legal de los certificados blockchain de Musicdibs para proteger tus derechos de autor." path="/legal-validity" />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-brand to-primary bg-clip-text text-transparent">
            {t("legalValidity.title")}
          </h1>
          <p className="text-page-fg-muted text-center text-lg mb-16 max-w-2xl mx-auto">
            {t("legalValidity.subtitle")}
          </p>

          {/* Legal Framework */}
          <div className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand" />
              </div>
              <h2 className="text-2xl font-bold text-page-fg">{t("legalValidity.framework_title")}</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-brand mt-1 shrink-0" />
                <span className="text-page-fg-muted">
                  <strong className="text-page-fg">{t("legalValidity.berne_title")}</strong> {t("legalValidity.berne_desc")}{" "}
                  <a href="https://www.wipo.int/treaties/es/ip/berne/" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand underline inline-flex items-center gap-1">
                    {t("legalValidity.view_here")} <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-brand mt-1 shrink-0" />
                <span className="text-page-fg-muted">
                  <strong className="text-page-fg">{t("legalValidity.wipo_title")}</strong> {t("legalValidity.wipo_desc")}{" "}
                  <a href="https://www.wipo.int/treaties/es/ip/wct/" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand underline inline-flex items-center gap-1">
                    {t("legalValidity.view_here")} <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-brand mt-1 shrink-0" />
                <span className="text-page-fg-muted">
                  <strong className="text-page-fg">{t("legalValidity.eu_directive_title")}</strong>.{" "}
                  <a href="https://digital-strategy.ec.europa.eu/es/policies/copyright" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand underline inline-flex items-center gap-1">
                    {t("legalValidity.view_here")} <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-brand mt-1 shrink-0" />
                <span className="text-page-fg-muted">
                  <strong className="text-page-fg">{t("legalValidity.blockchain_regulation_title")}</strong>.
                </span>
              </li>
            </ul>
            <p className="text-page-fg-muted mt-6 border-t border-page-border pt-6">
              {t("legalValidity.framework_footer")}
            </p>
          </div>

          {/* Blockchain */}
          <div className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-page-fg">{t("legalValidity.blockchain_title")}</h2>
            </div>
            <p className="text-page-fg-muted leading-relaxed mb-4">
              <a href="https://www.youtube.com/watch?v=Yn8WGaO__ak" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand underline">{t("legalValidity.blockchain_link_text")}</a>{' '}
              — {t("legalValidity.blockchain_text_1")}
            </p>
            <p className="text-page-fg-muted leading-relaxed">
              {t("legalValidity.blockchain_text_2")}
            </p>
          </div>

          {/* Identity Verification */}
          <div className="bg-page-surface backdrop-blur-sm border border-page-border rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-page-fg">{t("legalValidity.identity_title")}</h2>
            </div>
            <p className="text-page-fg-muted leading-relaxed mb-4">
              {t("legalValidity.identity_text_1")}
            </p>
            <p className="text-page-fg-muted leading-relaxed">
              {t("legalValidity.identity_text_2")}
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LegalValidity;
