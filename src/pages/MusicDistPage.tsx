import RemoteHtml from "@/components/RemoteHtml";
import { SEO } from "@/components/SEO";

// Se sirve a través del proxy `music-dist` porque Storage devuelve todos los
// objetos como text/plain con nosniff y CSP restrictiva (rompe CSS, imágenes
// y subdirectorios). El proxy aplica el Content-Type correcto.
const REMOTE_URL =
  "https://kmwehyixenybegwhqljx.supabase.co/functions/v1/music-dist/index.html";

const MusicDistPage = () => (
  <>
    <SEO
      title="Music Distribution"
      description="Distribute your music worldwide and keep your streaming royalties commission-free with Musicdibs."
      path="/music-dist"
      lang="en"
    />
    <main>
      <RemoteHtml url={REMOTE_URL} title="MusicDibs — Guía de usuario" />
    </main>
  </>
);

export default MusicDistPage;
