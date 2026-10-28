// Hace clic en TODOS los links y botones visibles (escritorio y celular) y falla si alguno no lleva a un destino válido.
// Uso: npm run test:enlaces   (levanta su propio preview en el puerto 4399; corre `npm run build` antes)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const PORT = 4399; // puerto propio: no choca con `astro dev` (4321/4322)
const BASE = `http://localhost:${PORT}/`;
// Servidor estático mínimo sobre dist/ (no depende de `astro preview`, que solo admite uno por proyecto).
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.avif': 'image/avif' };
const server = createServer((req, res) => {
  let f = join('dist', decodeURIComponent(new URL(req.url, BASE).pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end('no encontrado'); }
  res.writeHead(200, { 'content-type': tipos[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const fallos = [];
let revisados = 0;
const fallo = (vp, que, detalle) => fallos.push(`[${vp}] ${que}: ${detalle}`);

const browser = await chromium.launch();
const paginas = ['/', '/en/', '/terminos/', '/en/terms/', '/diseno-web/', '/casos/flexman/', '/en/web-design/', '/en/cases/flexman/'];
const viewports = [
  ['escritorio 1440', { width: 1440, height: 900 }, false],
  ['celular 390', { width: 390, height: 844 }, true],
];

for (const [nombreVp, viewport, movil] of viewports) for (const pagina of paginas) {
  const nombre = `${nombreVp} ${pagina}`;
  const ctx = await browser.newContext({ viewport, isMobile: movil, hasTouch: movil, permissions: ['clipboard-read', 'clipboard-write'] });
  // La elección de cookies ya está guardada: el banner se prueba aparte (test-formulario.mjs).
  await ctx.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
  // Los destinos externos no salen a internet: se interceptan y se comprueba la URL pedida.
  const externas = [];
  await ctx.route((u) => u.origin !== new URL(BASE).origin, (route) => {
    externas.push(route.request().url());
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fallo(nombre, 'error de JS', e.message));
  page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) fallo(nombre, 'recurso roto', `${r.status()} ${r.url()}`); });
  await page.goto(BASE + pagina.slice(1), { waitUntil: 'networkidle' });

  const menuBtn = page.locator('[data-menu]');
  const abierto = async () => (await menuBtn.getAttribute('aria-expanded')) === 'true';
  // El menú móvil solo se abre para tocar lo que vive dentro de él; fuera de él se cierra para no tapar la página.
  const asegurarMenu = async (enMenu) => {
    if (!(await menuBtn.isVisible())) return;
    if (enMenu && !(await abierto())) await menuBtn.click();
    if (!enMenu && (await abierto())) await menuBtn.click();
  };
  // Lenis marca <html> con 'lenis-scrolling' mientras anima: se espera a que termine antes de tocar el scroll a mano.
  const esperarScroll = async () => {
    await page.waitForTimeout(250);
    let reposo = 0, prev = -1;
    for (let t = 0; t < 120 && reposo < 4; t++) {
      await page.waitForTimeout(100);
      const [animando, y] = await page.evaluate(() => [document.documentElement.classList.contains('lenis-scrolling'), Math.round(scrollY)]);
      reposo = !animando && y === prev ? reposo + 1 : 0;
      prev = y;
    }
  };
  const volverArriba = async () => { await esperarScroll(); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250); };

  // ---- Links ----
  await asegurarMenu(true);
  const links = await page.$$eval('a[href]', (as) => as.map((a, i) => {
    const r = a.getBoundingClientRect(), s = getComputedStyle(a);
    return { i, href: a.getAttribute('href'), texto: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 40),
      visible: r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none',
      blank: a.target === '_blank', rel: a.rel, enMenu: !!a.closest('#menu-movil'), dinamico: !!a.closest('.finder-prev') };
  }));
  const vistos = new Set();
  for (const l of links) {
    if (!l.visible || l.href === '#contenido') continue; // el skip-link solo aparece con foco
    const clave = l.href + '|' + l.texto + '|' + l.enMenu;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    revisados++;
    const etiqueta = `"${l.texto}" → ${l.href}`;
    if (!l.href || l.href === '#' || l.href.startsWith('javascript:')) { fallo(nombre, 'enlace vacío', etiqueta); continue; }
    if (l.blank && !/noopener/.test(l.rel)) fallo(nombre, 'falta rel=noopener', etiqueta);

    if (l.href.startsWith('#') && !(await page.$(`#${l.href.slice(1)}`)) && pagina !== '/' && pagina !== '/en/') { fallo(nombre, 'ancla sin destino en página interna', etiqueta); continue; }
    if (l.href.startsWith('#')) {
      const id = l.href.slice(1);
      if (!(await page.$(`#${id}`))) { fallo(nombre, 'ancla sin destino', etiqueta); continue; }
      await asegurarMenu(l.enMenu);
      await volverArriba();
      await page.locator(l.enMenu ? `#menu-movil a[href="${l.href}"]` : `a[href="${l.href}"]:not(#menu-movil a)`).filter({ visible: true }).first().click();
      await esperarScroll();
      const r = await page.evaluate((id) => {
        const el = document.getElementById(id), b = el.getBoundingClientRect();
        return { top: b.top, alto: b.height, finDePagina: innerHeight + scrollY >= document.documentElement.scrollHeight - 2, hash: location.hash };
      }, id);
      if (r.alto === 0) fallo(nombre, 'destino sin tamaño', etiqueta);
      else if (!(r.top >= -5 && r.top <= 200) && !(r.finDePagina && r.top > 0 && r.top < 844)) fallo(nombre, 'no llegó a la sección', `${etiqueta} (top=${Math.round(r.top)})`);
    } else if (l.href.startsWith('mailto:')) {
      if (!/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(l.href)) fallo(nombre, 'mailto inválido', etiqueta);
    } else if (l.href.startsWith('https://wa.me/')) {
      const u = new URL(l.href);
      if (u.pathname !== '/593987252978') fallo(nombre, 'número de WhatsApp incorrecto', etiqueta);
      else if (!u.searchParams.get('text')) fallo(nombre, 'WhatsApp sin mensaje prellenado', etiqueta);
      else {
        await asegurarMenu(l.enMenu);
        await esperarScroll();
        externas.length = 0;
        const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), page.locator(`a[href="${l.href}"]`).filter({ visible: true }).first().click()]);
        await popup?.waitForLoadState().catch(() => {});
        if (!popup || !externas.includes(l.href)) fallo(nombre, 'el clic no abrió el destino', etiqueta);
        await popup?.close();
      }
    } else if (/^https:\/\//.test(l.href) && l.dinamico) {
      if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/.test(l.href)) fallo(nombre, 'URL inválida en el Finder', etiqueta); // el clic se prueba en test-finder.mjs
    } else if (/^https:\/\//.test(l.href)) {
      await asegurarMenu(l.enMenu);
      await esperarScroll();
      externas.length = 0;
      const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), page.locator(`a[href="${l.href}"]`).filter({ visible: true }).first().click()]);
      await popup?.waitForLoadState().catch(() => {});
      if (!popup || !externas.includes(l.href)) fallo(nombre, 'el clic no abrió el destino', etiqueta);
      await popup?.close();
    } else if (l.href.startsWith('/')) {
      const res = await page.request.get(new URL(l.href, BASE).href);
      if (!res.ok()) fallo(nombre, `ruta ${res.status()}`, etiqueta);
    } else fallo(nombre, 'destino no reconocido', etiqueta);
  }

  // ---- Botones: cada clic debe cambiar algo en la página ----
  await page.evaluate(() => {
    window.__cambios = 0;
    new MutationObserver(() => window.__cambios++).observe(document.documentElement, { attributes: true, childList: true, subtree: true, characterData: true });
  });
  const botones = await page.$$eval('button, [role=button]', (bs) => bs.map((b, i) => {
    b.setAttribute('data-test-i', String(i)); // marca estable: el DOM cambia mientras se prueba (pasos del formulario, carrusel)
    const r = b.getBoundingClientRect();
    return { i, texto: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 40), visible: r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== 'hidden', label: b.getAttribute('aria-label'), enMenu: !!b.closest('#menu-movil'), off: b.disabled, activo: b.getAttribute('aria-current') === 'true' };
  }));
  for (const b of botones) {
    if (!b.visible || b.off || b.activo) continue; // los deshabilitados (p. ej. flecha anterior al inicio) no se tocan
    revisados++;
    await volverArriba();
    if (b.label?.includes('menú') || b.label?.includes('Abrir') || b.label?.includes('Cerrar')) {
      // menú móvil: abrir, comprobar, cerrar con Esc
      if (await abierto()) await menuBtn.click();
      await menuBtn.click();
      if (!(await page.locator('#menu-movil').isVisible())) fallo(nombre, 'el botón de menú no abre', b.label);
      await page.keyboard.press('Escape');
      if (await page.locator('#menu-movil').isVisible()) fallo(nombre, 'Esc no cierra el menú', b.label);
      continue;
    }
    await asegurarMenu(b.enMenu);
    await esperarScroll();
    const antes = await page.evaluate(() => window.__cambios);
    const loc = page.locator(`[data-test-i="${b.i}"]`);
    if ((await loc.count()) === 0) continue; // el componente se volvió a dibujar y el botón ya no existe
    if (!(await loc.isEnabled())) continue; // el estado cambió (p. ej. flecha del carrusel al llegar al final)
    try { await loc.scrollIntoViewIfNeeded({ timeout: 4000 }); } catch { fallo(nombre, 'botón visible pero no se puede llevar a pantalla', `"${b.texto}" (${b.label ?? ''})`); continue; }
    // Las islas de React hidratan al entrar en pantalla: se espera antes de hacer clic.
    const islaId = await loc.evaluate((el, ) => { const i = el.closest('astro-island'); if (!i) return null; i.dataset.tmp = 'x'; return [...document.querySelectorAll('astro-island')].indexOf(i); });
    if (islaId !== null) await page.waitForFunction((k) => !document.querySelectorAll('astro-island')[k]?.hasAttribute('ssr'), islaId, { timeout: 10000 });
    try { await loc.click({ timeout: 5000 }); } catch { fallo(nombre, 'botón que no se puede pulsar', `"${b.texto}" (${b.label ?? ''})`); continue; }
    for (let t = 0; t < 20 && (await page.evaluate(() => window.__cambios)) === antes; t++) await page.waitForTimeout(100);
    await page.keyboard.press('Escape'); // cierra paneles (p. ej. preferencias de cookies)
    if ((await page.evaluate(() => window.__cambios)) === antes) fallo(nombre, 'botón sin efecto', `"${b.texto}"`);
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(`${revisados} links/botones revisados en ${viewports.length} tamaños y ${paginas.length} páginas.`);
if (fallos.length) {
  console.error(`\nFALLOS (${fallos.length}):\n- ` + fallos.join('\n- '));
  process.exit(1);
}
console.log('OK: todos los links y botones llevan a un destino válido.');
