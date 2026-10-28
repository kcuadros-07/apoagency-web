// Smooth scroll (Lenis, solo con mouse/trackpad: en táctil se usa el scroll nativo) + revelados por IntersectionObserver.
// Sin GSAP: los revelados son CSS (transform + opacity) y se disparan una sola vez.
import Lenis from 'lenis';

// content-visibility:auto usa alturas estimadas en secciones aún no pintadas. Antes de un salto por ancla se
// desactiva, para que el scroll mida alturas reales. Va ANTES de crear Lenis: los listeners de captura de
// window corren en orden de registro, y el de Lenis debe leer ya las alturas reales.
let lenis: Lenis | undefined;
window.addEventListener(
  'click',
  (e) => {
    if ((e.target as Element).closest('a[href^="#"]')) {
      document.documentElement.classList.add('cv-off');
      lenis?.resize(); // el límite de scroll de Lenis se medía con alturas estimadas: se recalcula ya
    }
  },
  true,
);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(pointer: fine)').matches;

if (!reduce && fine) {
  lenis = new Lenis({ lerp: 0.1, anchors: true }); // el desplazamiento bajo la barra lo da scroll-margin-top
  const raf = (t: number) => {
    lenis!.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// Grupos: los hijos entran escalonados (60–80ms), máximo 6 por grupo.
document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((g) => {
  [...g.children].slice(0, 6).forEach((c, i) => {
    const el = c as HTMLElement;
    el.dataset.reveal ||= g.dataset.stagger || 'si';
    el.style.setProperty('--i', String(i));
  });
});

const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (reduce || !('IntersectionObserver' in window)) {
  items.forEach((el) => el.classList.add('visto'));
} else {
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).classList.add('visto');
        io.unobserve(e.target); // una sola vez
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  items.forEach((el) => io.observe(el));
}
