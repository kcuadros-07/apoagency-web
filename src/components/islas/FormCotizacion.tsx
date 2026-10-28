import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Dict } from '../../i18n/es';

type F = Dict['form'];
type Servicio = keyof F['servicios'];
const SERVICIOS: Servicio[] = ['web', 'ads', 'branding', 'contenido'];

export interface PrecioForm {
  desde: number;
  mensual?: number;
  porMes?: boolean;
}

interface Props {
  d: F;
  lang: 'es' | 'en';
  waNumber: string;
  formspreeId?: string;
  privacidadHref: string;
  precios: Record<Servicio, Record<string, PrecioForm>>;
  factor: number; // el techo del rango es "desde" × factor
  pautaDia: string;
  pautaMes: string;
}

interface Error {
  campo: string;
  msg: string;
}

// Número de Ecuador: móvil (9 dígitos que empiezan con 9) o fijo con código de área (2–7 + 7 dígitos).
// Acepta 0987654321, 987654321, +593 98 765 4321, 593987654321, 00593...
export function normalizarEC(raw: string): string | null {
  let n = raw.replace(/[\s\-().]/g, '');
  if (n.startsWith('+593')) n = n.slice(4);
  else if (n.startsWith('00593')) n = n.slice(5);
  else if (n.startsWith('593')) n = n.slice(3);
  else if (n.startsWith('0')) n = n.slice(1);
  if (!/^\d+$/.test(n)) return null;
  if (/^9\d{8}$/.test(n) || /^[2-7]\d{7}$/.test(n)) return '+593' + n;
  return null;
}

const ICONOS: Record<Servicio, ReactNode> = {
  web: <path d="M3 5h18v14H3zM3 9.500h18M6.500 7.200h.01M9 7.200h.01" />,
  ads: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 12h.01" />,
  branding: <path d="M4 20l1-4L16.500 4.500l3 3L8 19ZM14 7l3 3" />,
  contenido: <path d="M4 5h16v14H4zM10 9l5 3-5 3Z" />,
};

const redondear = (n: number) => Math.round(n / 10) * 10;

