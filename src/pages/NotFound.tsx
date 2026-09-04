import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { resolveLegacyRedirect } from "@/lib/legacyRedirects";

const NotFound = () => {
  const location = useLocation();
  // Old WordPress/WooCommerce/Zendesk URLs still receive traffic and backlinks.
  const legacyTarget = resolveLegacyRedirect(location.pathname);

  useEffect(() => {
    if (legacyTarget) return;
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname, legacyTarget]);

  if (legacyTarget) {
    return <Navigate to={legacyTarget} replace />;
  }


  return (
    <>
      <SEO title="Página no encontrada" description="La página que buscas no existe en Musicdibs." noIndex />
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
          <a href="/" className="text-info hover:text-info underline">
            Return to Home
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
