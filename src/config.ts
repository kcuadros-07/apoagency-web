// Datos del negocio y enlaces. Lo pendiente llega por variables de entorno (.env / Variables de GitHub).
import { m } from './data/metricas';

export const SITE = {
  name: 'APO Agency',
  url: 'https://apoagency.io',
  founder: 'Kevin Cuadros',
  email: 'hola@apoagency.io',
  phone: '+593987252978',
  whatsapp: '593987252978',
  instagram: 'https://www.instagram.com/apoagency',
  github: 'kcuadros-07',
  formspreeId: import.meta.env.PUBLIC_FORMSPREE_ID as string | undefined,
  tiktok: import.meta.env.PUBLIC_TIKTOK_URL as string | undefined,
  linkedin: 'https://www.linkedin.com/in/kevincuadros',
  ciudad: m('ciudad'),
  provincia: m('provincia'),
  geo: m('geo').split(',').map(Number) as [number, number], // aproximadas
  horario: m('horario'),
  pixelId: import.meta.env.PUBLIC_META_PIXEL_ID as string | undefined,
};

export const wa = (mensaje: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensaje)}`;

const agendaUrl = import.meta.env.PUBLIC_AGENDA_URL as string | undefined;

// Enlaces de contacto en el idioma de la página. Sin agenda propia (Calendly, etc.) la llamada se pide
// por WhatsApp y el botón no promete una agenda que no existe.
export const links = (d: { wa: { cotizar: string; agendar: string; flotante: string }; hero: { agendaWa: string; agendaUrl: string } }) => ({
  cotizar: wa(d.wa.cotizar),
  agenda: agendaUrl || wa(d.wa.agendar),
  agendaTexto: agendaUrl ? d.hero.agendaUrl : d.hero.agendaWa,
  flotante: wa(d.wa.flotante),
});
