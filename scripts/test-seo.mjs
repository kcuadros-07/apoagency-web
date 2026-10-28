// Auditoría SEO automática del HTML compilado en dist/. Uso: node scripts/test-seo.mjs [dist]
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PAGINAS, rutaDe, SITIO, SERVICIOS, CASOS } from '../src/data/rutas.mjs';
import es from '../src/i18n/es.ts';
import en from '../src/i18n/en.ts';
const dict = { es, en };
import { texto } from '../src/data/textos.ts';
import { precios } from '../src/data/metricas.ts';

const DIST = process.argv[2] || 'dist';
const fallos = [], avisos = []; let n = 0;
const ok = (c, m) => { n++; if (!c) fallos.push(m); };
const aviso = (c, m) => { if (!c) avisos.push(m); };
const leer = (ruta) => { const f = join(DIST, ruta, 'index.html'); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
const limpio = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#39;|&amp;|&quot;/g, ' ').replace(/\s+/g, ' ').trim();
const palabras = (t) => t.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const meta = (html, re) => html.match(re)?.[1];
const metaName = (html, name) => meta(html, new RegExp(`<meta name="${name}" content="([^"]*)"`));
const metaProp = (html, p) => meta(html, new RegExp(`<meta property="${p}" content="([^"]*)"`));
const des = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');

const paginas = [];
for (const p of PAGINAS) for (const l of ['es', 'en']) {
  const ruta = rutaDe(l, p), html = leer(ruta);
  ok(html, `${ruta}: no existe en ${DIST}/`);
  if (html) paginas.push({ p, l, ruta, html });
}
const titulos = new Map(), descs = new Map();

for (const { p, l, ruta, html } of paginas) {
  const T = des(meta(html, /<title>([^<]*)<\/title>/) || ''), D = des(metaName(html, 'description') || '');
  ok(T.length >= 15 && T.length <= 60, `${ruta}: title de ${T.length} caracteres (máx. 60): "${T}"`);
  ok(D.length >= 70 && D.length <= 155, `${ruta}: description de ${D.length} caracteres (70–155)`);
  ok(!titulos.has(T), `${ruta}: title duplicado con ${titulos.get(T)}`); titulos.set(T, ruta);
  ok(!descs.has(D), `${ruta}: description duplicada con ${descs.get(D)}`); descs.set(D, ruta);
  ok((html.match(/<h1[\s>]/g) || []).length === 1, `${ruta}: debe tener exactamente un h1`);
  ok(html.includes(`<link rel="canonical" href="${SITIO}${ruta}"`), `${ruta}: canonical incorrecto`);
  ok(html.includes(`<html lang="${l === 'es' ? 'es-EC' : 'en-US'}"`), `${ruta}: lang incorrecto`);
  ok(metaProp(html, 'og:title') === meta(html, /<title>([^<]*)<\/title>/), `${ruta}: og:title ≠ title`);
  // hreflang recíproco
  const alt = { es: SITIO + rutaDe('es', p), en: SITIO + rutaDe('en', p) };
  ok(html.includes(`hreflang="es-EC" href="${alt.es}"`) && html.includes(`hreflang="en-US" href="${alt.en}"`) && html.includes(`hreflang="x-default" href="${alt.es}"`), `${ruta}: hreflang no apunta al par correcto`);
  const otro = paginas.find((x) => x.p === p && x.l !== l);
  ok(otro && otro.html.includes(`hreflang="${l === 'es' ? 'es-EC' : 'en-US'}" href="${SITIO}${ruta}"`), `${ruta}: el par ${otro?.ruta} no enlaza de vuelta (hreflang no recíproco)`);
  // og:image propia y de 1200×630
  const og = metaProp(html, 'og:image') || '';
  const f = join(DIST, og.replace(SITIO, ''));
  ok(og.startsWith(SITIO + '/') && existsSync(f), `${ruta}: og:image no existe (${og})`);
  if (existsSync(f)) { const b = readFileSync(f); ok(b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630, `${ruta}: og:image no mide 1200×630`); }
  if (p.startsWith('servicio:') || p.startsWith('caso:')) ok(/\/og\/(servicio|caso)-/.test(og), `${ruta}: debería tener og:image propia`);
  // traducción real
  if (l === 'en') { const es = paginas.find((x) => x.p === p && x.l === 'es'); ok(es && meta(es.html, /<title>([^<]*)<\/title>/) !== meta(html, /<title>([^<]*)<\/title>/), `${ruta}: el title en inglés es igual al español`);
    const h = (x) => limpio(x.match(/<h1[\s\S]*?<\/h1>/)?.[0] || ''); ok(es && h(es.html) !== h(html), `${ruta}: el h1 en inglés es igual al español`); }

  // ---- JSON-LD ----
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  ok(bloques.length === 1, `${ruta}: debe haber un solo bloque JSON-LD (hay ${bloques.length})`);
  let g; try { g = JSON.parse(bloques[0][1])['@graph']; } catch (e) { fallos.push(`${ruta}: JSON-LD inválido (${e.message})`); continue; }
  const tipo = (t) => g.filter((x) => [].concat(x['@type']).includes(t));
  const ids = new Set(g.map((x) => x['@id']).filter(Boolean));
  const refs = JSON.stringify(g).match(/"@id":"[^"]+"/g).map((s) => s.slice(7, -1));
  for (const r of refs) ok(ids.has(r) || r.includes('#servicio') || r.includes('#caso'), `${ruta}: @id sin resolver ${r}`);
  const [org] = tipo('Organization'), [neg] = tipo('ProfessionalService'), [web] = tipo('WebSite'), [per] = tipo('Person');
  ok(org?.name && org.url && org.logo?.url && org.sameAs?.length >= 1 && org.contactPoint?.some((c) => c.telephone && c.availableLanguage) && org.contactPoint?.some((c) => c.email), `${ruta}: Organization incompleta (name, url, logo, sameAs, contactPoint con WhatsApp y email)`);
  ok(neg?.address?.addressLocality === 'Guayaquil' && neg.address.addressRegion === 'Guayas' && neg.address.addressCountry === 'EC', `${ruta}: dirección de ProfessionalService incorrecta`);
  ok(neg?.geo?.latitude < 0 && neg.geo.longitude < -78 && neg.priceRange === '$$' && neg.openingHoursSpecification?.[0]?.opens === '09:00' && neg.openingHoursSpecification[0].closes === '18:00' && neg.openingHoursSpecification[0].dayOfWeek.length === 5, `${ruta}: faltan geo, priceRange u horario`);
  ok(neg?.areaServed?.name === 'Ecuador' && neg.telephone && neg.image && neg.name, `${ruta}: ProfessionalService sin areaServed/telephone/image`);
  ok(web?.inLanguage?.includes('es-EC') && web.inLanguage.includes('en-US'), `${ruta}: WebSite sin inLanguage es/en`);
  ok(per?.name === 'Kevin Cuadros' && per.sameAs?.some((u) => u.includes('linkedin')) && per.worksFor, `${ruta}: Person incompleta`);
  const lista = tipo('BreadcrumbList')[0];
  if (p !== 'home' && !['terminos', 'privacidad', 'cookies'].includes(p)) {
    ok(lista?.itemListElement?.length === 3 && lista.itemListElement.every((it, i) => it.position === i + 1 && it.name && /^https:\/\/apoagency\.io\//.test(it.item)), `${ruta}: BreadcrumbList inválida`);
    ok(limpio(html).includes(lista?.itemListElement?.[0]?.name) && html.includes('class="migas"'), `${ruta}: falta el breadcrumb visible`);
  }
  if (p === 'home') {
    const faq = tipo('FAQPage')[0];
    ok(faq?.mainEntity?.length === dict[l].faq.items.length && faq.mainEntity.every((q) => q['@type'] === 'Question' && q.name && q.acceptedAnswer?.text), `${ruta}: FAQPage incompleta`);
    ok(faq && faq.mainEntity.every((q, i) => q.name === texto(dict[l].faq.items[i].q)), `${ruta}: la FAQPage no coincide con el acordeón`);
    // texto indexable de la home
    const w = palabras(limpio(html.match(/<main[\s\S]*<\/main>/)[0]));
    ok(w >= 850, `${ruta}: solo ${w} palabras indexables en la home (≥ 850)`);
    // enlaces internos
    for (const s of Object.keys(SERVICIOS)) ok(html.includes(`href="${rutaDe(l, 'servicio:' + s)}"`), `${ruta}: sin enlace a ${rutaDe(l, 'servicio:' + s)}`);
    for (const c of CASOS) ok(html.includes(`href="${rutaDe(l, 'caso:' + c)}"`), `${ruta}: sin enlace a ${rutaDe(l, 'caso:' + c)}`);
    ok(!/<h2[^>]*id="cookie-panel-t"/.test(html), `${ruta}: el modal de cookies no debe usar h2`);
    const h3 = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => limpio(m[1]));
    const dup = h3.filter((t, i) => h3.indexOf(t) !== i);
    ok(dup.length === 0, `${ruta}: h3 repetidos (${[...new Set(dup)]}); el Finder no debe repetir los de Casos`);
  }
  if (p.startsWith('servicio:')) {
    const id = p.split(':')[1];
    const art = html.match(/<article[\s\S]*<\/article>/)[0];
    const w = palabras(limpio(art));
    ok(w >= 800 && w <= 1200, `${ruta}: ${w} palabras en el contenido (800–1200)`);
    const svc = tipo('Service')[0];
    ok(svc?.provider?.['@id'] && svc.areaServed?.name === 'Ecuador' && svc.offers?.length === Object.keys(precios[id]).length && svc.offers.every((o) => o.priceCurrency === 'USD' && o.priceSpecification?.minPrice > 0 && o.name), `${ruta}: Service sin offers con priceSpecification`);
    const faq = tipo('FAQPage')[0];
    ok(faq?.mainEntity?.length >= 5 && faq.mainEntity.length <= 6 && faq.mainEntity.every((q) => q.acceptedAnswer?.text), `${ruta}: FAQPage con ${faq?.mainEntity?.length} preguntas (5–6)`);
    ok((art.match(/<details/g) || []).length === faq?.mainEntity?.length, `${ruta}: el FAQ visible no coincide con el FAQPage`);
    ok(/\$\d+/.test(limpio(art)) && !/\{\w+\}/.test(limpio(art)), `${ruta}: precios sin reemplazar o con {marcadores} visibles`);
    ok(art.includes('wa.me/593987252978') && art.includes('#cotizar'), `${ruta}: faltan los CTA a WhatsApp y al formulario`);
    for (const x of Object.keys(SERVICIOS).filter((s) => s !== id)) ok(art.includes(`href="${rutaDe(l, 'servicio:' + x)}"`), `${ruta}: sin enlace a otro servicio ${x}`);
    const rel = dict[l]; ok(limpio(art).includes(dict[l].form.servicios[id]), `${ruta}: no menciona su servicio`);
  }
  if (p.startsWith('caso:')) {
    const art = html.match(/<article[\s\S]*<\/article>/)[0];
    ok(tipo('CreativeWork').length === 1 && tipo('CreativeWork')[0].dateModified && tipo('CreativeWork')[0].publisher && tipo('CreativeWork')[0].image?.startsWith(SITIO + '/og/'), `${ruta}: CreativeWork incompleta`);
    ok(/href="\/(en\/)?(diseno-web|web-design|meta-google-ads)\//.test(art), `${ruta}: no enlaza a su servicio`);
    ok(art.includes('wa.me/593987252978') && art.includes('#cotizar'), `${ruta}: faltan los CTA`);
    ok(/\d/.test(limpio(art.match(/<h1[\s\S]*?<\/h1>/)?.[0] || '')), `${ruta}: el h1 del caso no muestra la métrica`);
  }
  // imágenes de contenido: alt, width/height, formato y nombre descriptivo
  const principal = (html.match(/<main[\s\S]*<\/main>/)?.[0] || '').replace(/<span class="finder-mini">[\s\S]*?<\/span>/g, ''); // miniaturas decorativas del Finder
  for (const img of principal.matchAll(/<img\b[^>]*>/g)) {
    const t = img[0], alt = /\salt(=|\s|>)/.test(t) ? (meta(t, /alt="([^"]*)"/) ?? '') : undefined;
    ok(alt !== undefined, `${ruta}: <img> sin alt: ${t.slice(0, 80)}`);
    ok(/ width="\d+"/.test(t) && / height="\d+"/.test(t), `${ruta}: <img> sin width/height`);
    const src = meta(t, /src="([^"]*)"/) || '';
    ok(/\.(webp|svg|avif)(\?|$)/.test(src) || src.startsWith('data:'), `${ruta}: imagen no es WebP/AVIF/SVG: ${src}`);
    if (/caso-|manual-de-marca|kevin-cuadros/.test(src)) ok((alt || '').length >= 25, `${ruta}: la imagen ${src.split('/').pop().slice(0, 40)} necesita un alt descriptivo`);
    aviso(!/\/[a-z]*\.[A-Za-z0-9_-]{6,}/.test(src) || /-/.test(src.split('/').pop()), `${ruta}: nombre de imagen poco descriptivo: ${src}`);
  }
}

// ---- 404 y robots ----
{ const h = readFileSync(join(DIST, '404.html'), 'utf8'); ok(/<meta name="robots" content="noindex">/.test(h), '404: falta noindex'); }

// ---- Sitemap ----
const idx = readFileSync(join(DIST, 'sitemap-index.xml'), 'utf8'); ok(idx.includes(`${SITIO}/sitemap-0.xml`), 'sitemap-index.xml no apunta a sitemap-0.xml');
const sm = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
const urls = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
const locs = urls.map((u) => meta(u, /<loc>([^<]+)<\/loc>/));
for (const { p, l } of paginas) ok(locs.includes(SITIO + rutaDe(l, p)), `sitemap: falta ${SITIO + rutaDe(l, p)}`);
ok(locs.length === paginas.length, `sitemap: ${locs.length} URLs y se esperaban ${paginas.length}`);
ok(!locs.some((u) => /404|\.html|lab\//.test(u)), 'sitemap: incluye la 404 o páginas de redirección');
for (const u of urls) {
  const loc = meta(u, /<loc>([^<]+)<\/loc>/), lm = meta(u, /<lastmod>([^<]+)<\/lastmod>/);
  ok(lm && !isNaN(Date.parse(lm)) && Date.now() - Date.parse(lm) < 86400000 * 2, `sitemap: lastmod inválido o viejo en ${loc}`);
  ok(/hreflang="es-EC"/.test(u) && /hreflang="en-US"/.test(u), `sitemap: ${loc} sin xhtml:link alternates es/en`);
}

// ---- llms.txt ----
{ const L = readFileSync(join(DIST, 'llms.txt'), 'utf8');
  for (const s of Object.keys(SERVICIOS)) ok(L.includes(SITIO + rutaDe('es', 'servicio:' + s)) && L.includes(SITIO + rutaDe('en', 'servicio:' + s)), `llms.txt: falta el servicio ${s}`);
  for (const c of CASOS) ok(L.includes(SITIO + rutaDe('es', 'caso:' + c)), `llms.txt: falta el caso ${c}`);
  ok(/\$250/.test(L) && L.includes('hola@apoagency.io') && L.includes('wa.me/593987252978') && L.includes('Guayaquil'), 'llms.txt: faltan precios, contacto o ciudad'); }

console.log(`${n} comprobaciones SEO en ${paginas.length} páginas.`);
if (avisos.length) console.log('Avisos:\n- ' + [...new Set(avisos)].join('\n- '));
if (fallos.length) { console.error(`\nFALLOS (${fallos.length}):\n- ` + [...new Set(fallos)].join('\n- ')); process.exit(1); }
console.log('OK: SEO técnico, JSON-LD, hreflang, sitemap, imágenes y enlaces internos.');
