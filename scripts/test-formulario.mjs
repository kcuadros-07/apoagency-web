// Formulario de cotización + banner de cookies. Uso: node scripts/test-formulario.mjs  (requiere `npm run build:borrador` antes)
// Prueba: cada combinación servicio × respuestas en ES y EN, validaciones, teclado, móvil, y el consentimiento del Meta Pixel.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const es = (await import('../src/i18n/es.ts')).default;
const en = (await import('../src/i18n/en.ts')).default;
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.xml': 'application/xml' };
const servir = (dir, port) => new Promise((ok) => { const s = createServer((q, r) => { let f = join(dir, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html'); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(port, () => ok(s)); });

const fallos = []; let pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) fallos.push(msg); };
const BASE = 'http://localhost:4396/';
const srv = await servir('dist', 4396);
const browser = await chromium.launch();

const nuevaPagina = async (ruta, { viewport = { width: 1440, height: 900 }, movil = false, cookies = true } = {}) => {
  const ctx = await browser.newContext({ viewport, isMobile: movil, hasTouch: movil });
  if (cookies) await ctx.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
  const externas = [];
  await ctx.route((u) => u.origin !== new URL(BASE).origin, (r) => { externas.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fallos.push(`error de JS en ${ruta}: ${e.message}`));
  await page.goto(BASE + ruta.slice(1), { waitUntil: 'networkidle' });
  await page.locator('#cotizar astro-island').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('#cotizar astro-island')?.hasAttribute('ssr'), null, { timeout: 10000 });
  return { ctx, page, externas };
};
const combos = (qs) => qs.reduce((acc, q) => acc.flatMap((a) => q.op.map((o) => [...a, [q, o]])), [[]]);

const { precios, m } = await import('../src/data/metricas.ts');
const factor = Number(m('factorRango'));
const usd = (n) => `$${n.toLocaleString('en-US')}`;
const esc = (txt) => txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rangoEsperado = (d, serv, op) => { const p = precios[serv][op]; return `${usd(p.desde)}–${usd(Math.round((p.desde * factor) / 10) * 10)}${p.porMes ? d.form.rango.mes : ''}`; };

for (const [lang, d, ruta] of [['es', es, '/'], ['en', en, '/en/']]) {
  const F = d.form;
  const { ctx, page } = await nuevaPagina(ruta);
  const form = page.locator('[data-form-cotizacion]');
  const chip = (txt) => form.locator('label.chip', { hasText: new RegExp(`^\\s*${esc(txt)}\\s*$`) });
  const chipIni = (txt) => form.locator('label.chip', { hasText: new RegExp(`^\\s*${esc(txt)}`) });

  // ---- Validaciones ----
  ok(await form.getByRole('progressbar').getAttribute('aria-valuenow') === '1', `[${lang}] la barra de progreso no marca el paso 1`);
  await form.getByRole('button', { name: F.siguiente }).click();
  ok(await page.getByRole('alert').filter({ hasText: F.errores.servicio }).count() === 1, `[${lang}] sin servicio no muestra el error`);
  ok(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'alert'), `[${lang}] el foco no va al resumen de errores`);

  for (const [clave, nombreServ] of Object.entries(F.servicios)) {
    await chipIni(nombreServ).click();
    ok(await form.getByText(F.reco[clave], { exact: true }).isVisible(), `[${lang}] "APO recomienda" no cambia para ${clave}`);
  }
  await chipIni(F.servicios.web).click();
  await form.getByRole('button', { name: F.siguiente }).click();
  ok(await form.getByRole('progressbar').getAttribute('aria-valuenow') === '2', `[${lang}] la barra de progreso no marca el paso 2`);
  ok(await page.locator('[data-rango]').getByText(F.rango.vacio).isVisible(), `[${lang}] el rango no pide elegir una opción`);
  await form.getByRole('button', { name: F.siguiente }).click(); // paso 2 sin responder
  ok(await page.getByRole('alert').filter({ hasText: F.errores.pregunta.replace('{q}', F.tipoQ.web) }).count() === 1, `[${lang}] paso 2 sin tipo no avisa`);
  ok(await page.getByRole('alert').filter({ hasText: F.errores.pregunta.replace('{q}', F.presupuestoQ) }).count() === 1, `[${lang}] paso 2 sin presupuesto no avisa`);
  await chipIni(F.opciones.web.corporativo).click();
  ok((await page.locator('[data-rango] .f-rango-v').innerText()) === rangoEsperado(d, 'web', 'corporativo'), `[${lang}] rango en vivo incorrecto para web/corporativo`);
  ok(await page.locator('[data-rango]').getByText(F.rango.mantenimiento.replace('{n}', usd(precios.web.corporativo.mensual))).isVisible(), `[${lang}] falta la línea de mantenimiento`);
  await chip(F.presupuesto[1]).click();
  await form.getByRole('button', { name: F.siguiente }).click();

  // paso 3: nombre corto, números inválidos, correo inválido, sin aceptar
  await form.getByLabel(F.nombre, { exact: true }).fill('A');
  for (const malo of ['123', '0987', '+5939', 'abcdefghij', '0187654321']) {
    await form.getByLabel(F.whatsapp, { exact: true }).fill(malo);
    await form.getByRole('button', { name: F.enviar }).click();
    ok(await page.getByRole('alert').filter({ hasText: F.errores.whatsapp }).count() === 1, `[${lang}] acepta número inválido: ${malo}`);
  }
  await form.getByLabel(F.correo, { exact: true }).fill('no-es-un-correo');
  await form.getByRole('button', { name: F.enviar }).click();
  ok(await page.getByRole('alert').filter({ hasText: F.errores.correo }).count() === 1, `[${lang}] acepta un correo inválido`);
  ok(await page.getByRole('alert').filter({ hasText: F.errores.nombre }).count() === 1, `[${lang}] acepta nombre de 1 letra`);
  ok(await page.getByRole('alert').filter({ hasText: F.errores.privacidad }).count() === 1, `[${lang}] se envía sin aceptar la privacidad`);
  ok(await form.getByLabel(F.whatsapp, { exact: true }).getAttribute('aria-invalid') === 'true', `[${lang}] el campo inválido no tiene aria-invalid`);
  await ctx.close();

  // ---- Cada servicio × cada opción (el presupuesto rota entre los 4) ----
  const validos = ['0987654321', '987654321', '+593 98 765 4321', '593987654321', '+593 2 234 5678'];
  let n = 0;
  for (const [clave, nombreServ] of Object.entries(F.servicios)) {
    for (const [op, etiqueta] of Object.entries(F.opciones[clave])) {
      const { ctx, page } = await nuevaPagina(ruta);
      const form = page.locator('[data-form-cotizacion]');
      const chip = (txt) => form.locator('label.chip', { hasText: new RegExp(`^\\s*${esc(txt)}\\s*$`) });
      const chipIni = (txt) => form.locator('label.chip', { hasText: new RegExp(`^\\s*${esc(txt)}`) });
      const presupuesto = F.presupuesto[n % F.presupuesto.length];
      await chipIni(nombreServ).click();
      await form.getByRole('button', { name: F.siguiente }).click();
      await chipIni(etiqueta).click();
      await chip(presupuesto).click();
      const rangoTxt = await page.locator('[data-rango] .f-rango-v').innerText();
      ok(rangoTxt === rangoEsperado(d, clave, op), `[${lang}] ${clave}/${op}: rango "${rangoTxt}" ≠ "${rangoEsperado(d, clave, op)}"`);
      if (clave === 'ads') ok(await page.locator('[data-rango]').getByText(m('pautaMensual'), { exact: false }).isVisible(), `[${lang}] ads: falta la nota de pauta`);
      await form.getByRole('button', { name: F.siguiente }).click();
      const tel = validos[n % validos.length];
      await form.getByLabel(F.nombre, { exact: true }).fill('María José');
      await form.getByLabel(F.whatsapp, { exact: true }).fill(tel);
      await form.getByLabel(F.correo, { exact: true }).fill('maria@empresa.com.ec');
      await form.getByLabel(F.mas).fill('Quiero empezar pronto');
      await form.getByRole('checkbox').check();
      const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 12000 }).catch(() => null), form.getByRole('button', { name: F.enviar }).click()]);
      ok(!!popup, `[${lang}] ${clave}/${op}: no abrió WhatsApp`);
      if (popup) {
        const u = new URL(popup.url());
        const txt = u.searchParams.get('text') || '';
        ok(u.pathname === '/593987252978', `[${lang}] ${clave}: número de WhatsApp incorrecto (${u.pathname})`);
        ok(txt.includes(F.mensaje.saludo.replace('{nombre}', 'María José')), `[${lang}] ${clave}/${op}: saludo incorrecto`);
        ok(txt.includes(`${F.mensaje.servicio}: ${nombreServ}`), `[${lang}] ${clave}/${op}: falta el servicio`);
        ok(txt.includes(`${F.tipoQ[clave]}: ${etiqueta}`), `[${lang}] ${clave}/${op}: falta la opción`);
        ok(txt.includes(`${F.mensaje.presupuesto}: ${presupuesto}`), `[${lang}] ${clave}/${op}: falta el presupuesto`);
        ok(txt.includes(`${F.mensaje.rango}: ${rangoEsperado(d, clave, op)}`), `[${lang}] ${clave}/${op}: falta el rango estimado`);
        ok(/\+593(9\d{8}|2\d{7})/.test(txt), `[${lang}] ${clave}/${op}: número no normalizado a +593 (${tel})`);
        ok(txt.includes('maria@empresa.com.ec') && txt.includes('Quiero empezar pronto'), `[${lang}] ${clave}/${op}: faltan correo o comentario`);
        await popup.close();
      }
      ok(await page.getByText(F.ok.titulo).isVisible(), `[${lang}] ${clave}/${op}: no muestra la pantalla de éxito`);
      ok(await page.getByRole('link', { name: F.ok.boton, exact: true }).getAttribute('href').then((h) => h?.startsWith('https://wa.me/593987252978?text=')), `[${lang}] ${clave}/${op}: enlace de respaldo incorrecto`);
      await ctx.close();
      n++;
    }
  }
  console.log(`[${lang}] ${n} combinaciones probadas`);
}

