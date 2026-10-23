import { useEffect, useState } from 'react';

/** Tema de la interfaz. Se guarda por navegador (es una preferencia personal). */
export type Tema = 'claro' | 'oscuro' | 'sistema';
const KEY = '1607-tema';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export const leerTema = (): Tema => {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'claro' || t === 'oscuro' || t === 'sistema') return t;
  } catch {}
  return 'sistema';
};

export const resolverTema = (t: Tema): 'claro' | 'oscuro' => (t === 'sistema' ? (media().matches ? 'oscuro' : 'claro') : t);

export function aplicarTema(t: Tema, animar = false) {
  const html = document.documentElement;
  if (animar) {
    html.classList.add('theme-anim');
    window.setTimeout(() => html.classList.remove('theme-anim'), 320);
  }
  const oscuro = resolverTema(t) === 'oscuro';
  html.dataset.theme = oscuro ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#121211' : '#FAFAF6');
}

const oyentes = new Set<(t: Tema) => void>();

export function guardarTema(t: Tema) {
  try { localStorage.setItem(KEY, t); } catch {}
  aplicarTema(t, true);
  oyentes.forEach((f) => f(t));
}

/** Tema elegido + el que se ve realmente (resuelve "sistema") */
export function useTema() {
  const [tema, setTema] = useState<Tema>(leerTema);
  const [efectivo, setEfectivo] = useState(() => resolverTema(leerTema()));
  useEffect(() => {
    const f = (t: Tema) => { setTema(t); setEfectivo(resolverTema(t)); };
    oyentes.add(f);
    const m = media();
    const alCambiarSistema = () => { if (leerTema() === 'sistema') { aplicarTema('sistema', true); setEfectivo(resolverTema('sistema')); } };
    m.addEventListener('change', alCambiarSistema);
    return () => { oyentes.delete(f); m.removeEventListener('change', alCambiarSistema); };
  }, []);
  return { tema, efectivo, setTema: guardarTema };
}
