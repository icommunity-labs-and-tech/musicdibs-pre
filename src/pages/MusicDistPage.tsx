import RemoteHtml from "@/components/RemoteHtml";
import SEO from "@/components/SEO";

const REMOTE_URL =
  "https://kmwehyixenybegwhqljx.supabase.co/storage/v1/object/public/music-dist/index.html";

const MusicDistPage = () => (
  <>
    <SEO
      title="Music Distribution | MusicDibs"
      description="Distribute your music worldwide and keep your streaming royalties commission-free with MusicDibs."
      canonicalPath="/music-dist"
    />
    <main>
      <RemoteHtml url={REMOTE_URL} />
    </main>
  </>
);

export default MusicDistPage;
