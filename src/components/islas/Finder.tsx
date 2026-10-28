import { useMemo, useRef, useState } from 'react';
import type { Dict } from '../../i18n/es';

type D = Dict['finder'];
type Cat = 'todos' | 'webs' | 'campanas' | 'branding' | 'contenido';
export interface Proyecto {
  id: string;
  nombre: string;
  cliente: string;
  categoria: Exclude<Cat, 'todos'>;
  servicio: string;
  anio?: string;
  url?: string;
  desc: string;
  img?: { thumb: string; big: string; w: number; h: number };
  mock?: string;
}

const FLECHA = 'M7 17L17 7M8.500 7H17v8.500';
const CARPETAS: Exclude<Cat, 'todos'>[] = ['webs', 'campanas', 'branding', 'contenido'];

// Mockups HTML de los proyectos sin captura (BuscaCasa y los de ejemplo).
function Mock({ k, grande }: { k?: string; grande?: boolean }) {
  const c = grande ? 'fm fm-g' : 'fm';
  if (k === 'portal')
    return (
      <div className={`${c} fm-portal`} aria-hidden="true">
        <b>Busca tu hogar ideal</b>
        <span className="fm-barra"><i /><i /><u /></span>
        <span className="fm-props"><i /><i /><i /></span>
      </div>
    );
  if (k === 'branding-altura')
    return (
      <div className={`${c} fm-altura`} aria-hidden="true">
        <b>altura</b><small>café de especialidad</small>
        <span className="fm-muestras"><i /><i /><i /><i /></span>
      </div>
    );
  if (k === 'branding-nova')
    return (
      <div className={`${c} fm-nova`} aria-hidden="true">
        <b>nova<i>+</i></b><small>dental</small>
      </div>
    );
  if (k === 'video-altura')
    return (
      <div className={`${c} fm-video`} aria-hidden="true">
        <span className="fm-play"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8Z" /></svg></span>
        <b>altura</b>
        <span className="fm-prog"><i /></span>
      </div>
    );
  return <div className={c} aria-hidden="true" />;
}

function Miniatura({ p, grande }: { p: Proyecto; grande?: boolean }) {
  if (p.img) return <img src={grande ? p.img.big : p.img.thumb} width={p.img.w} height={p.img.h} alt="" loading="lazy" className={grande ? 'fm-img fm-g' : 'fm-img'} />;
  return <Mock k={p.mock} grande={grande} />;
}

export default function Finder({ d, proyectos }: { d: D; proyectos: Proyecto[] }) {
  const [cat, setCat] = useState<Cat>('todos');
  const [sel, setSel] = useState<string>(proyectos[0]?.id);
  const prevRef = useRef<HTMLElement>(null);
  const elegir = (id: string) => {
    setSel(id);
    // En pantallas chicas el panel queda abajo: se lleva a la vista para dar feedback al tocar.
    if (window.matchMedia('(max-width: 899px)').matches) requestAnimationFrame(() => prevRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }));
  };
  const lista = useMemo(() => (cat === 'todos' ? proyectos : proyectos.filter((p) => p.categoria === cat)), [cat, proyectos]);
  const actual = lista.find((p) => p.id === sel) ?? lista[0];
  const n = (c: Cat) => (c === 'todos' ? proyectos.length : proyectos.filter((p) => p.categoria === c).length);
  const nombreCarpeta = (c: Cat) => (c === 'todos' ? d.todos : d.folders[c]);

  const elegirCarpeta = (c: Cat) => {
    setCat(c);
    const primero = (c === 'todos' ? proyectos : proyectos.filter((p) => p.categoria === c))[0];
    if (primero) setSel(primero.id);
  };

  return (
    <div className="finder scope-dark" role="group" aria-label={d.ventana}>
      <div className="finder-barra">
        <span className="puntos" aria-hidden="true"><i /><i /><i /></span>
        <span className="finder-titulo">{d.ventana}</span>
        <span />
      </div>

      <div className="finder-cuerpo">
        <nav className="finder-lado" aria-label={d.sidebarAria}>
          <p className="finder-sec">{d.favoritos}</p>
          <button type="button" aria-pressed={cat === 'todos'} onClick={() => elegirCarpeta('todos')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true"><path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z" /></svg>
            <span>{d.todos}</span><em>{n('todos')}</em>
          </button>
          <p className="finder-sec">{d.carpetas}</p>
          {CARPETAS.map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => elegirCarpeta(c)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true"><path d="M3 6h7l2 2h9v11H3z" /></svg>
              <span>{d.folders[c]}</span><em>{n(c)}</em>
            </button>
          ))}
        </nav>

        <div className="finder-main">
          <p className="finder-cab"><b>{nombreCarpeta(cat)}</b><span>{d.elementos.replace('{n}', String(lista.length))}</span></p>
          <ul className="finder-grid" aria-label={d.listaAria}>
            {lista.map((p) => (
              <li key={p.id}>
                <button type="button" className="finder-item" aria-pressed={actual?.id === p.id} onClick={() => elegir(p.id)}>
                  <span className="finder-mini"><Miniatura p={p} /></span>
                  <span className="finder-nombre">{p.nombre}</span>
                  <span className="finder-sub">{p.servicio}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {actual && (
          <aside ref={prevRef} className="finder-prev" aria-label={d.previewAria} aria-live="polite">
            <div className="finder-prev-img"><Miniatura p={actual} grande /></div>
            <h3>{actual.nombre}</h3>
            <p className="finder-desc">{actual.desc}</p>
            <dl>
              <div><dt>{d.cliente}</dt><dd>{actual.cliente}</dd></div>
              <div><dt>{d.servicio}</dt><dd>{actual.servicio}</dd></div>
              {actual.anio && <div><dt>{d.anio}</dt><dd>{actual.anio}</dd></div>}
            </dl>
            {actual.url ? (
              <a className="pildora finder-boton" href={actual.url} target="_blank" rel="noopener">{d.verSitio}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden="true"><path d={FLECHA} /></svg>
              </a>
            ) : (
              <>
                <p className="finder-ej">{d.ejemplo}</p>
                <a className="pildora finder-boton" href="#cotizar">{d.quieroAlgo}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden="true"><path d={FLECHA} /></svg>
                </a>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
