import RemoteHtml from "@/components/RemoteHtml";
import { SEO } from "@/components/SEO";

const REMOTE_URL =
  "https://kmwehyixenybegwhqljx.supabase.co/storage/v1/object/public/music-dist/index.html";

const MusicDistPage = () => (
  <>
    <SEO
      title="Music Distribution"
      description="Distribute your music worldwide and keep your streaming royalties commission-free with Musicdibs."
      path="/music-dist"
      lang="en"
    />
    <main>
      <RemoteHtml url={REMOTE_URL} />
    </main>
  </>
);

export default MusicDistPage;
