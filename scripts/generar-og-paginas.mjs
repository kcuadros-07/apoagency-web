// Imágenes Open Graph (1200×630) con la marca de APO para cada página de servicio y de caso, en ES y EN.
// Se generan en cada build (sin navegador: satori + resvg) y quedan en public/og/. No se versionan.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { precios, m } from '../src/data/metricas.ts';

const OUT = 'public/og';
mkdirSync(OUT, { recursive: true });
const fuente = (peso) => readFileSync(`node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${peso}-normal.woff`);
const fonts = [{ name: 'Jakarta', data: fuente(800), weight: 800 }, { name: 'Jakarta', data: fuente(500), weight: 500 }];
const logo = 'data:image/png;base64,' + readFileSync('brand/logos/apo-lobo-oscuro.png').toString('base64');

const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });
const tarjeta = ({ etiqueta, titulo, sub, dato }) =>
  h('div', { width: 1200, height: 630, boxSizing: 'border-box', overflow: 'hidden', background: '#0B0B0F', color: '#fff', fontFamily: 'Jakarta', flexDirection: 'column', justifyContent: 'space-between', padding: 72 }, [
    h('div', { alignItems: 'center', justifyContent: 'space-between', width: '100%' }, [
      { type: 'img', props: { src: logo, width: 194, height: 84, style: { width: 194, height: 84 } } },
      h('div', { background: '#fff', color: '#0B0B0F', fontSize: 26, fontWeight: 800, padding: '10px 18px', transform: 'rotate(-2deg)' }, etiqueta),
    ]),
    h('div', { flexDirection: 'column' }, [
      h('div', { fontSize: titulo.length > 38 ? 68 : 80, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3, maxWidth: 1000 }, titulo),
      h('div', { fontSize: 32, fontWeight: 500, color: '#A1A1AD', marginTop: 24 }, sub),
    ]),
    h('div', { alignItems: 'center', justifyContent: 'space-between', width: '100%' }, [
      h('div', { fontSize: 28, fontWeight: 500, color: '#A1A1AD' }, 'apoagency.io'),
      dato ? h('div', { fontSize: 44, fontWeight: 800, color: '#A5B4FC' }, dato) : h('div', {}, ''),
    ]),
  ]);

const dibujar = async (archivo, datos) => {
  const svg = await satori(tarjeta(datos), { width: 1200, height: 630, fonts });
  writeFileSync(`${OUT}/${archivo}`, new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
};

const usd = (n) => `$${n}`;
const desde = { web: precios.web.landing, ads: precios.ads.meta, branding: precios.branding.logo, contenido: precios.contenido.carruseles };
let n = 0;
for (const f of readdirSync('src/content/servicios')) {
  const d = JSON.parse(readFileSync(`src/content/servicios/${f}`, 'utf8'));
  const p = desde[d.id];
  const txt = d.lang === 'es' ? { desde: 'Desde', mes: '/mes', et: 'servicio' } : { desde: 'From', mes: '/month', et: 'service' };
  await dibujar(`servicio-${d.id}-${d.lang}.png`, { etiqueta: txt.et, titulo: d.h1, sub: 'APO Agency · Ecuador', dato: `${txt.desde} ${usd(p.desde)}${p.porMes ? txt.mes : ''}` });
  n++;
}
for (const f of readdirSync('src/content/casos')) {
  const c = JSON.parse(readFileSync(`src/content/casos/${f}`, 'utf8'));
  const id = f.replace('.json', '');
  for (const lang of ['es', 'en']) {
    await dibujar(`caso-${id}-${lang}.png`, { etiqueta: lang === 'es' ? 'caso de éxito' : 'case study', titulo: `${c.cliente}: ${m(c.metrica)} ${c.etiqueta[lang]}`, sub: `${c.sector[lang]} · ${c.servicio[lang]}`, dato: 'APO Agency' });
    n++;
  }
}
console.log(`${n} imágenes Open Graph generadas en ${OUT}/`);
