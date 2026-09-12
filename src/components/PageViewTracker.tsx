import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * The GTM container only fires its GA4 page_view on the initial document load.
 * This SPA changes routes client-side, so every navigation after the first one
 * was invisible to GA4. Pushing an explicit event lets GTM fire a page_view per
 * route (trigger: custom event "spa_page_view").
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

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "spa_page_view",
      page_path: page,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
};

export default PageViewTracker;
