// Captura nuestras secciones a 1440 px y las pone lado a lado con las referencias (brand/referencia/rayyan/).
// Uso: node scripts/comparar-referencias.mjs [url] [etiqueta]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const URL_BASE = process.argv[2] || 'http://localhost:4321/';
const tag = process.argv[3] || 'v1';
const out = 'revision/comparacion';
mkdirSync(out, { recursive: true });
const R = 'brand/referencia/rayyan/';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
await ctx.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
const page = await ctx.newPage();
await page.goto(URL_BASE, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'header.fixed{position:absolute !important} .wa-flotante{display:none !important} *{animation:none !important}' });
await page.evaluate(() => { document.documentElement.classList.add('sin-reveal', 'cv-off'); document.documentElement.dataset.theme = 'light'; });
await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')));
await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);

const tomas = {
  nav: async () => page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } }),
  servicios: async () => page.locator('#servicios').screenshot(),
  hablemos: async () => page.locator('#hablemos').screenshot(),
};
const pares = { nav: R + '04-rayyan-nav-hero.jpg', servicios: R + '03-rayyan-que-hago.png', hablemos: R + '02-rayyan-hablemos.png' };

const ALTO = 900;
for (const [k, ref] of Object.entries(pares)) {
  const ours = await tomas[k]();
  await sharp(ours).toFile(`${out}/${tag}-apo-${k}.png`);
  const a = await sharp(ref).resize({ height: ALTO, fit: 'inside' }).png().toBuffer();
  const b = await sharp(ours).resize({ height: ALTO, fit: 'inside' }).png().toBuffer();
  const [ma, mb] = [await sharp(a).metadata(), await sharp(b).metadata()];
  const w = ma.width + mb.width + 60, h = ALTO + 60;
  const rot = (t, x) => `<text x="${x}" y="38" font-family="Arial" font-size="24" font-weight="700" fill="#111">${t}</text>`;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${rot('REFERENCIA (' + ref.split('/').pop() + ')', 20)}${rot('APO (1440 px)', ma.width + 40)}</svg>`;
  await sharp({ create: { width: w, height: h, channels: 3, background: '#e9e9ec' } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }, { input: a, top: 56, left: 20 }, { input: b, top: 56, left: ma.width + 40 }])
    .png().toFile(`${out}/${tag}-${k}.png`);
  console.log('comparación:', `${out}/${tag}-${k}.png`);
}
await browser.close();
