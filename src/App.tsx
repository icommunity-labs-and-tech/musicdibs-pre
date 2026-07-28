import { Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./hooks/useAuth";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { preloadFeatureCosts } from "./lib/featureCosts";

const ChatWidget = lazyWithRetry(() => import("./components/ChatWidget").then(m => ({ default: m.ChatWidget })));
const SocialProofPopup = lazyWithRetry(() => import("./components/SocialProofPopup").then(m => ({ default: m.SocialProofPopup })));
const Toaster = lazyWithRetry(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazyWithRetry(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

// Eagerly load the landing page for best FCP/LCP
import Index from "./pages/Index";

// Lazy-load everything else
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const SLA = lazyWithRetry(() => import("./pages/SLA"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Cookies = lazyWithRetry(() => import("./pages/Cookies"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const LegalValidity = lazyWithRetry(() => import("./pages/LegalValidity"));
const Partners = lazyWithRetry(() => import("./pages/Partners"));
const Verify = lazyWithRetry(() => import("./pages/Verify"));
const Distribution = lazyWithRetry(() => import("./pages/Distribution"));
const Marketing = lazyWithRetry(() => import("./pages/Marketing"));
const SongRegistrationPage = lazyWithRetry(() => import("./pages/SongRegistrationPage"));
const MusicCopyrightPage = lazyWithRetry(() => import("./pages/MusicCopyrightPage"));
const RegisterASongPage = lazyWithRetry(() => import("./pages/RegisterASongPage"));
const AISongGeneratorPage = lazyWithRetry(() => import("./pages/AISongGeneratorPage"));
const GeneradorCancionesIAPage = lazyWithRetry(() => import("./pages/GeneradorCancionesIAPage"));
const CopyrightASongPage = lazyWithRetry(() => import("./pages/CopyrightASongPage"));
const RegistroMusicalPage = lazyWithRetry(() => import("./pages/RegistroMusicalPage"));
const News = lazyWithRetry(() => import("./pages/News"));
const NewsArticle = lazyWithRetry(() => import("./pages/NewsArticle"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminBlog = lazyWithRetry(() => import("./pages/AdminBlog"));
const AdminABTests = lazyWithRetry(() => import("./pages/AdminABTests"));
const UserLogin = lazyWithRetry(() => import("./pages/UserLogin"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const PaymentSuccess = lazyWithRetry(() => import("./pages/PaymentSuccess"));
const DashboardLayout = lazyWithRetry(() => import("./pages/DashboardLayout"));
const DashboardHome = lazyWithRetry(() => import("./pages/DashboardHome"));
const RegisterPage = lazyWithRetry(() => import("./pages/RegisterPage"));
const RegisterPage = lazyWithRetry(() => import("./pages/RegisterPage"));
const VerifyPage = lazyWithRetry(() => import("./pages/VerifyPage"));
const PromotionPage = lazyWithRetry(() => import("./pages/PromotionPage"));
const CreditsPage = lazyWithRetry(() => import("./pages/CreditsPage"));
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"));
const BillingPage = lazyWithRetry(() => import("./pages/BillingPage"));
const YoutubeServicesPage = lazyWithRetry(() => import("./pages/YoutubeServicesPage"));
const SupportPage = lazyWithRetry(() => import("./pages/SupportPage"));
const CertificateDownloadPage = lazyWithRetry(() => import("./pages/CertificateDownloadPage"));

const IdentityVerificationPage = lazyWithRetry(() => import("./pages/IdentityVerificationPage"));
const LaunchPage = lazyWithRetry(() => import("./pages/LaunchPage"));
const IAMusicStudio = lazyWithRetry(() => import("./pages/IAMusicStudio"));
const PromocionMusical = lazyWithRetry(() => import("./pages/PromocionMusical"));

const AIStudio = lazyWithRetry(() => import("./pages/AIStudio"));
const AIStudioCreate = lazyWithRetry(() => import("./pages/AIStudioCreate"));
const AIStudioEdit = lazyWithRetry(() => import("./pages/AIStudioEdit"));
const AIStudioInspire = lazyWithRetry(() => import("./pages/AIStudioInspire"));
const AIEnhance = lazyWithRetry(() => import("./pages/AIEnhance"));
const AIStudioVideo = lazyWithRetry(() => import("./pages/AIStudioVideo"));
const AIStudioCovers = lazyWithRetry(() => import("./pages/AIStudioCovers"));
const AIStudioVocal = lazyWithRetry(() => import("./pages/AIStudioVocal"));
const PromoMaterial = lazyWithRetry(() => import("./pages/PromoMaterial"));
const AdminGuard = lazyWithRetry(() => import("./components/AdminGuard").then(m => ({ default: m.AdminGuard })));
const ManagerGuard = lazyWithRetry(() => import("./components/ManagerGuard").then(m => ({ default: m.ManagerGuard })));
const AdminUsersPage = lazyWithRetry(() => import("./pages/AdminUsersPage"));
const AdminCreditsPage = lazyWithRetry(() => import("./pages/AdminCreditsPage"));
const AdminWorksPage = lazyWithRetry(() => import("./pages/AdminWorksPage"));
const AdminMetricsPage = lazyWithRetry(() => import("./pages/AdminMetricsPage"));
const AdminSystemPage = lazyWithRetry(() => import("./pages/AdminSystemPage"));
const AdminPremiumPromosPage = lazyWithRetry(() => import("./pages/AdminPremiumPromosPage"));
const AdminYoutubeServicesPage = lazyWithRetry(() => import("./pages/AdminYoutubeServicesPage"));
const AdminFeatureCostsPage = lazyWithRetry(() => import("./pages/AdminFeatureCostsPage"));
const AdminApiCostsPage = lazyWithRetry(() => import("./pages/AdminApiCostsPage"));
const AdminAlertsPage = lazyWithRetry(() => import("./pages/AdminAlertsPage"));
const AdminProductMetrics = lazyWithRetry(() => import("./pages/AdminProductMetrics"));
const ManagerDashboard = lazyWithRetry(() => import("./pages/ManagerDashboard"));
const ManagerArtists = lazyWithRetry(() => import("./pages/ManagerArtists"));
const ManagerArtistNew = lazyWithRetry(() => import("./pages/ManagerArtistNew"));
const ManagerArtistDetail = lazyWithRetry(() => import("./pages/ManagerArtistDetail"));
const ManagerWorks = lazyWithRetry(() => import("./pages/ManagerWorks"));
const ManagerRegisterWork = lazyWithRetry(() => import("./pages/ManagerRegisterWork"));
const ManagerLanding = lazyWithRetry(() => import("./pages/ManagerLanding"));
const ArtistProfilesPage = lazyWithRetry(() => import("./pages/ArtistProfilesPage"));
const MediaLibraryPage = lazyWithRetry(() => import("./pages/MediaLibraryPage"));
const PressPage = lazyWithRetry(() => import("./pages/PressPage"));
const Features = lazyWithRetry(() => import("./pages/Features"));
const MusicdibsVsDistroKidPage = lazyWithRetry(() => import("./pages/MusicdibsVsDistroKidPage"));
const MusicdibsVsLoudlyPage = lazyWithRetry(() => import("./pages/MusicdibsVsLoudlyPage"));
const MusicdibsVsLandrPage = lazyWithRetry(() => import("./pages/MusicdibsVsLandrPage"));
const MusicdibsVsDiyStackPage = lazyWithRetry(() => import("./pages/MusicdibsVsDiyStackPage"));
const MusicdibsVsUdioPage = lazyWithRetry(() => import("./pages/MusicdibsVsUdioPage"));
const MusicMakerPage = lazyWithRetry(() => import("./pages/MusicMakerPage"));
const CreadorDeMusicaPage = lazyWithRetry(() => import("./pages/CreadorDeMusicaPage"));
const AllInOneMusicPlatformPage = lazyWithRetry(() => import("./pages/AllInOneMusicPlatformPage"));
const SwitchToMusicdibsPage = lazyWithRetry(() => import("./pages/SwitchToMusicdibsPage"));
const MetadataFinderPage = lazyWithRetry(() => import("./pages/MetadataFinderPage"));

const AdminCampaignMetricsPage = lazyWithRetry(() => import("./pages/AdminCampaignMetricsPage"));
const AdminChurnPage = lazyWithRetry(() => import("./pages/AdminChurnPage"));
const AdminAIModelsPage = lazyWithRetry(() => import("./pages/AdminAIModelsPage"));
const AdminCreditCouponsPage = lazyWithRetry(() => import("./pages/AdminCreditCouponsPage"));
const AdminSeoDashboardPage = lazyWithRetry(() => import("./pages/AdminSeoDashboardPage"));
const AdminManagersPage = lazyWithRetry(() => import("./pages/AdminManagersPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evita refetch al recuperar el foco (los dashboards ya se refrescan
      // por acciones explícitas o Realtime).
      refetchOnWindowFocus: false,
      // Considera los datos frescos durante 1 min para reducir hits repetidos
      // en navegación rápida entre rutas.
      staleTime: 60_000,
      // Reintenta una sola vez ante errores transitorios.
      retry: 1,
    },
  },
});

// Capture UTM attribution on first load
import { captureAttribution } from "@/lib/attribution";

const AppInit = () => {
  useEffect(() => {
    const runWhenIdle = (callback: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(callback, { timeout: 3000 });
        return;
      }

      globalThis.setTimeout(callback, 1500);
    };

    runWhenIdle(() => {
      captureAttribution();
      preloadFeatureCosts();
    });
  }, []);
  return null;
};

const DelayedStartupWidgets = () => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const runWhenIdle = (callback: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(callback, { timeout: 5000 });
        return;
      }

      globalThis.setTimeout(callback, 2500);
    };

    const timeoutId = window.setTimeout(() => {
      runWhenIdle(() => setShouldRender(true));
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!shouldRender) return null;

  return (
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
      <ChatWidget />
      <SocialProofPopup />
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <ThemeProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppInit />
          <DelayedStartupWidgets />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/sla" element={<SLA />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/legal-validity" element={<LegalValidity />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/verify" element={<Verify />} />
                            <Route path="/ia-music-studio" element={<IAMusicStudio />} />
              <Route path="/promocion-musical" element={<PromocionMusical />} />
              <Route path="/distribution" element={<Distribution />} />
              <Route path="/features" element={<Features />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/registro-obras-musicales" element={<SongRegistrationPage />} />
              <Route path="/derechos-autor-musica" element={<MusicCopyrightPage />} />
              <Route path="/register-a-song" element={<RegisterASongPage />} />
              <Route path="/copyright-a-song" element={<CopyrightASongPage />} />
              <Route path="/ai-song-generator" element={<AISongGeneratorPage />} />
              <Route path="/generador-canciones-ia" element={<GeneradorCancionesIAPage />} />
              <Route path="/registro-musical" element={<RegistroMusicalPage />} />
              <Route path="/musicdibs-vs-distrokid" element={<MusicdibsVsDistroKidPage />} />
              <Route path="/musicdibs-vs-loudly" element={<MusicdibsVsLoudlyPage />} />
              <Route path="/musicdibs-vs-landr" element={<MusicdibsVsLandrPage />} />
              <Route path="/musicdibs-vs-diy-stack" element={<MusicdibsVsDiyStackPage />} />
              <Route path="/musicdibs-vs-udio" element={<MusicdibsVsUdioPage />} />
              <Route path="/music-maker" element={<MusicMakerPage />} />
              <Route path="/creador-de-musica" element={<CreadorDeMusicaPage />} />
              <Route path="/all-in-one-music-platform" element={<AllInOneMusicPlatformPage />} />
              <Route path="/switch-to-musicdibs" element={<SwitchToMusicdibsPage />} />
              <Route path="/tools/metadata-finder" element={<MetadataFinderPage />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<NewsArticle />} />
              {/* Legacy /en/news/* URLs indexed by crawlers — serve the same
                  components instead of falling through to NotFound (3s wasted). */}
              <Route path="/en/news" element={<News />} />
              <Route path="/en/news/:slug" element={<NewsArticle />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/admin/ab-tests" element={<AdminABTests />} />
              <Route path="/manager" element={<ManagerLanding />} />
              <Route path="/login" element={<UserLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/payment-success" element={<PaymentSuccess />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="launch" element={<LaunchPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="verify" element={<VerifyPage />} />
                <Route path="promote" element={<PromotionPage />} />
                <Route path="premium-promotion" element={<PromotionPage />} />
                <Route path="promotion" element={<PromotionPage />} />
                <Route path="press" element={<PromotionPage />} />
                <Route path="credits" element={<CreditsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="youtube-services" element={<YoutubeServicesPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="certificate/:workId" element={<CertificateDownloadPage />} />
                
                <Route path="verify-identity" element={<IdentityVerificationPage />} />
                <Route path="artist-profiles" element={<ArtistProfilesPage />} />
                <Route path="media-library" element={<MediaLibraryPage />} />
                <Route path="press" element={<PressPage />} />
                <Route path="press" element={<PressPage />} />
                
                <Route path="admin/users" element={<Suspense fallback={null}><AdminGuard><AdminUsersPage /></AdminGuard></Suspense>} />
                <Route path="admin/credits" element={<Suspense fallback={null}><AdminGuard><AdminCreditsPage /></AdminGuard></Suspense>} />
                <Route path="admin/works" element={<Suspense fallback={null}><AdminGuard><AdminWorksPage /></AdminGuard></Suspense>} />
                <Route path="admin/metrics" element={<Suspense fallback={null}><AdminGuard><AdminMetricsPage /></AdminGuard></Suspense>} />
                <Route path="admin/campaigns" element={<Suspense fallback={null}><AdminGuard><AdminCampaignMetricsPage /></AdminGuard></Suspense>} />
                <Route path="admin/system" element={<Suspense fallback={null}><AdminGuard><AdminSystemPage /></AdminGuard></Suspense>} />
                <Route path="admin/premium-promos" element={<Suspense fallback={null}><AdminGuard><AdminPremiumPromosPage /></AdminGuard></Suspense>} />
                <Route path="admin/youtube-services" element={<Suspense fallback={null}><AdminGuard><AdminYoutubeServicesPage /></AdminGuard></Suspense>} />
                <Route path="admin/feature-costs" element={<Suspense fallback={null}><AdminGuard><AdminFeatureCostsPage /></AdminGuard></Suspense>} />
                <Route path="admin/api-costs" element={<Suspense fallback={null}><AdminGuard><AdminApiCostsPage /></AdminGuard></Suspense>} />
                <Route path="admin/product-metrics" element={<Suspense fallback={null}><AdminGuard><AdminProductMetrics /></AdminGuard></Suspense>} />
                <Route path="admin/churn" element={<Suspense fallback={null}><AdminGuard><AdminChurnPage /></AdminGuard></Suspense>} />
                <Route path="admin/alerts" element={<Suspense fallback={null}><AdminGuard><AdminAlertsPage /></AdminGuard></Suspense>} />
                <Route path="admin/ai-models" element={<Suspense fallback={null}><AdminGuard><AdminAIModelsPage /></AdminGuard></Suspense>} />
                <Route path="admin/credit-coupons" element={<Suspense fallback={null}><AdminGuard><AdminCreditCouponsPage /></AdminGuard></Suspense>} />
                <Route path="admin/seo-dashboard" element={<Suspense fallback={null}><AdminGuard><AdminSeoDashboardPage /></AdminGuard></Suspense>} />
                <Route path="admin/managers" element={<Suspense fallback={null}><AdminGuard><AdminManagersPage /></AdminGuard></Suspense>} />
                <Route path="manager" element={<Suspense fallback={null}><ManagerGuard><ManagerDashboard /></ManagerGuard></Suspense>} />
                <Route path="manager/artists" element={<Suspense fallback={null}><ManagerGuard><ManagerArtists /></ManagerGuard></Suspense>} />
                <Route path="manager/artists/new" element={<Suspense fallback={null}><ManagerGuard><ManagerArtistNew /></ManagerGuard></Suspense>} />
                <Route path="manager/artists/:artistId" element={<Suspense fallback={null}><ManagerGuard><ManagerArtistDetail /></ManagerGuard></Suspense>} />
                <Route path="manager/works" element={<Suspense fallback={null}><ManagerGuard><ManagerWorks /></ManagerGuard></Suspense>} />
                <Route path="manager/register" element={<Suspense fallback={null}><ManagerGuard><ManagerRegisterWork /></ManagerGuard></Suspense>} />
              </Route>
              <Route path="/ai-studio" element={<AIStudio />} />
              <Route path="/ai-studio/create" element={<AIStudioCreate />} />
              <Route path="/ai-studio/edit" element={<AIStudioEdit />} />
              <Route path="/ai-studio/inspire" element={<AIStudioInspire />} />
              <Route path="/ai-studio/enhance" element={<AIEnhance />} />
              <Route path="/ai-studio/video" element={<AIStudioVideo />} />
              <Route path="/ai-studio/covers" element={<AIStudioCovers />} />
              <Route path="/ai-studio/vocal" element={<AIStudioVocal />} />
              <Route path="/ai-studio/promo-material" element={<PromoMaterial />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
    </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
