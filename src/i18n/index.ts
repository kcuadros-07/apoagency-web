import es from './es';
import en from './en';
import { SITE } from '../config';

export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];
export const dict = { es, en };
export const htmlLang: Record<Lang, string> = { es: 'es-EC', en: 'en-US' };
export const ogLocale: Record<Lang, string> = { es: 'es_EC', en: 'en_US' };

// Páginas y su ruta en cada idioma (el español no lleva prefijo; el inglés vive en /en/).
export type Pagina = 'home' | 'terminos' | 'privacidad' | 'cookies';
const rutas: Record<Pagina, Record<Lang, string>> = {
  home: { es: '', en: '' },
  terminos: { es: 'terminos', en: 'terms' },
  privacidad: { es: 'privacidad', en: 'privacy' },
  cookies: { es: 'cookies', en: 'cookies' },
};

export const t = (l: Lang) => dict[l];
export const ruta = (l: Lang, p: Pagina = 'home') => (l === 'es' ? '/' : '/en/') + (rutas[p][l] ? rutas[p][l] + '/' : '');
export const urlAbsoluta = (l: Lang, p: Pagina = 'home') => SITE.url + ruta(l, p);
export const otroIdioma = (l: Lang): Lang => (l === 'es' ? 'en' : 'es');
export const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`));
