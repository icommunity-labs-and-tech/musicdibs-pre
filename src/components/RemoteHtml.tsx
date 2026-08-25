import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface RemoteHtmlProps {
  url: string;
  className?: string;
}

/**
 * Descarga un HTML remoto (alojado en nuestro propio Storage público)
 * y lo renderiza directamente en pantalla.
 */
const RemoteHtml = ({ url, className }: RemoteHtmlProps) => {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setError(null);

    fetch(url, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error de carga");
        }
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

  if (html === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default RemoteHtml;
