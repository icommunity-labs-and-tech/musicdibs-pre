import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

const deferRenderBlockingCss = () => ({
  name: "defer-render-blocking-css",
  transformIndexHtml(html: string) {
    return html.replace(
      /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
      '<link rel="preload" crossorigin href="$1" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n  <noscript><link rel="stylesheet" crossorigin href="$1"></noscript>'
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    deferRenderBlockingCss(),
    mcpPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // FIX 2026-09-24 (Core Web Vitals: LCP/INP, hallazgo del analisis de
        // bundle): sin manualChunks, Vite agrupaba TODO en un unico chunk
        // principal de 622 KiB (189 KiB gzip) cargado en cada pagina,
        // incluyendo articulos de blog simples que no necesitan la mayoria
        // de ese codigo. Se separan las dependencias mas grandes y mas
        // estables (cambian poco entre despliegues) en sus propios chunks,
        // para que el navegador pueda cachearlas de forma independiente del
        // codigo de la app, que si cambia con cada release.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          return undefined; // deja que Rollup decida el resto automaticamente
        },
      },
    },
  },

}));
