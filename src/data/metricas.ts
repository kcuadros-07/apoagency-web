// ÚNICA fuente de cifras y datos de ejemplo de la web. Nada de números sueltos en los componentes.
// verificado: false = todavía no está aprobado para publicar. `npm run build` FALLA mientras haya alguno en false
// (scripts/verificar-metricas.mjs). En desarrollo solo avisa. Para publicar: confirma el dato, ajusta `fuente` y pon true.

export interface Metrica {
  valor: string;
  fuente: string;
  verificado: boolean;
}

const PORTFOLIO = 'Portfolio del sitio anterior (apoagency.io); Kevin Cuadros lo aprobó para publicar el 2026-10-28.';
const port = (valor: string, que: string): Metrica => ({ valor, fuente: `${PORTFOLIO} (${que})`, verificado: true });
const maqueta: Metrica = { valor: '', fuente: 'Maqueta ilustrativa rotulada como ejemplo en la página.', verificado: true };
const m_ = (valor: string): Metrica => ({ ...maqueta, valor });

export const metricas = {
  // --- Casos de éxito (portfolio anterior) ---
  buscacasaTrafico: port('+180%', 'BuscaCasa, tráfico'),
  buscacasaPropiedades: port('+2,000', 'BuscaCasa, propiedades publicadas'),
  interhomeConversiones: port('+310%', 'Interhome, conversiones'),
  interhomeCpl: port('$1.20', 'Interhome, costo por lead'),
  interhomeRoas: port('320%', 'Interhome, ROAS'),
  flexmanLeads: port('+220%', 'Flexman, leads'),
  tecgloSuscriptores: port('+180%', 'TECglo, suscriptores'),
  xtrimLeads: port('+95%', 'Xtrim, leads'),
  dataprivacyInscritos: port('800+', 'Data Privacy Sunset, inscritos'),

  // --- Casos: textos y datos aprobados por Kevin ---
  redaccionCasos: { valor: 'Textos Problema / Qué hizo APO / Resultado de los 6 casos', fuente: 'Redactados a partir del portfolio; Kevin Cuadros los aprobó para publicar el 2026-10-28.', verificado: true },
  ciudadDataprivacy: { valor: 'Guayaquil', fuente: 'Portfolio del sitio anterior: "Congreso · Guayaquil".', verificado: true },

  // --- Compromisos y testimonio publicados (dados por Kevin; los textos viven en src/i18n y src/content) ---
  respuesta24h: { valor: '24 h', fuente: 'Compromiso de respuesta indicado por Kevin Cuadros para el formulario y Hablemos.', verificado: true },
  llamadaDiagnostico: { valor: '30–45 min', fuente: 'Duración de la llamada de diagnóstico, según el sitio anterior y Kevin.', verificado: true },
  anticipos: { valor: '50/50 web, 70/30 tienda', fuente: 'Forma de pago indicada por Kevin en el brief; está en los Términos y en las FAQ.', verificado: true },
  testimonioInterhome: { valor: 'Andrés Morales, CEO de Interhome Ecuador', fuente: 'Cita copiada palabra por palabra de apoagency.io; Kevin pidió publicarla (src/content/testimonios/interhome.json).', verificado: true },

  // --- Datos del negocio para SEO y Google Business (dados por Kevin el 2026-10-28) ---
  ciudad: { valor: 'Guayaquil', fuente: 'Kevin Cuadros confirmó que APO opera desde Guayaquil.', verificado: true },
  provincia: { valor: 'Guayas', fuente: 'Provincia de Guayaquil.', verificado: true },
  geo: { valor: '-2.1894,-79.8891', fuente: 'Coordenadas APROXIMADAS del centro de Guayaquil (no es una dirección exacta).', verificado: true },
  horario: { valor: 'Lun–Vie 9:00–18:00', fuente: 'Horario indicado por Kevin Cuadros para el SEO y Google Business.', verificado: true },

  // --- Datos propios de APO dados por Kevin ---
  plazoWeb: { valor: '15–20', fuente: 'Brief del proyecto (días hábiles, web).', verificado: true },
  plazoTienda: { valor: '10–15', fuente: 'Brief del proyecto (días hábiles, tienda).', verificado: true },
  pautaDiaria: { valor: '$5–$10', fuente: 'Dado por Kevin: pauta recomendada mínima por día.', verificado: true },
  pautaMensual: { valor: '$150–$300', fuente: 'Dado por Kevin: pauta recomendada mínima por mes.', verificado: true },
  factorRango: { valor: '1.6', fuente: 'Regla de cálculo del "rango estimado" (el techo es el precio "desde" × 1.6). No es una promesa de precio: la web aclara "Precio referencial".', verificado: true },

  // --- Maqueta de la tarjeta de Ads del hero y de "Qué hago": ilustración rotulada "Ejemplo" ---
  ejemploLeads: m_('120'), ejemploCostoPorLead: m_('$2.00'), ejemploGasto: m_('$240'),
  ejemploLeads2: m_('85'), ejemploCostoPorLead2: m_('$2.40'), ejemploGasto2: m_('$204'),
  ejemploLeads3: m_('64'), ejemploCostoPorLead3: m_('$2.50'), ejemploGasto3: m_('$160'),
} satisfies Record<string, Metrica>;

// Precios referenciales en USD para Ecuador ("desde"). Los dio Kevin: están verificados.
export interface Precio {
  desde: number;
  mensual?: number; // costo mensual adicional (mantenimiento)
  porMes?: boolean; // el "desde" ya es mensual
  verificado: boolean;
  fuente: string;
}
const kevin = (desde: number, extra: Partial<Precio> = {}): Precio => ({ desde, verificado: true, fuente: 'Precio referencial dado por Kevin Cuadros para Ecuador.', ...extra });

export const precios = {
  web: { landing: kevin(250), corporativo: kevin(450, { mensual: 60 }), tienda: kevin(580, { mensual: 80 }) },
  ads: { meta: kevin(180, { porMes: true }), google: kevin(200, { porMes: true }), ambas: kevin(320, { porMes: true }) },
  branding: { logo: kevin(150), rediseno: kevin(200), identidad: kevin(450) },
  contenido: { carruseles: kevin(140), video: kevin(120), plan: kevin(320, { porMes: true }) },
} satisfies Record<string, Record<string, Precio>>;

export type MetricaId = keyof typeof metricas;
export const m = (id: MetricaId) => metricas[id].valor;
// El precio de entrada de la web es la landing page.
export const precioWebDesde = `$${precios.web.landing.desde}`;

const todas = (): [string, { valor?: string | number; fuente: string; verificado: boolean }][] => [
  ...(Object.entries(metricas) as [string, Metrica][]),
  ...Object.entries(precios).flatMap(([g, o]) => Object.entries(o).map(([k, p]) => [`precios.${g}.${k}`, { ...p, valor: p.desde }] as [string, Precio & { valor: number }])),
];

export const total = () => todas().length;
export const pendientes = () => todas().filter(([, x]) => !x.verificado).map(([id, x]) => ({ id, valor: String(x.valor ?? ''), fuente: x.fuente }));

// En desarrollo: solo un aviso.
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && pendientes().length) {
  console.warn(`\n[métricas] ${pendientes().length} dato(s) sin verificar (src/data/metricas.ts): ${pendientes().map((p) => p.id).join(', ')}\n`);
}
