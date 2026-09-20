import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The GTM container only fires its GA4 page_view on the initial document load.
 * This SPA changes routes client-side, so every navigation after the first one
 * was invisible to GA4. Pushing an explicit event lets GTM fire a page_view per
 * route (trigger: custom event "spa_page_view"), and we also send it directly to
 * GA4 so sessions are counted even before the GTM tag is configured.
 */
const GOOGLE_ADS_ID = "AW-18310773693";

const PageViewTracker = () => {
  const { pathname, search } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const page = `${pathname}${search}`;
    if (lastPath.current === page) return;
    const isFirst = lastPath.current === null;
    lastPath.current = page;

    const payload = {
      page_path: page,
      page_location: window.location.href,
      page_title: document.title,
    };

    // Google Ads remarketing: the AW config tag only reports the URL of the
    // first document load, so client-side navigations never reached Ads and
    // its URL-based audience lists stayed empty. Fire an explicit Ads-only
    // page_view on every route, including the first one (harmless duplicate
    // for Ads remarketing, which de-duplicates by user + URL).
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { ...payload, send_to: GOOGLE_ADS_ID });
    }

    if (isFirst) return; // initial GA4 page_view already sent by the container

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "spa_page_view",
      ...payload,
    });

    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { ...payload, send_to: "G-6GMWJ1ZPLN" });
    }
  }, [pathname, search]);

  return null;
};

export default PageViewTracker;
