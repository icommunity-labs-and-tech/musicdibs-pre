import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RemoteHtmlProps {
  /** URL absoluta del documento remoto (por ejemplo, un index.html en Storage). */
  url: string;
  /** URL absoluta de la raíz del sitio remoto. */
  remoteBaseUrl?: string;
  /** Ruta base local donde se debe navegar al pulsar enlaces internos del HTML remoto. */
  appBasePath?: string;
  className?: string;
  title?: string;
  /** Selectores CSS del HTML remoto que se eliminan antes de renderizar. */
  stripSelectors?: string[];
}

interface ParsedRemoteHtml {
  bodyClassName: string;
  html: string;
  stylesheets: string[];
}

const SKIPPED_URL_PREFIXES = ["#", "mailto:", "tel:", "javascript:", "data:"];

const shouldSkipUrl = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  return SKIPPED_URL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
};

const toAbsoluteUrl = (value: string, baseUrl: URL) => {
  if (!value || shouldSkipUrl(value)) return value;
  return new URL(value, baseUrl).href;
};

const getRemotePath = (absoluteUrl: URL, remoteRoot: URL) => {
  if (absoluteUrl.origin !== remoteRoot.origin) return null;
  if (!absoluteUrl.pathname.startsWith(remoteRoot.pathname)) return null;

  return absoluteUrl.pathname.slice(remoteRoot.pathname.length).replace(/^\/+/, "");
};

const toInternalPath = (remotePath: string, appBasePath: string) => {
  const withoutIndex = remotePath.replace(/(?:^|\/)index\.html$/i, "").replace(/\/+$/, "");
  return withoutIndex ? `${appBasePath}/${withoutIndex}` : appBasePath;
};

const isHtmlNavigationPath = (path: string) => {
  if (!path || path.endsWith("/")) return true;
  return /(?:^|\/)index\.html$/i.test(path) || /\.html?$/i.test(path);
};

const stripExecutableContent = (root: ParentNode) => {
  root.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());
  root.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });
  });
};

const parseRemoteHtml = (
  rawHtml: string,
  documentUrl: string,
  remoteBaseUrl: string,
  appBasePath: string,
  stripSelectors: string[] = [],
): ParsedRemoteHtml => {
  const parser = new DOMParser();
  const document = parser.parseFromString(rawHtml, "text/html");
  const baseUrl = new URL(documentUrl);
  const remoteRoot = new URL(remoteBaseUrl);
  const stylesheets = new Set<string>();

  stripExecutableContent(document);

  stripSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  });

  document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href) stylesheets.add(toAbsoluteUrl(href, baseUrl));
    link.remove();
  });

  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || shouldSkipUrl(href)) return;

    const absoluteUrl = new URL(href, baseUrl);
    const remotePath = getRemotePath(absoluteUrl, remoteRoot);

    if (remotePath !== null && isHtmlNavigationPath(remotePath)) {
      anchor.setAttribute("href", toInternalPath(remotePath, appBasePath));
      return;
    }

    anchor.setAttribute("href", absoluteUrl.href);
  });

  document.querySelectorAll<HTMLElement>("[src], [poster]").forEach((element) => {
    ["src", "poster"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, toAbsoluteUrl(value, baseUrl));
    });
  });

  return {
    bodyClassName: document.body.className,
    html: document.body.innerHTML,
    stylesheets: Array.from(stylesheets),
  };
};

/**
 * Renderiza un sitio HTML remoto (alojado en nuestro propio Storage público)
 * dentro de la app para evitar bloqueos de iframe por cabeceras X-Frame-Options.
 */
const RemoteHtml = ({
  url,
  remoteBaseUrl,
  appBasePath = "/music-dist",
  className,
  title = "Contenido",
  stripSelectors,
}: RemoteHtmlProps) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<ParsedRemoteHtml | null>(null);
  const [error, setError] = useState<string | null>(null);
  const normalizedAppBasePath = useMemo(() => appBasePath.replace(/\/+$/, "") || "/", [appBasePath]);
  const stripKey = (stripSelectors ?? []).join(",");

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setContent(null);

    fetch(url, { method: "GET", cache: "no-cache", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        setContent(
          parseRemoteHtml(
            html,
            url,
            remoteBaseUrl ?? new URL("./", url).href,
            normalizedAppBasePath,
            stripKey ? stripKey.split(",") : [],
          ),
        );
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error de carga");
      });

    return () => {
      controller.abort();
    };
  }, [normalizedAppBasePath, remoteBaseUrl, stripKey, url]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) return;

    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (!destination.pathname.startsWith(normalizedAppBasePath)) return;

    event.preventDefault();
    navigate(`${destination.pathname}${destination.search}${destination.hash}`);
  };

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
      {content?.stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {!content && (
        <div className="absolute inset-0 flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div
        ref={containerRef}
        aria-label={title}
        className={content?.bodyClassName}
        onClick={handleClick}
        dangerouslySetInnerHTML={content ? { __html: content.html } : undefined}
      />
    </div>
  );
};

export default RemoteHtml;
