// APO = solo marketing. Falla si aparece algo de Kuadros Group (SaaS, software, chatbots, IA, automatizaciones).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Palabras completas (con acentos) para no marcar "botón". "IA" solo en mayúsculas.
// Palabras completas (con acentos) para no marcar "botón". Se revisan TODAS las coincidencias de cada línea.
const prohibido = [
  /chatbots?/giu, /(?<!\p{L})bots?(?!\p{L})/giu, /inteligencia artificial/giu, /automati[zc]/giu, /automa[tc]i[oó]n/giu,
  /software/giu, /saas/giu, /kuadros/giu, /feria de loja/giu, /(?<!\p{L})CFL(?!\p{L})/gu, /chatgpt|\bgpt\b|machine learning|asistente virtual|\bcrm\b|zapier|\bn8n\b/giu,
  /(?<!\p{L})(IA|AI|I\.A\.)(?!\p{L})/gu, // solo en mayúsculas
];
const archivos = [];
const recorre = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? recorre(p) : /\.(html|astro|ts|json|md|xml|txt)$/.test(f) && archivos.push(p); });
['dist', 'src', 'public'].forEach(recorre);
archivos.push('astro.config.mjs');

const estricto = process.argv.includes('--estricto');
const hallazgos = [];
for (const f of archivos) {
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    // Excepción: la frase legal de la LOPDP sobre decisiones automatizadas (derechos del titular) no es un servicio.
    const lin = l.replace(/decisiones (basadas únicamente en valoraciones )?automatizadas|valoraciones automatizadas|automated (decisions|assessments)|decisions based solely on automated assessments/giu, '');
    for (const re of prohibido) for (const m of lin.matchAll(re)) hallazgos.push(`${f}:${i + 1}  "${m[0]}"  → ${l.trim().slice(0, 90)}`);
    // Con --estricto (antes de publicar) tampoco puede quedar ningún marcador {{...}} en el sitio compilado.
    if (estricto && f.startsWith('dist') && /\{\{[A-Z_]+\}\}/.test(l)) hallazgos.push(`${f}:${i + 1}  marcador sin completar  → ${l.match(/\{\{[A-Z_]+\}\}/g)}`);
  });
}
if (hallazgos.length) { console.error('Contenido que no debe publicarse:\n' + hallazgos.join('\n')); process.exit(1); }
console.log(`OK: sin menciones a SaaS, software, chatbots, IA ni automatizaciones${estricto ? ' y sin marcadores {{...}}' : ''} (${archivos.length} archivos).`);
