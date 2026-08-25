import RemoteHtml from "@/components/RemoteHtml";
import { SEO } from "@/components/SEO";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

// Se sirve a través del proxy `music-dist` porque Storage devuelve todos los
// objetos como text/plain con nosniff y CSP restrictiva (rompe CSS, imágenes
// y subdirectorios). El proxy aplica el Content-Type correcto.
const REMOTE_URL =
  "https://kmwehyixenybegwhqljx.supabase.co/functions/v1/music-dist/";
const APP_BASE_PATH = "/music-dist";

const MusicDistPage = () => {
  const location = useLocation();
  const remoteUrl = useMemo(() => {
    const localPath = location.pathname.slice(APP_BASE_PATH.length).replace(/^\/+/, "");
    let remotePath = localPath || "index.html";

    if (!/\.[a-z0-9]+$/i.test(remotePath)) {
      remotePath = `${remotePath.replace(/\/+$/, "")}/index.html`;
    }

    return new URL(remotePath, REMOTE_URL).href;
  }, [location.pathname]);

  return (
    <>
      <SEO
        title="Music Distribution"
        description="Distribute your music worldwide and keep your streaming royalties commission-free with Musicdibs."
        path={location.pathname}
        lang="en"
      />
      <main>
        <RemoteHtml appBasePath={APP_BASE_PATH} url={remoteUrl} title="MusicDibs — Guía de usuario" />
      </main>
    </>
  );
};

export default MusicDistPage;
