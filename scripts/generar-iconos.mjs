// Favicons desde el ícono de app oficial (brand/logos/apo-lobo-icono-app.png).
import sharp from 'sharp';
import { copyFileSync } from 'node:fs';

const src = 'brand/logos/apo-lobo-icono-app.png';
for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(src).resize(size, size).png().toFile(`public/${name}`);
}
copyFileSync('src/assets/logos/apo-lobo-icono-app.svg', 'public/favicon.svg');
console.log('iconos listos');
