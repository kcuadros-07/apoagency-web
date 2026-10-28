// Tabla única de rutas por idioma (la usan i18n, el sitemap y los tests). El español no lleva prefijo; el inglés vive en /en/.
export const SITIO = 'https://apoagency.io';

export const LEGAL = {
  terminos: { es: 'terminos', en: 'terms' },
  privacidad: { es: 'privacidad', en: 'privacy' },
  cookies: { es: 'cookies', en: 'cookies' },
};
export const SERVICIOS = {
  web: { es: 'diseno-web', en: 'web-design' },
  ads: { es: 'meta-google-ads', en: 'meta-google-ads' },
  branding: { es: 'branding', en: 'branding' },
  contenido: { es: 'contenido-redes', en: 'social-content' },
};
export const CASOS_BASE = { es: 'casos', en: 'cases' };
export const CASOS = ['buscacasa', 'interhome', 'flexman', 'tecglo', 'xtrim', 'data-privacy-sunset'];

const pre = (l) => (l === 'es' ? '/' : '/en/');
// pagina: 'home' | 'terminos' | 'privacidad' | 'cookies' | 'servicio:<id>' | 'caso:<id>'
export const rutaDe = (l, pagina = 'home') => {
  if (pagina === 'home') return pre(l);
  if (LEGAL[pagina]) return `${pre(l)}${LEGAL[pagina][l]}/`;
  const [tipo, id] = pagina.split(':');
  if (tipo === 'servicio') return `${pre(l)}${SERVICIOS[id][l]}/`;
  if (tipo === 'caso') return `${pre(l)}${CASOS_BASE[l]}/${id}/`;
  throw new Error(`Página desconocida: ${pagina}`);
};
// Todas las páginas indexables: [clave de página]
export const PAGINAS = ['home', ...Object.keys(LEGAL), ...Object.keys(SERVICIOS).map((s) => `servicio:${s}`), ...CASOS.map((c) => `caso:${c}`)];
// Dado un path, devuelve { lang, pagina } o null
export const paginaDePath = (path) => {
  for (const p of PAGINAS) for (const l of ['es', 'en']) if (rutaDe(l, p) === path) return { lang: l, pagina: p };
  return null;
};
