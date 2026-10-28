// Capturas por sección a 1440 y 390 px. Uso: node scripts/capturas-secciones.mjs [url] [etiqueta]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://localhost:4321/';
const tag = process.argv[3] || 'v1';
const out = `revision/secciones/${tag}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [n, vp, movil] of [['1440', { width: 1440, height: 900 }, false], ['390', { width: 390, height: 844 }, true]]) {
  for (const tema of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: movil, hasTouch: movil, colorScheme: tema, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
    const page = await ctx.newPage();
    await page.goto(URL_BASE, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'header.fixed{position:absolute !important} .wa-flotante{display:none !important} *{animation:none !important}' });
    await page.evaluate((t) => { document.documentElement.classList.add('sin-reveal', 'cv-off'); document.documentElement.dataset.theme = t; document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')); }, tema);
    // Finder: elige un proyecto con captura; Cotizar: avanza hasta ver el rango en vivo
    await page.locator('.finder').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('#proyectos astro-island')?.hasAttribute('ssr'), null, { timeout: 10000 });
    await page.locator('.finder-item', { hasText: 'Flexman' }).first().click();
    await page.locator('#cotizar astro-island').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('#cotizar astro-island')?.hasAttribute('ssr'), null, { timeout: 10000 });
    const f = page.locator('[data-form-cotizacion]');
    await f.locator('label.chip', { hasText: 'Diseño web' }).click();
    await f.getByRole('button', { name: 'Siguiente' }).click();
    await f.locator('label.chip', { hasText: 'Sitio corporativo' }).click();
    await f.locator('label.chip', { hasText: '$300–$700' }).click();
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    for (const [k, sel] of [['clientes', 'main > section:nth-of-type(2)'], ['servicios', '#servicios'], ['casos', '#casos'], ['testimonios', '#testimonios'], ['finder', '#proyectos'], ['proceso', '#proceso'], ['faq', '#faq'], ['quien', '#quien'], ['hablemos', '#hablemos'], ['cotizar', '#cotizar']]) {
      await page.locator(sel).first().screenshot({ path: `${out}/${k}-${n}-${tema}.png` });
    }
    await ctx.close();
  }
}
// Banner de cookies y versión en inglés
for (const [n, vp, movil] of [['1440', { width: 1440, height: 900 }, false], ['390', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: movil, hasTouch: movil });
  const page = await ctx.newPage();
  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/cookies-${n}.png` });
  const ctx2 = await browser.newContext({ viewport: vp, isMobile: movil, hasTouch: movil });
  await ctx2.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
  const p2 = await ctx2.newPage();
  await p2.goto(URL_BASE + 'en/', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(800);
  await p2.screenshot({ path: `${out}/en-hero-${n}.png` });
  await ctx.close(); await ctx2.close();
}
await browser.close();
console.log('listo:', out);
