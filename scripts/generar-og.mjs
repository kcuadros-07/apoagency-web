// Imagen Open Graph 1200x630 con el logo oficial sobre apo-black.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const logo = readFileSync('brand/logos/apo-lobo-oscuro.png').toString('base64');
const font = readFileSync('node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2').toString('base64');
const html = `<style>
@font-face{font-family:J;src:url(data:font/woff2;base64,${font});font-weight:200 800}
body{margin:0;width:1200px;height:630px;background:#0B0B0F;color:#fff;font-family:J;display:flex;flex-direction:column;justify-content:space-between;padding:72px;box-sizing:border-box}
h1{font-size:84px;line-height:1;font-weight:800;letter-spacing:-.03em;margin:0;max-width:900px}
h1 b{color:#A5B4FC}p{font-size:28px;color:#A1A1AD;margin:0;font-weight:500}
</style><img src="data:image/png;base64,${logo}" height="104" style="align-self:flex-start">
<div><h1>Marketing que se mide en clientes.</h1><p style="margin-top:24px">APO Agency · Agencia de marketing digital en Ecuador</p></div>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: 'public/og.png' });
await b.close();
