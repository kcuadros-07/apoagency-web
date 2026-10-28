import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const bi = z.object({ es: z.string(), en: z.string() });

// Casos de éxito. Para agregar uno: crea un .json en src/content/casos/. Las cifras se referencian por id de src/data/metricas.ts.
const casos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/casos' }),
  schema: z.object({
    orden: z.number(),
    cliente: z.string(),
    url: z.string(),
    sector: bi,
    ciudad: z.string().optional(), // id de src/data/metricas.ts (solo si es un dato aprobado)
    servicio: bi,
    metrica: z.string(), // id de src/data/metricas.ts
    etiqueta: bi,
    extra: z.array(z.object({ id: z.string(), etiqueta: bi })).default([]),
    problema: bi,
    queHizo: bi,
    resultado: bi,
    captura: z.string().optional(), // nombre en src/assets/capturas/ o "mock-buscacasa"
    destacado: z.boolean().default(false), // en vez de testimonio: bloque "Lo que logramos" en voz de APO
  }),
});

// Proyectos del Finder. Los de branding y contenido son de ejemplo (ver src/data/metricas.ts: proyectosFinder).
const proyectos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/proyectos' }),
  schema: z.object({
    orden: z.number(),
    nombre: z.string(),
    cliente: z.string(),
    categoria: z.enum(['webs', 'campanas', 'branding', 'contenido']),
    servicio: bi,
    anio: z.string().optional(),
    url: z.string().optional(),
    captura: z.string().optional(),
    mock: z.string().optional(), // solo "portal" (BuscaCasa, sin captura)
    desc: bi,
  }),
});

// Páginas legales: src/content/legal/<idioma>/<slug>.md
const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({ titulo: z.string(), descripcion: z.string(), fecha: z.string() }),
});

// Testimonios: un .json por testimonio en src/content/testimonios/ (sin tocar código). Si no hay ninguno, la sección se oculta.
const testimonios = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/testimonios' }),
  schema: z.object({
    orden: z.number(),
    autor: z.string(),
    cargo: bi,
    empresa: z.string(),
    logo: z.string().optional(), // nombre en src/assets/clientes/
    cita: bi,
  }),
});

export const collections = { casos, proyectos, testimonios, legal };
