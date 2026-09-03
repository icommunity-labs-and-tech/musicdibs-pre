import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { trackPurchaseConversion, trackSignupConversion } from '@/lib/googleAdsConversions';

export default function ThankYouPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') === 'purchase' ? 'purchase' : 'signup';
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (type === 'purchase' && sessionId) {
      trackPurchaseConversion(sessionId);
      return;
    }

    if (type === 'signup') {
      const email = sessionStorage.getItem('signup_email') || undefined;
      trackSignupConversion(email);
      sessionStorage.removeItem('signup_email');
    }
  }, [sessionId, type]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={t('thankYou.seoTitle')}
        description={t('thankYou.seoDescription')}
        path="/gracias"
        noIndex
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <section className="w-full max-w-xl text-center space-y-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden="true" />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">{t(`thankYou.${type}.title`)}</h1>
            <p className="text-muted-foreground leading-relaxed">{t(`thankYou.${type}.description`)}</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">
                {t('thankYou.goToDashboard')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {type === 'signup' && (
              <Button asChild variant="outline">
                <Link to="/ai-studio">{t('thankYou.exploreAiStudio')}</Link>
              </Button>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
