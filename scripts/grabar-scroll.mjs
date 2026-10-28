// Graba el scroll de arriba a abajo (webm). Uso: node scripts/grabar-scroll.mjs [url]
import { chromium } from 'playwright';
import { renameSync, rmSync, mkdirSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://localhost:4321/';
mkdirSync('revision/video', { recursive: true });
const browser = await chromium.launch();
for (const [n, vp, movil] of [['1440', { width: 1440, height: 900 }, false], ['390', { width: 390, height: 844 }, true]]) {
  const dir = `revision/video/_${n}`;
  const ctx = await browser.newContext({ viewport: vp, isMobile: movil, hasTouch: movil, recordVideo: { dir, size: vp } });
  await ctx.addInitScript(() => localStorage.setItem('apo-cookies', JSON.stringify({ v: 1, marketing: false, t: Date.now() })));
  const page = await ctx.newPage();
  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const alto = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (movil) { // táctil: scroll nativo, en pasos pequeños
    for (let y = 0; y < alto; y += 14) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(16); }
  } else { // mouse/trackpad: la rueda pasa por Lenis (smooth scroll)
    await page.mouse.move(700, 450);
    for (let y = 0; y < alto; y += 90) { await page.mouse.wheel(0, 90); await page.waitForTimeout(32); }
  }
  await page.waitForTimeout(1200);
  const v = page.video();
  await ctx.close();
  renameSync(await v.path(), `revision/video/scroll-${n}.webm`);
  rmSync(dir, { recursive: true, force: true });
  console.log(`scroll-${n}.webm (${alto}px de recorrido)`);
}
await browser.close();
