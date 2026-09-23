import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { i18nReady } from './i18n'

const mount = () => {
  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
};

// Esperamos a que estén los textos del idioma detectado (un solo idioma por
// visita) para no pintar claves crudas en el primer render.
i18nReady.then(mount).catch(mount);
