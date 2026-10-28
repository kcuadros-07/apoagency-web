// Candado de publicación: falla si alguna métrica de src/data/metricas.ts tiene verificado: false.
import { pendientes, total } from '../src/data/metricas.ts';

const falta = pendientes();
if (falta.length) {
  console.error(`\n✖ ${falta.length} de ${total()} métricas sin verificar. No se puede publicar:\n`);
  for (const f of falta) console.error(`  - ${f.id}: ${f.valor}\n      ${f.fuente}`);
  console.error('\nConfirma cada cifra y pon verificado: true en src/data/metricas.ts.\n(Para probar en local sin el candado: npm run build:borrador)\n');
  process.exit(1);
}
console.log(`✔ ${total()} métricas verificadas.`);
