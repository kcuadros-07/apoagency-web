// Capturas + chequeos automáticos de UI. Uso: node scripts/revision-ui.mjs [url] [etiqueta]
// Genera revision/<etiqueta>/*.png y revision/<etiqueta>/reporte.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL_BASE = process.argv[2] || 'http://localhost:4321/';
const tag = process.argv[3] || 'ultima';
const out = `revision/${tag}`;
mkdirSync(out, { recursive: true });

const anchos = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const horizontales = [[844, 390], [932, 430]]; // celular en horizontal
const temas = ['light', 'dark'];

const comprobar = () => {
  const vw = window.innerWidth;
  const movil = vw <= 430 || (vw <= 932 && window.innerHeight <= 430);
  const visible = (el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const sel = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + ` "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}"`;
  const r = { scrollHorizontal: document.documentElement.scrollWidth > vw, targetsPequenos: [], textoPequeno: [], fueraDePantalla: [], imagenesDeformadas: [] };
  document.querySelectorAll('a, button, summary, [role=button], input, select, textarea').forEach((el) => {
    if (!visible(el) || el.classList.contains('skip-link')) return;
    const b = el.getBoundingClientRect();
    if (b.width < 44 || b.height < 44) r.targetsPequenos.push(`${sel(el)} ${Math.round(b.width)}x${Math.round(b.height)}`);
  });
  if (movil) {
    document.querySelectorAll('body *').forEach((el) => {
      if (!visible(el) || el.closest('[aria-hidden=true], [role=img]')) return; // los mockups (aria-hidden) usan tamaño de app real
      const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propio) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) r.textoPequeno.push(`${sel(el)} ${fs}px`);
    });
  }
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el) || el.closest('canvas')) return;
    const b = el.getBoundingClientRect();
    if (b.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[aria-hidden=true]')) r.fueraDePantalla.push(`${sel(el)} right=${Math.round(b.right)}`);
  });
  document.querySelectorAll('img').forEach((img) => {
    if (!visible(img) || !img.naturalWidth) return;
    const b = img.getBoundingClientRect();
    const d = Math.abs(b.width / b.height - img.naturalWidth / img.naturalHeight);
    if (d > 0.03 && getComputedStyle(img).objectFit === 'fill') r.imagenesDeformadas.push(sel(img));
  });
  return r;
};

const browser = await chromium.launch();
const reporte = [];
const consola = new Set();

async function pasada(nombre, viewport, tema, reducir) {
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: 1, colorScheme: tema,
    reducedMotion: reducir ? 'reduce' : 'no-preference',
    hasTouch: viewport.width <= 1024, isMobile: viewport.width <= 430,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && consola.add(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consola.add(`pageerror: ${e.message}`));
  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  if (viewport.width >= 1024 && !reducir) await page.waitForSelector('[data-id="m4"].on', { timeout: 15000 }).catch(() => {});
  // fuerza el tema aunque el sitio tenga toggle
  await page.evaluate((t) => (document.documentElement.dataset.theme = t), tema);
  await page.waitForTimeout(100);
  const file = `${nombre}-${tema}${reducir ? '-rm' : ''}`;
  await page.screenshot({ path: `${out}/${file}-viewport.png` });
  await page.screenshot({ path: `${out}/${file}-full.png`, fullPage: true });
  const checks = await page.evaluate(comprobar);
  reporte.push({ pasada: file, ancho: viewport.width, alto: viewport.height, tema, reducir, ...checks });
  await ctx.close();
}

for (const tema of temas) {
  for (const w of anchos) await pasada(`w${w}`, { width: w, height: w <= 430 ? 844 : 900 }, tema, false);
  for (const [w, h] of horizontales) await pasada(`land${w}x${h}`, { width: w, height: h }, tema, false);
}
await pasada('w390', { width: 390, height: 844 }, 'light', true);
await pasada('w1440', { width: 1440, height: 900 }, 'dark', true);

// Menú móvil: se abre, se ve y se cierra.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  const btn = page.locator('[data-menu]');
  await btn.tap();
  const abierto = await page.locator('#menu-movil').isVisible();
  await page.screenshot({ path: `${out}/menu-movil-abierto.png` });
  await page.keyboard.press('Escape');
  const cerrado = !(await page.locator('#menu-movil').isVisible());
  reporte.push({ pasada: 'menu-movil', abierto, cierraConEsc: cerrado });
  await ctx.close();
}

writeFileSync(`${out}/reporte.json`, JSON.stringify({ consola: [...consola], reporte }, null, 2));
const resumen = reporte.filter((r) => r.ancho).map((r) => `${r.pasada}: scrollH=${r.scrollHorizontal} targets<44=${r.targetsPequenos.length} texto<16=${r.textoPequeno.length} fuera=${r.fueraDePantalla.length}`);
console.log(resumen.join('\n'));
console.log('menu:', JSON.stringify(reporte.at(-1)));
console.log('consola:', [...consola]);
await browser.close();
