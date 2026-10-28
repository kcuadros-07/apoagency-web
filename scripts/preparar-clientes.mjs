// Logos de clientes: recorta solo el margen transparente (no redibuja nada) y copia las capturas.
// Uso: node scripts/preparar-clientes.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const logos = ['buscacasa', 'flexman', 'interhome', 'tecglo', 'data-privacy-sunset', 'cancion-films', 'ec-connect', 'el-instituto', 'intelnexo', 'avasant'];
mkdirSync('src/assets/clientes', { recursive: true });
const info = {};
for (const n of logos) {
  const { data, info: i } = await sharp(`brand/clientes/${n}.png`).raw().toBuffer({ resolveWithObject: true });
  let x0 = i.width, y0 = i.height, x1 = 0, y1 = 0, spread = 0, op = 0;
  for (let y = 0; y < i.height; y++) for (let x = 0; x < i.width; x++) {
    const p = (y * i.width + x) * i.channels;
    if (data[p + 3] > 10) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      if (data[p + 3] > 128) { spread += Math.max(data[p], data[p + 1], data[p + 2]) - Math.min(data[p], data[p + 1], data[p + 2]); op++; }
    }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  await sharp(`brand/clientes/${n}.png`).extract({ left: x0, top: y0, width: w, height: h }).png({ compressionLevel: 9 }).toFile(`src/assets/clientes/logo-cliente-${n}.png`);
  info[n] = { w, h, color: spread / op > 18 };
}
writeFileSync('src/assets/clientes/info.json', JSON.stringify(info, null, 1));
// Las capturas ya viven en src/assets/capturas con nombres descriptivos (caso-*.webp): no se copian de nuevo.
console.log(info);
