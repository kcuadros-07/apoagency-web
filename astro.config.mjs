import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
    sitemap({ i18n: { defaultLocale: 'es', locales: { es: 'es-EC', en: 'en-US' } } }),
  ],
  vite: { plugins: [tailwindcss()] },
});
