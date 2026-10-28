// Convierte brand/tokens.json en src/styles/tokens.css (@theme de Tailwind v4).
// Fuente de verdad: brand/tokens.json. No editar tokens.css a mano.
import { readFileSync, writeFileSync } from 'node:fs';

const t = JSON.parse(readFileSync('brand/tokens.json', 'utf8'));
const px = (v) => parseFloat(v);

const colors = t.color.tokens;
const vars = (mode, skip = []) =>
  colors
    .filter((c) => !skip.includes(c.name))
    .map((c) => `  --c-${c.name}: ${c.value[mode]};`)
    .join('\n');

// Titulares grandes se escalan en móvil (360px) hasta ~63% / 80% del tamaño del token.
const fluid = (size) => {
  const max = px(size);
  if (max < 40) return size;
  const min = Math.round(max * (max >= 64 ? 0.625 : 0.8));
  return `clamp(${min}px, calc(${min}px + ${max - min} * (100vw - 360px) / 920), ${max}px)`;
};

const type = t.type.groups
  .flatMap((g) => g.styles)
  .map((s) => {
    const n = `--text-${s.name}`;
    return [
      `  ${n}: ${fluid(s.fontSize)};`,
      `  ${n}--line-height: ${s.lineHeight};`,
      `  ${n}--font-weight: ${s.fontWeight};`,
      s.letterSpacing ? `  ${n}--letter-spacing: ${s.letterSpacing};` : '',
    ]
      .filter(Boolean)
      .join('\n');
  })
  .join('\n');

const css = `/* GENERADO por scripts/tokens-a-css.mjs desde brand/tokens.json. No editar. */
:root {
  color-scheme: light;
${vars('light')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
${vars('dark')}
  }
}
:root[data-theme='dark'] {
  color-scheme: dark;
${vars('dark')}
}
/* Bloques siempre oscuros (hero, cierres): texto con los valores del tema oscuro. */
.scope-dark {
  color-scheme: dark;
${vars('dark', ['block-dark', 'apo-black', 'indigo', 'on-indigo'])}
}
/* Tarjeta clara dentro de un bloque oscuro (p. ej. la notificación). */
.scope-light {
  color-scheme: light;
${vars('light', ['block-dark', 'apo-black', 'indigo', 'on-indigo'])}
}

@theme inline {
  --font-sans: ${t.type.families.sans.replace('"Plus Jakarta Sans"', '"Plus Jakarta Sans Variable", "Plus Jakarta Sans"')};
${colors.map((c) => `  --color-${c.name}: var(--c-${c.name});`).join('\n')}
${t.spacing.tokens.map((s) => `  --spacing-${s.name}: ${s.value};`).join('\n')}
${t.radius.tokens.map((r) => `  --${r.name}: ${r.value};`).join('\n')}
${type}
}
`;

writeFileSync('src/styles/tokens.css', css);
console.log('tokens.css generado');
