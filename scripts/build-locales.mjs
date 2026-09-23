// Genera un JSON de traducciones por idioma (es, en, pt-BR) a partir de los
// módulos TS (base + extendidas), para que cada visita descargue sólo su
// idioma en lugar de los tres. Se ejecuta en el prebuild.
//
// Salida: src/locales/generated/{es,en,pt-BR}.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'src/locales/generated');

const LANGS = ['es', 'en', 'pt-BR'];

const { baseResources } = await import(resolve(root, 'src/locales/base.ts'));
const { applyExtendedTranslations } = await import(resolve(root, 'src/i18n-extended.ts'));

mkdirSync(outDir, { recursive: true });

for (const lang of LANGS) {
  const store = {
    [lang]: JSON.parse(JSON.stringify(baseResources[lang]?.translation ?? {})),
  };

  // Instancia mínima compatible con la API que usa applyExtendedTranslations.
  const fakeI18n = {
    getResourceBundle: (lng) => store[lng],
    addResourceBundle: (lng, _ns, data) => {
      store[lng] = data;
    },
  };

  applyExtendedTranslations(fakeI18n, [lang]);

  const json = JSON.stringify(store[lang]);
  writeFileSync(resolve(outDir, `${lang}.json`), json);
  console.log(`[build-locales] ${lang}.json — ${(json.length / 1024).toFixed(0)} KB`);
}