// ---- Teclado y celular ----
{
  const { ctx, page } = await nuevaPagina('/', { viewport: { width: 390, height: 844 }, movil: true });
  const form = page.locator('[data-form-cotizacion]');
  await page.waitForTimeout(1500); // termina la animación de entrada (escala 0.98 → 1)
  const alto = await form.locator('label.chip span').evaluateAll((els) => Math.min(...els.map((e) => e.getBoundingClientRect().height)));
  ok(alto >= 44, `móvil: chips de ${alto}px (<44)`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'móvil: el formulario genera scroll horizontal');
  await form.locator('label.chip input').first().focus();
  await page.keyboard.press('ArrowRight'); // navegación con flechas dentro del grupo de radios
  ok(await form.locator('label.chip input').nth(1).isChecked(), 'teclado: la flecha derecha no cambia de chip');
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement?.tagName === 'BUTTON'), 'teclado: Tab no llega al botón Siguiente');
  await page.keyboard.press('Enter');
  ok(await form.getByRole('progressbar').getAttribute('aria-valuenow') === '2', 'teclado: Enter en Siguiente no avanza');
  ok(await page.evaluate(() => document.activeElement?.tagName === 'H3'), 'teclado: el foco no pasa al título del nuevo paso');
  await ctx.close();
}