export default function FormCotizacion({ d, lang, waNumber, formspreeId, privacidadHref, precios, factor, pautaDia, pautaMes }: Props) {
  const uid = useId();
  const [paso, setPaso] = useState(1);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [opcion, setOpcion] = useState<string | null>(null);
  const [presupuesto, setPresupuesto] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [correo, setCorreo] = useState('');
  const [mas, setMas] = useState('');
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Error[]>([]);
  const [enviado, setEnviado] = useState<string | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const errRef = useRef<HTMLDivElement>(null);
  const primeraVez = useRef(true);

  const err = (campo: string) => errores.find((e) => e.campo === campo)?.msg;
  const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

  // Rango estimado en vivo: precio "desde" hasta "desde" × factor, más mantenimiento o pauta si aplica.
  const rango = useMemo(() => {
    if (!servicio || !opcion) return null;
    const p = precios[servicio]?.[opcion];
    if (!p) return null;
    const min = p.desde;
    const max = redondear(min * factor);
    const sufijo = p.porMes ? d.rango.mes : '';
    const mant = p.mensual ? d.rango.mantenimiento.replace('{n}', usd(p.mensual)) : '';
    const pauta = servicio === 'ads' ? d.rango.pauta.replace('{pautaMes}', pautaMes).replace('{pautaDia}', pautaDia) : '';
    return { texto: `${usd(min)}–${usd(max)}${sufijo}`, mant, pauta, lineas: [mant, pauta].filter(Boolean) };
  }, [servicio, opcion, precios, factor, d, pautaDia, pautaMes]);

  // Al cambiar de paso, el foco va al título del paso (lectores de pantalla y teclado).
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    tituloRef.current?.focus();
  }, [paso, enviado]);
  useEffect(() => {
    if (errores.length) errRef.current?.focus();
  }, [errores]);

  const validar = (p: number): Error[] => {
    const e: Error[] = [];
    if (p === 1 && !servicio) e.push({ campo: 'servicio', msg: d.errores.servicio });
    if (p === 2 && servicio) {
      if (!opcion) e.push({ campo: 'opcion', msg: d.errores.pregunta.replace('{q}', d.tipoQ[servicio]) });
      if (!presupuesto) e.push({ campo: 'presupuesto', msg: d.errores.pregunta.replace('{q}', d.presupuestoQ) });
    }
    if (p === 3) {
      if (nombre.trim().length < 2) e.push({ campo: 'nombre', msg: d.errores.nombre });
      if (!normalizarEC(wa)) e.push({ campo: 'wa', msg: d.errores.whatsapp });
      if (correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim())) e.push({ campo: 'correo', msg: d.errores.correo });
      if (!acepto) e.push({ campo: 'acepto', msg: d.errores.privacidad });
    }
    return e;
  };

  const siguiente = () => {
    const e = validar(paso);
    setErrores(e);
    if (!e.length) setPaso(paso + 1);
  };

  const elegirServicio = (s: Servicio) => {
    if (s !== servicio) setOpcion(null);
    setServicio(s);
    setErrores([]);
  };

  const construirMensaje = (tel: string) => {
    const M = d.mensaje;
    const s = servicio!;
    const l = [M.saludo.replace('{nombre}', nombre.trim()), '', `${M.servicio}: ${d.servicios[s]}`];
    l.push(`${d.tipoQ[s]}: ${d.opciones[s][opcion! as never]}`);
    l.push(`${M.presupuesto}: ${presupuesto}`);
    if (rango) l.push(`${M.rango}: ${[rango.texto, rango.mant].filter(Boolean).join(' ')}`);
    l.push(`${M.mi}: ${tel}`);
    if (correo.trim()) l.push(`${M.correo}: ${correo.trim()}`);
    if (mas.trim()) l.push('', `${M.mas}: ${mas.trim()}`);
    l.push('', M.cierre);
    return l.join('\n');
  };

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    if (paso < 3) return siguiente();
    const e = [...validar(1), ...validar(2), ...validar(3)];
    setErrores(e);
    if (e.length) {
      const primero = e[0].campo;
      if (primero === 'servicio') setPaso(1);
      else if (primero === 'opcion' || primero === 'presupuesto') setPaso(2);
      return;
    }
    const tel = normalizarEC(wa)!;
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(construirMensaje(tel))}`;
    window.open(url, '_blank', 'noopener'); // dentro del clic: el navegador no lo bloquea
    if (formspreeId) {
      fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicio, opcion, presupuesto, rango: rango?.texto, nombre: nombre.trim(), whatsapp: tel, correo: correo.trim(), mensaje: mas.trim(), idioma: lang }),
      }).catch(() => {});
    }
    setEnviado(url);
  };

  const reiniciar = () => {
    setPaso(1); setServicio(null); setOpcion(null); setPresupuesto(null); setNombre(''); setWa(''); setCorreo(''); setMas(''); setAcepto(false); setErrores([]); setEnviado(null);
  };

  const textoPaso = d.paso.replace('{n}', String(paso)).replace('{total}', '3');
  const opciones = servicio ? Object.keys(d.opciones[servicio]) : [];

  const panelRango = (
    <aside className="f-lado" aria-label={d.rango.titulo}>
      <div className="f-recibes">
        <h3>{d.recibes.titulo}</h3>
        <ul>
          {d.recibes.items.map((i) => (
            <li key={i}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" aria-hidden="true"><path d="M4 13l5 5L20 6" /></svg>
              {i}
            </li>
          ))}
        </ul>
      </div>
      <div className="f-rango" aria-live="polite" data-rango>
        <p className="f-rango-t">{d.rango.titulo}</p>
        {rango ? (
          <>
            <p className="f-rango-v">{rango.texto}</p>
            {rango.lineas.map((l) => <p key={l} className="f-rango-l">{l}</p>)}
          </>
        ) : (
          <p className="f-rango-l">{d.rango.vacio}</p>
        )}
        <p className="f-rango-n">{d.rango.nota}</p>
      </div>
    </aside>
  );

  if (enviado) {
    return (
      <div className="cot-grid">
        <div className="f-caja papel f-papel" role="status">
          <h3 ref={tituloRef} tabIndex={-1} className="text-h1">{d.ok.titulo}</h3>
          <p className="mt-space-4 text-ink-muted">{d.ok.texto}</p>
          <div className="mt-space-4 flex flex-wrap gap-space-2">
            <a href={enviado} target="_blank" rel="noopener" className="btn btn-primary">{d.ok.boton}</a>
            <button type="button" onClick={reiniciar} className="btn btn-ghost">{d.ok.otra}</button>
          </div>
        </div>
        {panelRango}
      </div>
    );
  }

  return (
    <div className="cot-grid">
      <form onSubmit={enviar} noValidate className="f-caja papel f-papel" aria-labelledby={`${uid}-paso`} data-form-cotizacion>
        <div className="f-progreso" role="progressbar" aria-label={d.progreso} aria-valuemin={1} aria-valuemax={3} aria-valuenow={paso} aria-valuetext={textoPaso}>
          {[1, 2, 3].map((n) => <i key={n} className={n <= paso ? 'on' : ''} />)}
        </div>
        <p id={`${uid}-paso`} className="f-paso">
          <span>{textoPaso}</span> <b>{d.pasosNombres[paso - 1]}</b>
        </p>

        {errores.length > 0 && (
          <div ref={errRef} tabIndex={-1} role="alert" className="f-errores">
            <p className="font-bold">{d.errores.resumen}</p>
            <ul>
              {errores.map((e) => (
                <li key={e.campo}><a href={`#${uid}-${e.campo}`} onClick={() => setTimeout(() => document.getElementById(`${uid}-${e.campo}`)?.focus(), 0)}>{e.msg}</a></li>
              ))}
            </ul>
          </div>
        )}

        {paso === 1 && (
          <fieldset aria-describedby={err('servicio') ? `${uid}-servicio-e` : undefined}>
            <legend><h3 ref={tituloRef} tabIndex={-1} className="text-h2">{d.q1}</h3></legend>
            <div className="f-chips f-chips-grandes" role="radiogroup">
              {SERVICIOS.map((s, i) => (
                <label key={s} className="chip chip-grande">
                  <input type="radio" name="servicio" value={s} checked={servicio === s} onChange={() => elegirServicio(s)} id={i === 0 ? `${uid}-servicio` : undefined} aria-invalid={err('servicio') ? true : undefined} />
                  <span>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">{ICONOS[s]}</svg>
                    {d.servicios[s]}
                  </span>
                </label>
              ))}
            </div>
            {err('servicio') && <p id={`${uid}-servicio-e`} className="f-error">{err('servicio')}</p>}
            <div aria-live="polite">
              {servicio && (
                <aside className="f-reco">
                  <p className="f-reco-t">{d.recomienda}</p>
                  <p>{d.reco[servicio]}</p>
                </aside>
              )}
            </div>
          </fieldset>
        )}

        {paso === 2 && servicio && (
          <div>
            <h3 ref={tituloRef} tabIndex={-1} className="text-h2">{d.servicios[servicio]}</h3>
            <fieldset className="mt-space-4" aria-describedby={err('opcion') ? `${uid}-opcion-e` : undefined}>
              <legend className="font-bold">{d.tipoQ[servicio]}</legend>
              <div className="f-chips f-chips-grandes" role="radiogroup">
                {opciones.map((o, i) => {
                  const p = precios[servicio][o];
                  return (
                    <label key={o} className="chip chip-grande">
                      <input type="radio" name="opcion" value={o} checked={opcion === o} onChange={() => { setOpcion(o); setErrores([]); }} id={i === 0 ? `${uid}-opcion` : undefined} aria-invalid={err('opcion') ? true : undefined} />
                      <span className="chip-con-icono">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">{ICONOS[servicio]}</svg>
                        <span className="chip-doble">
                          <b>{(d.opciones[servicio] as Record<string, string>)[o]}</b>
                          <small>{d.desde} {usd(p.desde)}{p.porMes ? d.rango.mes : ''}</small>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {err('opcion') && <p id={`${uid}-opcion-e`} className="f-error">{err('opcion')}</p>}
            </fieldset>
            <fieldset className="mt-space-4" aria-describedby={err('presupuesto') ? `${uid}-presupuesto-e` : undefined}>
              <legend className="font-bold">{d.presupuestoQ}</legend>
              <div className="f-chips" role="radiogroup">
                {d.presupuesto.map((o, i) => (
                  <label key={o} className="chip">
                    <input type="radio" name="presupuesto" value={o} checked={presupuesto === o} onChange={() => { setPresupuesto(o); setErrores([]); }} id={i === 0 ? `${uid}-presupuesto` : undefined} aria-invalid={err('presupuesto') ? true : undefined} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              {err('presupuesto') && <p id={`${uid}-presupuesto-e`} className="f-error">{err('presupuesto')}</p>}
            </fieldset>
          </div>
        )}

        {paso === 3 && (
          <div>
            <h3 ref={tituloRef} tabIndex={-1} className="text-h2">{d.pasosNombres[2]}</h3>
            <div className="mt-space-4">
              <label htmlFor={`${uid}-nombre`} className="f-label">{d.nombre}</label>
              <input id={`${uid}-nombre`} className="f-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={err('nombre') ? true : undefined} aria-describedby={err('nombre') ? `${uid}-nombre-e` : undefined} />
              {err('nombre') && <p id={`${uid}-nombre-e`} className="f-error">{err('nombre')}</p>}
            </div>
            <div className="mt-space-4">
              <label htmlFor={`${uid}-wa`} className="f-label">{d.whatsapp}</label>
              <input id={`${uid}-wa`} className="f-input" type="tel" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} autoComplete="tel" placeholder="+593 98 765 4321" aria-invalid={err('wa') ? true : undefined} aria-describedby={`${uid}-wa-h${err('wa') ? ` ${uid}-wa-e` : ''}`} />
              <p id={`${uid}-wa-h`} className="f-ayuda">{d.whatsappAyuda}</p>
              {err('wa') && <p id={`${uid}-wa-e`} className="f-error">{err('wa')}</p>}
            </div>
            <div className="mt-space-4">
              <label htmlFor={`${uid}-correo`} className="f-label">{d.correo}</label>
              <input id={`${uid}-correo`} className="f-input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" aria-invalid={err('correo') ? true : undefined} aria-describedby={err('correo') ? `${uid}-correo-e` : undefined} />
              {err('correo') && <p id={`${uid}-correo-e`} className="f-error">{err('correo')}</p>}
            </div>
            <div className="mt-space-4">
              <label htmlFor={`${uid}-mas`} className="f-label">{d.mas}</label>
              <textarea id={`${uid}-mas`} className="f-input" rows={3} value={mas} onChange={(e) => setMas(e.target.value)} />
            </div>
            <div className="mt-space-4">
              <label className="f-check">
                <input type="checkbox" id={`${uid}-acepto`} checked={acepto} onChange={(e) => setAcepto(e.target.checked)} aria-invalid={err('acepto') ? true : undefined} aria-describedby={err('acepto') ? `${uid}-acepto-e` : undefined} />
                <span>{d.privacidadPre} <a href={privacidadHref} target="_blank" rel="noopener">{d.privacidadLink}</a></span>
              </label>
              {err('acepto') && <p id={`${uid}-acepto-e`} className="f-error">{err('acepto')}</p>}
            </div>
          </div>
        )}

        <div className="mt-space-8 flex flex-wrap gap-space-2">
          {paso > 1 && <button type="button" className="btn btn-ghost" onClick={() => { setErrores([]); setPaso(paso - 1); }}>{d.atras}</button>}
          {paso < 3 ? (
            <button type="button" className="btn btn-primary" onClick={siguiente}>{d.siguiente}</button>
          ) : (
            <button type="submit" className="btn btn-primary">{d.enviar}</button>
          )}
        </div>
      </form>
      {panelRango}
    </div>
  );
}
