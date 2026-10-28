// Lighthouse móvil y desktop. Uso: node scripts/lighthouse.mjs [url]
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:4321/';
mkdirSync('revision/lighthouse', { recursive: true });
const env = { ...process.env, CHROME_PATH: chromium.executablePath() };
for (const modo of ['mobile', 'desktop']) {
  const out = `revision/lighthouse/${modo}.json`;
  const args = [url, '--output=json', `--output-path=${out}`, '--quiet',
    '--chrome-flags=--headless=new --no-sandbox', ...(modo === 'desktop' ? ['--preset=desktop'] : [])];
  execFileSync('npx', ['lighthouse', ...args], { env, stdio: 'inherit' });
  const r = JSON.parse(readFileSync(out, 'utf8'));
  const s = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  console.log(modo, s);
  const fallos = Object.values(r.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable');
  fallos.forEach((a) => console.log(`  - [${modo}] ${a.id}: ${a.title} (${a.displayValue ?? a.score})`));
}
