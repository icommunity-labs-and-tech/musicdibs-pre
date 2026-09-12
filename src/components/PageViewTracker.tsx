import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (
      command: string,
      eventNameOrConfig: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

/**
 * The GTM container only fires its GA4 page_view on the initial document load.
 * This SPA changes routes client-side, so every navigation after the first one
 * was invisible to GA4. Pushing an explicit event lets GTM fire a page_view per
 * route (trigger: custom event "spa_page_view"), and we also send it directly to
 * GA4 so sessions are counted even before the GTM tag is configured.
 */
const PageViewTracker = () => {
  const { pathname, search } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const page = `${pathname}${search}`;
    if (lastPath.current === page) return;
    const isFirst = lastPath.current === null;
    lastPath.current = page;
    if (isFirst) return; // initial page_view already sent by the container

    const payload = {
      page_path: page,
      page_location: window.location.href,
      page_title: document.title,
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "spa_page_view",
      ...payload,
    });

    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", payload);
    }
  }, [pathname, search]);

  return null;
};

export default PageViewTracker;
