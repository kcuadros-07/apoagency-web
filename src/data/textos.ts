// Valores para reemplazar los {marcadores} de los textos largos. Todo sale de src/data/metricas.ts.
import { precios, m } from './metricas.ts';

const fmt = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);

const usd = (n: number) => `$${n}`;
export const valoresTexto = (): Record<string, string> => ({
  landing: usd(precios.web.landing.desde), corp: usd(precios.web.corporativo.desde), corpMes: usd(precios.web.corporativo.mensual!),
  tienda: usd(precios.web.tienda.desde), tiendaMes: usd(precios.web.tienda.mensual!),
  meta: usd(precios.ads.meta.desde), google: usd(precios.ads.google.desde), ambas: usd(precios.ads.ambas.desde),
  logo: usd(precios.branding.logo.desde), rediseno: usd(precios.branding.rediseno.desde), identidad: usd(precios.branding.identidad.desde),
  carruseles: usd(precios.contenido.carruseles.desde), video: usd(precios.contenido.video.desde), plan: usd(precios.contenido.plan.desde),
  pautaDia: m('pautaDiaria'), pautaMes: m('pautaMensual'), plazoWeb: m('plazoWeb'), plazoTienda: m('plazoTienda'),
  ciudad: m('ciudad'), provincia: m('provincia'),
});
export const texto = (s: string) => fmt(s, valoresTexto());
