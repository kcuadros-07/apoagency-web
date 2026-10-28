import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import redireccionesAntiguas from './scripts/redirecciones.mjs';
import { SITIO, paginaDePath, rutaDe } from './src/data/rutas.mjs';

// Dominio propio en GitHub Pages: sin `base`.
export default defineConfig({
  site: 'https://apoagency.io',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    react(),
    sitemap({
      // La 404 no se lista (las redirecciones no son páginas de Astro, así que tampoco entran).
      filter: (page) => !/\/404\/?$/.test(page),
      lastmod: new Date(), // fecha real del build: es cuando se generaron las páginas
      // hreflang recíproco incluso con slugs distintos por idioma (diseno-web ↔ web-design, casos ↔ cases…)
      serialize(item) {
        const info = paginaDePath(new URL(item.url).pathname);
        if (info) {
          item.links = [
            { url: SITIO + rutaDe('es', info.pagina), lang: 'es-EC' },
            { url: SITIO + rutaDe('en', info.pagina), lang: 'en-US' },
          ];
        }
        return item;
      },
    }),
    redireccionesAntiguas(), // URLs del sitio anterior → sitio nuevo
  ],
  vite: { plugins: [tailwindcss()] },
});