// ---- Cookies y Meta Pixel (se compila una variante con un Pixel ID de prueba) ----
execSync('npx astro build --outDir dist-pixel', { env: { ...process.env, PUBLIC_META_PIXEL_ID: '123456789' }, stdio: 'ignore' });
const srv2 = await servir('dist-pixel', 4395);
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const fb = [];
  await ctx.route((u) => u.origin !== 'http://localhost:4395', (r) => { if (/facebook|fbevents/.test(r.request().url())) fb.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4395/', { waitUntil: 'networkidle' });
  const banner = page.locator('#cookie-banner');
  ok(await banner.isVisible(), 'cookies: el banner no aparece la primera vez');
  ok(fb.length === 0, 'cookies: el Pixel se cargó ANTES de aceptar');
  const rb = await banner.boundingBox(), rw = await page.locator('.wa-flotante').boundingBox();
  ok(!(rw.y + rw.height > rb.y && rw.y < rb.y + rb.height && rw.x + rw.width > rb.x && rw.x < rb.x + rb.width), 'cookies: el botón flotante tapa el banner');
  for (const b of await banner.getByRole('button').all()) { const bb = await b.boundingBox(); ok(bb.height >= 44, 'cookies: botón del banner <44px'); }
  await banner.getByRole('button', { name: es.cookies.rechazar }).click();
  ok(await banner.isHidden(), 'cookies: Rechazar no cierra el banner');
  ok(JSON.parse(await page.evaluate(() => localStorage.getItem('apo-cookies'))).marketing === false, 'cookies: Rechazar no guarda marketing=false');
  await page.reload({ waitUntil: 'networkidle' });
  ok(await banner.isHidden() && fb.length === 0, 'cookies: tras rechazar, reaparece el banner o carga el Pixel');
  await page.getByRole('button', { name: es.footer.prefCookies }).click();
  ok(await page.locator('#cookie-panel').isVisible(), 'cookies: "Preferencias de cookies" no abre el panel');
  await page.locator('#cookie-mkt').check();
  await page.getByRole('button', { name: es.cookies.guardar }).click();
  await page.waitForTimeout(800);
  ok(fb.some((u) => u.includes('fbevents.js')), 'cookies: aceptar marketing no carga el Pixel');
  ok(JSON.parse(await page.evaluate(() => localStorage.getItem('apo-cookies'))).marketing === true, 'cookies: no guarda marketing=true');
  await ctx.close();
  // Aceptar de una vez y Configurar desde el banner
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const fb2 = [];
  await ctx2.route((u) => u.origin !== 'http://localhost:4395', (r) => { if (/fbevents/.test(r.request().url())) fb2.push(1); r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
  const p2 = await ctx2.newPage();
  await p2.goto('http://localhost:4395/en/', { waitUntil: 'networkidle' });
  await p2.getByRole('button', { name: en.cookies.configurar }).click();
  ok(await p2.locator('#cookie-panel').isVisible(), 'cookies (en): Settings no abre el panel');
  await p2.keyboard.press('Escape');
  await p2.getByRole('button', { name: en.cookies.aceptar }).click();
  await p2.waitForTimeout(800);
  ok(fb2.length === 1, 'cookies (en): Accept no carga el Pixel');
  await ctx2.close();
}

await browser.close(); srv.close(); srv2.close();
console.log(`${pruebas} comprobaciones.`);
if (fallos.length) { console.error(`\nFALLOS (${fallos.length}):\n- ` + [...new Set(fallos)].join('\n- ')); process.exit(1); }
console.log('OK: formulario, validaciones, teclado, móvil y consentimiento de cookies.');
