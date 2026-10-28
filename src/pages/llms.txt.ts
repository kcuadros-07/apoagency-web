// /llms.txt: resumen de APO para modelos de lenguaje. Se genera en el build con los datos reales (precios, contacto, URLs).
import { getCollection } from 'astro:content';
import { SITE } from '../config';
import { precios, m, type MetricaId } from '../data/metricas';
import { rutaDe, SERVICIOS } from '../data/rutas.mjs';
import { dict } from '../i18n';

export async function GET() {
  const U = (l: 'es' | 'en', p: string) => SITE.url + rutaDe(l, p);
  const usd = (n: number, mes?: boolean) => `$${n}${mes ? '/mes' : ''}`;
  const casos = (await getCollection('casos')).sort((a, b) => a.data.orden - b.data.orden);
  const f = dict.es.form.servicios;
  const lineas = [
    `# APO Agency`,
    ``,
    `> Agencia de marketing digital en ${m('ciudad')}, Ecuador. Diseño web, Meta Ads y Google Ads, branding y contenido para redes sociales. Fundador: ${SITE.founder}. Trabaja con negocios de todo el Ecuador, en español e inglés.`,
    ``,
    `## Servicios y precios (USD, referenciales, "desde")`,
    `- [${f.web}](${U('es', 'servicio:web')}): landing page desde ${usd(precios.web.landing.desde)}; sitio corporativo desde ${usd(precios.web.corporativo.desde)} + ${usd(precios.web.corporativo.mensual!, true)} de mantenimiento; tienda online desde ${usd(precios.web.tienda.desde)} + ${usd(precios.web.tienda.mensual!, true)}. Plazo: ${m('plazoWeb')} días hábiles (web) y ${m('plazoTienda')} (tienda).`,
    `- [${f.ads}](${U('es', 'servicio:ads')}): gestión mensual sin incluir pauta; Meta desde ${usd(precios.ads.meta.desde, true)}, Google desde ${usd(precios.ads.google.desde, true)}, ambas desde ${usd(precios.ads.ambas.desde, true)}. Pauta recomendada ${m('pautaDiaria')} diarios (${m('pautaMensual')} al mes), pagada por el cliente a la plataforma.`,
    `- [${f.branding}](${U('es', 'servicio:branding')}): logo desde ${usd(precios.branding.logo.desde)}; rediseño desde ${usd(precios.branding.rediseno.desde)}; identidad completa con manual de marca desde ${usd(precios.branding.identidad.desde)}.`,
    `- [${f.contenido}](${U('es', 'servicio:contenido')}): pack de 8 carruseles desde ${usd(precios.contenido.carruseles.desde)}; video de lanzamiento desde ${usd(precios.contenido.video.desde)}; plan mensual (12 posts + 4 reels) desde ${usd(precios.contenido.plan.desde, true)}.`,
    ``,
    `## Casos de éxito`,
    ...casos.map((c) => `- [${c.data.cliente}](${U('es', `caso:${c.id}`)}): ${c.data.sector.es}, ${c.data.servicio.es}. ${m(c.data.metrica as MetricaId)} ${c.data.etiqueta.es}.`),
    ``,
    `## Proceso`,
    `Diagnóstico gratuito (llamada de 30 a 45 minutos) → propuesta a medida con precio fijo → ejecución con actualizaciones semanales → seguimiento y optimización con reportes. Pago: web 50/50, tienda 70/30. Dominio y hosting a nombre y por cuenta del cliente. No se garantizan resultados de las plataformas publicitarias.`,
    ``,
    `## Contacto`,
    `- WhatsApp: ${SITE.phone} (https://wa.me/${SITE.whatsapp})`,
    `- Correo: ${SITE.email}`,
    `- Ciudad: ${m('ciudad')}, ${m('provincia')}, Ecuador. Horario: ${m('horario')}.`,
    `- Instagram: ${SITE.instagram}`,
    `- LinkedIn: ${SITE.linkedin}`,
    ``,
    `## Enlaces principales`,
    `- [Inicio (español)](${U('es', 'home')})`,
    `- [Home (English)](${U('en', 'home')})`,
    `- [Términos](${U('es', 'terminos')}) · [Privacidad](${U('es', 'privacidad')}) · [Cookies](${U('es', 'cookies')})`,
    `- [Sitemap](${SITE.url}/sitemap-index.xml)`,
    ``,
    `## English`,
    ...Object.keys(SERVICIOS).map((s) => `- ${dict.en.form.servicios[s as 'web']}: ${U('en', `servicio:${s}`)}`),
    ``,
  ];
  return new Response(lineas.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
