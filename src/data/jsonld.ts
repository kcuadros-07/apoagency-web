// Datos estructurados (schema.org) en un solo @graph. Todo sale de SITE y src/data/metricas.ts.
import { SITE } from '../config';
import { precios } from './metricas';
import type { Lang, ServicioId } from '../i18n';
import { htmlLang } from '../i18n';

export const ID = { org: `${SITE.url}/#organization`, negocio: `${SITE.url}/#negocio`, web: `${SITE.url}/#website`, kevin: `${SITE.url}/#kevin` };
// Fecha real de la compilación: es la fecha de modificación de las páginas generadas.
export const HOY = new Date().toISOString().slice(0, 10);

const redes = [SITE.instagram, SITE.linkedin, SITE.tiktok].filter(Boolean) as string[];
const DIAS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const grafoBase = (lang: Lang, descripcion: string) => [
  {
    '@type': 'Organization',
    '@id': ID.org,
    name: SITE.name,
    url: SITE.url,
    logo: { '@type': 'ImageObject', url: `${SITE.url}/icon-512.png`, width: 512, height: 512 },
    image: `${SITE.url}/icon-512.png`,
    email: SITE.email,
    telephone: SITE.phone,
    sameAs: redes,
    founder: { '@id': ID.kevin },
    areaServed: { '@type': 'Country', name: 'Ecuador' },
    knowsLanguage: ['es', 'en'],
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'customer service', telephone: SITE.phone, url: `https://wa.me/${SITE.whatsapp}`, availableLanguage: ['es', 'en'], areaServed: 'EC' },
      { '@type': 'ContactPoint', contactType: 'sales', email: SITE.email, availableLanguage: ['es', 'en'], areaServed: 'EC' },
    ],
  },
  {
    '@type': 'ProfessionalService',
    '@id': ID.negocio,
    name: SITE.name,
    url: SITE.url,
    description: descripcion,
    image: `${SITE.url}/og.png`,
    logo: `${SITE.url}/icon-512.png`,
    email: SITE.email,
    telephone: SITE.phone,
    priceRange: '$$',
    address: { '@type': 'PostalAddress', addressLocality: SITE.ciudad, addressRegion: SITE.provincia, addressCountry: 'EC' },
    geo: { '@type': 'GeoCoordinates', latitude: SITE.geo[0], longitude: SITE.geo[1] },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DIAS, opens: '09:00', closes: '18:00' }],
    areaServed: { '@type': 'Country', name: 'Ecuador' },
    parentOrganization: { '@id': ID.org },
    founder: { '@id': ID.kevin },
    sameAs: redes,
    knowsAbout: lang === 'es'
      ? ['Diseño web', 'Meta Ads', 'Google Ads', 'Branding', 'Contenido para redes sociales']
      : ['Web design', 'Meta Ads', 'Google Ads', 'Branding', 'Social media content'],
    inLanguage: htmlLang[lang],
  },
  {
    '@type': 'WebSite',
    '@id': ID.web,
    url: SITE.url,
    name: SITE.name,
    inLanguage: ['es-EC', 'en-US'],
    publisher: { '@id': ID.org },
  },
  {
    '@type': 'Person',
    '@id': ID.kevin,
    name: SITE.founder,
    jobTitle: lang === 'es' ? 'Fundador de APO Agency' : 'Founder of APO Agency',
    worksFor: { '@id': ID.org },
    url: SITE.linkedin,
    sameAs: [SITE.linkedin],
  },
];

export const migas = (items: { nombre: string; url: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nombre, item: it.url })),
});

export const faqLd = (items: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
});

// Service con ofertas "desde" (precios de src/data/metricas.ts).
export const servicioLd = (o: { lang: Lang; id: ServicioId; url: string; nombre: string; descripcion: string; opciones: Record<string, string> }) => ({
  '@type': 'Service',
  '@id': `${o.url}#servicio`,
  name: o.nombre,
  description: o.descripcion,
  url: o.url,
  serviceType: o.nombre,
  provider: { '@id': ID.negocio },
  areaServed: { '@type': 'Country', name: 'Ecuador' },
  inLanguage: htmlLang[o.lang],
  offers: Object.entries(precios[o.id]).map(([k, p]) => ({
    '@type': 'Offer',
    name: o.opciones[k],
    url: o.url,
    priceCurrency: 'USD',
    priceSpecification: p.porMes
      ? { '@type': 'UnitPriceSpecification', minPrice: p.desde, priceCurrency: 'USD', unitText: 'MON' }
      : { '@type': 'PriceSpecification', minPrice: p.desde, priceCurrency: 'USD' },
    areaServed: { '@type': 'Country', name: 'Ecuador' },
  })),
});

export const casoLd = (o: { lang: Lang; url: string; nombre: string; titulo: string; descripcion: string; imagen: string; cliente: string }) => ({
  '@type': 'CreativeWork',
  '@id': `${o.url}#caso`,
  name: o.titulo,
  headline: o.titulo,
  description: o.descripcion,
  url: o.url,
  mainEntityOfPage: o.url,
  image: o.imagen,
  inLanguage: htmlLang[o.lang],
  about: { '@type': 'Organization', name: o.cliente },
  author: { '@id': ID.org },
  publisher: { '@id': ID.org },
  isPartOf: { '@id': ID.web },
  dateModified: HOY,
});
