// Finder de proyectos: carpetas, íconos y panel de previsualización. Uso: node scripts/test-finder.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const es = (await import('../src/i18n/es.ts')).default;
const proy = readdirSync('src/content/proyectos').map((f) => JSON.parse(readFileSync(`src/content/proyectos/${f}`, 'utf8'))).sort((a, b) => a.orden - b.orden);
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const srv = createServer((q, r) => { let f = join('dist', decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html'); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(4394);
const fallos = []; let n = 0;
const ok = (c, m) => { n++; if (!c) fallos.push(m); };

const browser = await chromium.launch();
for (const [nombre, vp, movil] of [['escritorio', { width: 1440, height: 900 }, false], ['celular', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: movil, hasTouch: movil });
  await ctx.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
  const popups = [];
  await ctx.route((u) => u.origin !== 'http://localhost:4394', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fallos.push(`[${nombre}] error de JS: ${e.message}`));
  await page.goto('http://localhost:4394/', { waitUntil: 'networkidle' });
  await page.locator('.finder').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('#proyectos astro-island')?.hasAttribute('ssr'), null, { timeout: 10000 });
  const F = es.finder;
  const lado = page.locator('.finder-lado');
  const usadas = new Set(proy.map((p) => p.categoria));
  const carpetas = { todos: F.todos, ...Object.fromEntries(Object.entries(F.folders).filter(([k]) => usadas.has(k))) };
  for (const k of Object.keys(F.folders)) if (!usadas.has(k)) ok((await lado.getByRole('button', { name: new RegExp('^' + F.folders[k]) }).count()) === 0, `[${nombre}] la carpeta vacía ${k} no se oculta`);

  for (const [k, etiqueta] of Object.entries(carpetas)) {
    await lado.getByRole('button', { name: new RegExp(etiqueta) }).click();
    const esperados = k === 'todos' ? proy : proy.filter((p) => p.categoria === k);
    ok(await page.locator('.finder-item').count() === esperados.length, `[${nombre}] carpeta ${k}: esperaba ${esperados.length} proyectos`);
    ok(await lado.getByRole('button', { name: new RegExp(etiqueta) }).getAttribute('aria-pressed') === 'true', `[${nombre}] carpeta ${k}: no queda marcada`);
    ok(await page.locator('.finder-titulo-p').innerText() === esperados[0].nombre, `[${nombre}] carpeta ${k}: el panel no muestra el primer proyecto`);
  }

  await lado.getByRole('button', { name: new RegExp(F.todos) }).click();
  for (const p of proy) {
    await page.locator('.finder-item', { hasText: p.nombre }).first().click();
    const prev = page.locator('.finder-prev');
    ok(await prev.locator('.finder-titulo-p').innerText() === p.nombre, `[${nombre}] ${p.nombre}: el panel no cambia`);
    ok((await prev.innerText()).includes(p.cliente) && (!p.anio || (await prev.innerText()).includes(p.anio)) && (await prev.innerText()).includes(p.servicio.es), `[${nombre}] ${p.nombre}: faltan cliente, año o servicio`);
    ok(await prev.locator('.finder-prev-img > *').count() === 1, `[${nombre}] ${p.nombre}: sin imagen ni mockup`);
    const boton = prev.getByRole('link', { name: new RegExp(F.verSitio) });
    ok((await boton.getAttribute('href')) === p.url, `[${nombre}] ${p.nombre}: "Ver sitio" apunta a otro destino`);
    popups.length = 0;
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), boton.click()]);
    await pop?.waitForLoadState().catch(() => {});
    ok(!!pop && popups.some((u) => u.startsWith(p.url)), `[${nombre}] ${p.nombre}: el clic no abrió el sitio`);
    await pop?.close();
  }
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `[${nombre}] el Finder genera scroll horizontal en la página`);
  await ctx.close();
}
await browser.close(); srv.close();
console.log(`${n} comprobaciones del Finder.`);
if (fallos.length) { console.error('\nFALLOS:\n- ' + [...new Set(fallos)].join('\n- ')); process.exit(1); }
console.log('OK: el Finder filtra, selecciona y abre cada proyecto.');
