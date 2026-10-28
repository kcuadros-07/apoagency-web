// URLs del sitio anterior (apoagency.io viejo) → destino en el sitio nuevo.
// GitHub Pages no tiene redirecciones de servidor: se generan páginas HTML con meta refresh a 0,
// canonical a la URL nueva (sin #ancla) y noindex. Un archivo por URL vieja, con su nombre exacto.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const SITIO = 'https://apoagency.io';

// [URL vieja, destino]. Los destinos usan los ids reales de las secciones (src/components/Home.astro).
export const REDIRECCIONES = [
  ['/about.html', '/#quien'],
  ['/portfolio.html', '/#casos'],
  ['/partners.html', '/#hablemos'],
  ['/terminos.html', '/terminos/'],
  ['/servicios/diseno-web.html', '/#servicios'],
  ['/servicios/meta-google-ads.html', '/#servicios'],
  ['/servicios/software-personalizado.html', '/'], // ese servicio ya no es de APO
  ['/lab/index.html', '/'],
  ['/lab/chatbot.html', '/'],
];
// /index.html no se redirige: es el archivo físico de "/" (la home); su canonical ya apunta a "/".

export const paginaRedireccion = (destino) => {
  const canonical = SITIO + destino.split('#')[0];
  return `<!doctype html>
<html lang="es-EC">
<head>
<meta charset="utf-8">
<title>Redirigiendo… | APO Agency</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${canonical}">
<meta http-equiv="refresh" content="0; url=${destino}">
<script>location.replace(${JSON.stringify(destino)});</script>
</head>
<body>
<p>Esta página se movió. <a href="${destino}">Ir a la nueva página</a>.</p>
</body>
</html>
`;
};

// /sitemap.xml viejo: un XML no se puede redirigir con meta refresh, así que se sirve un índice válido
// que apunta al sitemap nuevo (el que genera @astrojs/sitemap).
export const sitemapViejo = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITIO}/sitemap-0.xml</loc></sitemap>
</sitemapindex>
`;

// Integración de Astro: escribe las páginas al terminar el build.
export default function redireccionesAntiguas() {
  return {
    name: 'redirecciones-antiguas',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const raiz = dir.pathname.replace(/\/$/, '');
        for (const [vieja, nueva] of REDIRECCIONES) {
          const f = join(raiz, vieja);
          mkdirSync(dirname(f), { recursive: true });
          writeFileSync(f, paginaRedireccion(nueva));
        }
        writeFileSync(join(raiz, 'sitemap.xml'), sitemapViejo);
        logger.info(`${REDIRECCIONES.length} redirecciones y sitemap.xml antiguo generados`);
      },
    },
  };
}
