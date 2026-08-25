import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface RemoteHtmlProps {
  /** URL absoluta del documento remoto (por ejemplo, un index.html en Storage). */
  url: string;
  className?: string;
  title?: string;
}

/**
 * Renderiza un sitio HTML remoto (alojado en nuestro propio Storage público).
 *
 * Se usa un iframe en lugar de `dangerouslySetInnerHTML` porque el HTML remoto
 * referencia sus assets y subpáginas con rutas relativas (`assets/style.css`,
 * `guia/.../index.html`). Al inyectarlo en el DOM de la app, esas rutas se
 * resolvían contra `musicdibs.com/music-dist` y devolvían 404 (sin CSS ni
 * navegación). Con el iframe, el documento conserva su propia base y todo
 * (CSS, imágenes y subdirectorios) se resuelve correctamente.
 */
const RemoteHtml = ({ url, className, title = "Contenido" }: RemoteHtmlProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificamos primero que el documento existe para poder mostrar un error claro.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoaded(false);

    fetch(url, { method: "GET", cache: "no-cache" })
      .then((res) => {
        if (!cancelled && !res.ok) setError(`HTTP ${res.status}`);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error de carga");
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No se ha podido cargar el contenido ({error}).
        </p>
      </div>
    );
  }

  return (
    <div className={className ?? "relative w-full"}>
      {!loaded && (
        <div className="absolute inset-0 flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        title={title}
        onLoad={() => setLoaded(true)}
        className="h-[100dvh] w-full border-0"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};

export default RemoteHtml;
