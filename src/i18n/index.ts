import es from './es';
import en from './en';
import { SITE } from '../config';
import { rutaDe } from '../data/rutas.mjs';

export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];
export const dict = { es, en };
export const htmlLang: Record<Lang, string> = { es: 'es-EC', en: 'en-US' };
export const ogLocale: Record<Lang, string> = { es: 'es_EC', en: 'en_US' };

// Páginas y su ruta en cada idioma: la tabla vive en src/data/rutas.mjs (también la usa el sitemap).
export type ServicioId = 'web' | 'ads' | 'branding' | 'contenido';
export type Pagina = 'home' | 'terminos' | 'privacidad' | 'cookies' | `servicio:${ServicioId}` | `caso:${string}`;

export const t = (l: Lang) => dict[l];
export const ruta = (l: Lang, p: Pagina = 'home'): string => rutaDe(l, p);
export const urlAbsoluta = (l: Lang, p: Pagina = 'home') => SITE.url + ruta(l, p);
export const otroIdioma = (l: Lang): Lang => (l === 'es' ? 'en' : 'es');
export const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`));
