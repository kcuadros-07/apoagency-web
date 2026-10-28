// Redirecciones del sitio anterior + página 404. Uso:
//   node scripts/test-redirecciones.mjs            → contra dist/ (servidor local que emula el 404 de GitHub Pages)
//   node scripts/test-redirecciones.mjs https://apoagency.io   → contra producción
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { REDIRECCIONES, SITIO } from './redirecciones.mjs';

const vivo = process.argv[2];
let srv, BASE = vivo ? vivo.replace(/\/$/, '') : 'http://localhost:4393';
if (!vivo) {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };
  srv = createServer((q, r) => {
    let f = join('dist', decodeURIComponent(new URL(q.url, 'http://x').pathname));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { r.writeHead(404, { 'content-type': tipos['.html'] }); return r.end(readFileSync('dist/404.html')); } // como GitHub Pages
    r.writeHead(200, { 'content-type': tipos[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
  }).listen(4393);
}
const fallos = []; let n = 0;
const ok = (c, m) => { n++; if (!c) fallos.push(m); };
const get = async (p) => { const r = await fetch(BASE + p, { redirect: 'manual' }); return { status: r.status, html: await r.text(), tipo: r.headers.get('content-type') }; };

// ---- 1) HTML de cada redirección ----
for (const [vieja, nueva] of REDIRECCIONES) {
  const r = await get(vieja);
  ok(r.status === 200, `${vieja}: HTTP ${r.status}`);
  ok(new RegExp(`<meta http-equiv="refresh" content="0; url=${nueva.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}">`).test(r.html), `${vieja}: falta meta refresh 0 hacia ${nueva}`);
  ok(r.html.includes(`<link rel="canonical" href="${SITIO}${nueva.split('#')[0]}">`), `${vieja}: canonical incorrecto`);
  ok(/<meta name="robots" content="noindex">/.test(r.html), `${vieja}: falta noindex`);
}
// /index.html no se redirige: es la home y su canonical apunta a "/"
{ const r = await get('/index.html'); ok(r.status === 200 && r.html.includes(`<link rel="canonical" href="${SITIO}/"`), '/index.html: debe servir la home con canonical a /'); }

// ---- 2) Sitemap viejo y nuevo ----
{
  const v = await get('/sitemap.xml');
  ok(v.status === 200 && /xml/.test(v.tipo || '') && v.html.includes('<sitemapindex') && v.html.includes(`${SITIO}/sitemap-0.xml`), '/sitemap.xml: no es un índice válido hacia sitemap-0.xml');
  const s0 = await get('/sitemap-0.xml');
  const locs = [...s0.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok(s0.status === 200 && locs.length >= 8 && locs.every((u) => u.startsWith(SITIO + '/')), `sitemap-0.xml: ${locs.length} URLs, alguna fuera de ${SITIO}`);
  ok(!locs.some((u) => /404|\.html/.test(u)), 'sitemap-0.xml: lista páginas que no deben indexarse (404/.html)');
  const idx = await get('/sitemap-index.xml');
  ok(idx.status === 200 && idx.html.includes('sitemap-0.xml'), '/sitemap-index.xml: no existe o no apunta a sitemap-0.xml');
  const rb = await get('/robots.txt');
  ok(rb.html.includes(`Sitemap: ${SITIO}/sitemap-index.xml`), 'robots.txt: no apunta al sitemap nuevo');
}

// ---- 3) En el navegador: cada URL vieja llega a su destino y a su sección ----
const browser = await chromium.launch();
const nuevaPagina = async (vp = { width: 1440, height: 900 }) => {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
  return { ctx, page: await ctx.newPage() };
};
const todas = [...REDIRECCIONES, ['/lab/otra-cosa-que-no-existe.html', '/'], ['/lab/sub/carpeta/', '/']];
for (const [vieja, nueva] of todas) {
  const { ctx, page } = await nuevaPagina();
  await page.goto(BASE + vieja, { waitUntil: 'load' });
  await page.waitForURL((u) => u.pathname + u.hash === nueva, { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ ruta: location.pathname + location.hash, h1: document.querySelector('h1')?.textContent.trim() }));
  ok(r.ruta === nueva, `${vieja}: terminó en ${r.ruta} (esperaba ${nueva})`);
  const [, ancla] = nueva.split('#');
  if (ancla) {
    const top = await page.evaluate((id) => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top) : null; }, ancla);
    ok(top !== null && top >= -10 && top <= 220, `${vieja}: la sección #${ancla} no queda a la vista (top=${top})`);
  } else if (nueva === '/') ok(/Marketing que se mide en clientes/.test(r.h1 || ''), `${vieja}: no cargó la home (h1="${r.h1}")`);
  else ok(Boolean(r.h1), `${vieja}: la página de destino no tiene contenido`);
  await ctx.close();
}

// ---- 4) La 404 nueva ----
for (const [ruta, idioma, titulo, lang] of [['/esto-no-existe/', 'es', 'Esta página no existe.', 'es-EC'], ['/otra/ruta/inventada.html', 'es', 'Esta página no existe.', 'es-EC'], ['/en/this-does-not-exist/', 'en', "This page doesn't exist.", 'en-US']]) {
  const r = await get(ruta);
  ok(r.status === 404, `${ruta}: debería responder 404 y responde ${r.status}`);
  ok(/<meta name="robots" content="noindex">/.test(r.html) && !/rel="canonical"/.test(r.html), `${ruta}: la 404 debe llevar noindex y sin canonical`);
  const { ctx, page } = await nuevaPagina();
  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  const v = await page.evaluate(() => ({ lang: document.documentElement.lang, h1s: [...document.querySelectorAll('h1')].filter((h) => h.offsetParent !== null).map((h) => h.textContent.trim()), titulo: document.title,
    botones: [...document.querySelectorAll('main a')].filter((a) => a.offsetParent !== null).map((a) => ({ t: a.textContent.trim(), href: a.getAttribute('href') })), scrollH: document.documentElement.scrollWidth > innerWidth }));
  ok(v.lang === lang, `${ruta}: lang="${v.lang}" (esperaba ${lang})`);
  ok(v.h1s.length === 1 && v.h1s[0] === titulo, `${ruta}: h1 visible = ${JSON.stringify(v.h1s)}`);
  const esperado = idioma === 'es' ? [['Ir al inicio', '/'], ['Escríbenos por WhatsApp', 'https://wa.me/593987252978?']] : [['Go to the homepage', '/en/'], ['Message us on WhatsApp', 'https://wa.me/593987252978?']];
  for (const [txt, href] of esperado) ok(v.botones.some((b) => b.t.includes(txt) && b.href.startsWith(href)), `${ruta}: falta el botón "${txt}" → ${href}`);
  ok(!v.scrollH, `${ruta}: scroll horizontal`);
  if (ruta === '/esto-no-existe/') { // clic en "Ir al inicio" y captura a 390 px
    await page.getByRole('link', { name: /Ir al inicio/ }).click();
    await page.waitForURL((u) => u.pathname === '/', { timeout: 8000 }).catch(() => {});
    ok(new URL(page.url()).pathname === '/', `${ruta}: "Ir al inicio" no lleva a /`);
  }
  await ctx.close();
}
await browser.close(); srv?.close();
console.log(`${n} comprobaciones (${vivo ? 'PRODUCCIÓN ' + BASE : 'local'}).`);
if (fallos.length) { console.error('\nFALLOS:\n- ' + [...new Set(fallos)].join('\n- ')); process.exit(1); }
console.log('OK: todas las URLs viejas llegan a su destino y una URL inventada muestra la 404 nueva.');
