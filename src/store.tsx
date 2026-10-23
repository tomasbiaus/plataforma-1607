import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import {
  CLIENTES, EQUIPO, ETAPAS, HOY, fecha, hace, esAdmin, adminId, slug,
  type Proyecto, type Tarea, type EstadoEntrega, type EstadoTarea, type Pago, type CobroExtra, type PagoEquipo, type Entrega,
} from './data';
import { PLANES, tareasDePlantilla, type Plan } from './plantilla';

export type Sesion = { tipo: 'estudio'; persona: string } | { tipo: 'cliente'; proyecto: string } | null;

export type Automatizacion = { id: string; cuando: string; entonces: string; activa: boolean };
const TEXTOS_AUTO: Record<string, { cuando: string; entonces: string }> = {
  concepto: { cuando: 'El cliente aprueba o elige un concepto', entonces: 'El proyecto pasa a Diseño, se archiva el otro concepto, se crea la tarea para arrancar el sistema visual y te queda (solo a vos) la tarea de cobrar la segunda cuota.' },
  cambios: { cuando: 'El cliente pide cambios en una entrega', entonces: 'Se crea una tarea de prioridad alta para diseño, con el comentario del cliente en las notas y 2 días de plazo.' },
  etapa: { cuando: 'Se terminan todas las tareas de la etapa actual', entonces: 'El proyecto avanza solo a la etapa siguiente y el cliente lo ve en su portal.' },
  saldo: { cuando: 'Un proyecto llega a Entrega', entonces: 'Te crea (solo a vos) la tarea de cobrar el saldo antes de mandar los archivos finales.' },
};

export type NuevoProyecto = { cliente: string; plan: Plan; inicio: string; email: string; diseno: string; clave?: string };
export type NumerosEstado = { tiene_clave: boolean; abierto: boolean } | null;
export type Ajustes = { pct_equipo: number; plan_anual: Record<string, any> };

type Store = {
  listo: boolean;
  error: string | null;
  proyectos: Proyecto[];
  tareas: Tarea[];
  sesion: Sesion;
  email: string | null;
  entrar: (email: string, clave: string) => Promise<string | null>;
  salir: () => Promise<void>;
  /** true cuando la persona entró desde el mail de "olvidé mi contraseña" */
  recuperando: boolean;
  cambiarClave: (nueva: string, actual?: string) => Promise<string | null>;
  pedirRecuperacion: (email: string) => Promise<string | null>;
  terminarRecuperacion: () => void;
  setSesion: (s: Sesion) => void;
  recargar: () => Promise<void>;
  setEstadoEntrega: (pid: string, eid: string, estado: EstadoEntrega, feedback?: { autor: string; texto: string }) => Promise<void>;
  subirArchivo: (pid: string, eid: string, file: File) => Promise<void>;
  urlArchivo: (path: string) => Promise<string | null>;
  toggleTarea: (tid: string) => void;
  setEstadoTarea: (tid: string, e: EstadoTarea) => void;
  agregarTarea: (t: Omit<Tarea, 'id'>) => Promise<void>;
  actualizarTarea: (tid: string, patch: Partial<Tarea>, log?: string) => void;
  avanzarEtapa: (pid: string, dir: 1 | -1) => Promise<void>;
  tareaAbierta: string | null;
  abrirTarea: (id: string | null) => void;
  crearProyecto: (n: NuevoProyecto) => Promise<string>;
  autos: Automatizacion[];
  toggleAuto: (id: string) => void;
  autoLog: { texto: string; cuando: string }[];
  avisos: { id: number; texto: string }[];
  // Números
  numeros: NumerosEstado;
  numerosCrear: (clave: string) => Promise<string | null>;
  numerosAbrir: (clave: string) => Promise<string | null>;
  numerosCerrar: () => Promise<void>;
  numerosCambiar: (actual: string, nueva: string) => Promise<string | null>;
  cobrosExtra: CobroExtra[];
  marcarCobroExtra: (id: string) => Promise<void>;
  marcarPagado: (pid: string, pagoId: string) => Promise<void>;
  pagosEquipo: PagoEquipo[];
  actualizarPagoEquipo: (id: string, patch: Partial<PagoEquipo>) => void;
  ajustes: Ajustes;
  guardarAjustes: (patch: Partial<Ajustes>) => void;
};

const Ctx = createContext<Store>(null as any);

// El link de recuperación llega con #...type=recovery; lo miramos antes de que Supabase limpie la URL
const VIENE_DE_RECUPERACION = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash);

const errorClave = (m: string) =>
  /different from the old/i.test(m) ? 'La nueva contraseña tiene que ser distinta a la actual.'
  : /at least|characters|weak/i.test(m) ? 'Elegí una contraseña más segura: al menos 8 caracteres, mezclando letras y números.'
  : /rate limit|seconds/i.test(m) ? 'Esperá un minuto antes de volver a intentar.'
  : m;
export const useStore = () => useContext(Ctx);

/** Tareas que puede ver quien está logueado (la base ya filtra las privadas) */
export const useTareas = () => {
  const { tareas, sesion } = useStore();
  const yo = sesion?.tipo === 'estudio' ? sesion.persona : null;
  return tareas.filter((t) => !t.privada || esAdmin(yo));
};

const COLORES = ['#B5651D', '#2F7F7A', '#7A4FA0', '#B04A5A', '#5B7C2E', '#3C6E9E'];
const quienDe = (tipo: string, quien: string | null) => (tipo === 'auto' ? 'auto' : tipo === 'cliente' ? 'cliente' : quien ?? 'auto');

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [recuperando, setRecuperando] = useState(VIENE_DE_RECUPERACION);
  const [error, setError] = useState<string | null>(null);
  const [sesion, setSesion] = useState<Sesion>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [tareaAbierta, abrirTarea] = useState<string | null>(null);
  const [autos, setAutos] = useState<Automatizacion[]>([]);
  const [autoLog, setAutoLog] = useState<{ texto: string; cuando: string }[]>([]);
  const [avisos, setAvisos] = useState<{ id: number; texto: string }[]>([]);
  const [numeros, setNumeros] = useState<NumerosEstado>(null);
  const [cuotas, setCuotas] = useState<(Pago & { proyecto: string })[]>([]);
  const [cobrosExtra, setCobrosExtra] = useState<CobroExtra[]>([]);
  const [pagosEquipo, setPagosEquipo] = useState<PagoEquipo[]>([]);
  const [ajustes, setAjustes] = useState<Ajustes>({ pct_equipo: 25, plan_anual: {} });
  const ultimoAuto = useRef<string | null>(null);
  const timers = useRef<Record<string, any>>({});

  const debounce = (key: string, fn: () => void, ms = 600) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  };
  const avisar = (texto: string) => setAvisos((a) => [...a, { id: Date.now() + Math.random(), texto }]);
  const fallo = (e: any) => {
    console.error(e);
    avisar('No se pudo guardar: ' + (e?.message ?? 'error de conexión'));
  };

  /* ---------- carga ---------- */
  const cargarNumeros = useCallback(async () => {
    const [c, x, pe, aj] = await Promise.all([
      supabase.from('cuotas').select('*').order('orden'),
      supabase.from('cobros_extra').select('*'),
      supabase.from('pagos_equipo').select('*'),
      supabase.from('ajustes_numeros').select('*').maybeSingle(),
    ]);
    setCuotas((c.data ?? []).map((r: any) => ({ id: r.id, proyecto: r.proyecto_id, concepto: r.concepto, pct: r.pct, monto: Number(r.monto), estado: r.estado, detalle: r.detalle || (r.pagado_el ? `Pagado el ${fecha(r.pagado_el)}` : ''), pagadoISO: r.pagado_el })));
    const clavePorId = Object.fromEntries(Object.entries(CLIENTES).map(([k, v]) => [v.id, k]));
    setCobrosExtra((x.data ?? []).map((r: any) => ({ id: r.id, cliente: clavePorId[r.cliente_id] ?? r.cliente_id, concepto: r.concepto, monto: Number(r.monto), estado: r.estado, detalle: r.detalle })));
    setPagosEquipo((pe.data ?? []).map((r: any) => ({ id: r.id, proyecto: r.proyecto_id, quien: r.profile_id, monto: Number(r.monto), pagado: Number(r.pagado), pagadoISO: r.pagado_el })));
    if (aj.data) setAjustes({ pct_equipo: aj.data.pct_equipo, plan_anual: aj.data.plan_anual ?? {} });
  }, []);

  const recargar = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSesion(null); setListo(true); return; }
    setEmail(u.user.email ?? null);
    const [perfiles, clientes, proys, peq, ents, archs, fbs, acts, auts] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('proyectos').select('*').order('creado'),
      supabase.from('proyecto_equipo').select('*'),
      supabase.from('entregas').select('*').order('orden').order('creado'),
      supabase.from('archivos').select('*').order('creado'),
      supabase.from('feedback').select('*').order('creado'),
      supabase.from('actividad').select('*').order('creado', { ascending: true }).limit(400),
      supabase.from('automatizaciones').select('*'),
    ]);
    const err = [perfiles, clientes, proys].find((r) => r.error)?.error;
    if (err) { setError(err.message); setListo(true); return; }

    const yo = (perfiles.data ?? []).find((p: any) => p.id === u.user!.id);
    // equipo
    EQUIPO.splice(0, EQUIPO.length, ...(perfiles.data ?? []).filter((p: any) => p.rol !== 'cliente').sort((a: any, b: any) => (a.rol === 'admin' ? -1 : b.rol === 'admin' ? 1 : a.nombre.localeCompare(b.nombre))).map((p: any) => ({
      id: p.id, nombre: p.nombre, rol: p.rol_texto, iniciales: p.iniciales || p.nombre.slice(0, 2).toUpperCase(), tono: p.color, esAdmin: p.rol === 'admin', email: p.email,
    })));
    // clientes
    Object.keys(CLIENTES).forEach((k) => delete CLIENTES[k]);
    (clientes.data ?? []).forEach((c: any) => { CLIENTES[c.clave] = { id: c.id, nombre: c.nombre, color: c.color }; });
    const clavePorId: Record<string, string> = Object.fromEntries((clientes.data ?? []).map((c: any) => [c.id, c.clave]));
    const accesos: Record<string, string> = {};
    (perfiles.data ?? []).filter((p: any) => p.rol === 'cliente' && p.cliente_id).forEach((p: any) => { accesos[p.cliente_id] = p.email; });

    const lista: Proyecto[] = (proys.data ?? []).map((r: any) => {
      const cl = (clientes.data ?? []).find((c: any) => c.id === r.cliente_id);
      if (CLIENTES[cl?.clave]) CLIENTES[cl.clave].proyecto = r.id;
      const entregas: Entrega[] = (ents.data ?? []).filter((e: any) => e.proyecto_id === r.id).map((e: any) => ({
        id: e.id, titulo: e.titulo, etapa: e.etapa, estado: e.estado, fecha: e.fecha ? fecha(e.fecha) : '—', fechaISO: e.fecha, nota: e.nota ?? undefined, preview: e.preview,
        archivos: (archs.data ?? []).filter((a: any) => a.entrega_id === e.id).map((a: any) => ({ id: a.id, nombre: a.nombre, tipo: a.tipo, peso: a.peso, path: a.storage_path })),
        feedback: (fbs.data ?? []).filter((f: any) => f.entrega_id === e.id).map((f: any) => ({ autor: f.autor_nombre, texto: f.texto, fecha: fecha(f.creado) })),
      }));
      return {
        id: r.id, clave: r.clave, clienteId: r.cliente_id, cliente: cl?.nombre ?? '', rubro: r.rubro, nombre: r.nombre, servicio: r.servicio, plan: r.plan, total: 0,
        etapa: r.etapa, inicio: fecha(r.inicio), inicioISO: r.inicio, entregaFinal: fecha(r.entrega_final), entregaFinalISO: r.entrega_final,
        proximoHito: { titulo: r.hito_titulo, fecha: fecha(r.hito_fecha, true), iso: r.hito_fecha },
        equipo: (peq.data ?? []).filter((x: any) => x.proyecto_id === r.id).map((x: any) => x.profile_id),
        ronda: r.ronda_total ? { actual: r.ronda_actual ?? 1, total: r.ronda_total } : undefined,
        colores: [r.colores?.[0] ?? '#E9E6DF', r.colores?.[1] ?? '#2B2B2B', r.colores?.[2] ?? '#C74227'],
        accesoCliente: accesos[r.cliente_id] ? { email: accesos[r.cliente_id], ultimaVisita: '' } : null,
        entregas, pagos: [],
        actividad: (acts.data ?? []).filter((a: any) => a.proyecto_id === r.id).map((a: any) => ({ quien: quienDe(a.tipo, a.quien), texto: a.texto, cuando: hace(a.creado), ts: a.creado })),
      };
    });
    setProyectos(lista);

    // automatizaciones + avisos de lo que se disparó
    const autosDB = (acts.data ?? []).filter((a: any) => a.tipo === 'auto');
    setAutoLog([...autosDB].reverse().slice(0, 12).map((a: any) => ({ texto: a.texto, cuando: hace(a.creado) })));
    const ult = autosDB[autosDB.length - 1]?.creado ?? null;
    if (ultimoAuto.current && ult && ult > ultimoAuto.current) autosDB.filter((a: any) => a.creado > ultimoAuto.current!).forEach((a: any) => avisar('Automatización: ' + a.texto));
    ultimoAuto.current = ult ?? ultimoAuto.current ?? '0';
    setAutos((auts.data ?? []).map((a: any) => ({ id: a.id, activa: a.activa, ...TEXTOS_AUTO[a.id] })).filter((a) => a.cuando));

    if (yo?.rol === 'admin' || yo?.rol === 'equipo') {
      const [ts, resp, hist] = await Promise.all([
        supabase.from('tareas').select('*').order('creado'),
        supabase.from('tarea_responsables').select('*'),
        supabase.from('tarea_historial').select('*').order('creado'),
      ]);
      setTareas((ts.data ?? []).map((t: any) => ({
        id: t.id, cliente: clavePorId[t.cliente_id] ?? '', proyecto: t.proyecto_id ?? undefined, titulo: t.titulo,
        quien: (resp.data ?? []).filter((x: any) => x.tarea_id === t.id).map((x: any) => x.profile_id),
        estado: t.estado, prioridad: t.prioridad, inicio: t.inicio, fin: t.fin, equipo: t.equipo ?? [], etapa: t.etapa ?? undefined,
        privada: t.privada, plantilla: t.plantilla, notion: t.notion, notas: t.notas ?? '', checklist: t.checklist ?? [], links: t.links ?? [],
        historial: (hist.data ?? []).filter((h: any) => h.tarea_id === t.id).map((h: any) => ({ quien: quienDe(h.tipo, h.quien), texto: h.texto, cuando: hace(h.creado) })),
      })));
      setSesion((s) => (s?.tipo === 'estudio' ? s : { tipo: 'estudio', persona: yo.id }));
      if (yo.rol === 'admin') {
        const { data: est } = await supabase.rpc('numeros_estado');
        setNumeros(est ?? { tiene_clave: false, abierto: false });
        if (est?.abierto) await cargarNumeros();
      }
    } else if (yo?.rol === 'cliente') {
      const propio = lista.filter((p) => p.clienteId === yo.cliente_id).sort((a, b) => (a.etapa >= 6 ? 1 : 0) - (b.etapa >= 6 ? 1 : 0))[0];
      if (propio) setSesion({ tipo: 'cliente', proyecto: propio.id });
      else setError('Tu cuenta todavía no tiene un proyecto asignado. Escribinos a hola@1607studio.com.');
    }
    setListo(true);
  }, [cargarNumeros]);

  useEffect(() => {
    recargar();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'PASSWORD_RECOVERY') setRecuperando(true);
      if (ev === 'SIGNED_OUT') { setSesion(null); setProyectos([]); setTareas([]); setNumeros(null); }
    });
    // refresco suave cada 60 s para ver lo que cambian los demás
    const iv = setInterval(() => { supabase.auth.getSession().then(({ data }) => data.session && recargar()); }, 60000);
    return () => { sub.subscription.unsubscribe(); clearInterval(iv); };
  }, [recargar]);

  // proyectos con sus cuotas (solo con Números abierto)
  const proyectosConPagos = proyectos.map((p) => {
    const pagos = cuotas.filter((c) => c.proyecto === p.id);
    return pagos.length ? { ...p, pagos, total: pagos.reduce((a, c) => a + c.monto, 0) } : p;
  });

  const rpc = async (fn: string, args?: any) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw error;
    return data;
  };
  const clienteIdDe = (clave: string) => CLIENTES[clave]?.id ?? null;

  const store: Store = {
    listo, error, proyectos: proyectosConPagos, tareas, sesion, email, setSesion, recargar,
    tareaAbierta, abrirTarea, autos, autoLog, avisos, numeros, cobrosExtra, pagosEquipo, ajustes,

    entrar: async (mail, clave) => {
      const { error } = await supabase.auth.signInWithPassword({ email: mail.trim().toLowerCase(), password: clave });
      if (error) return error.message.includes('Invalid') ? 'El email o la contraseña no coinciden. Revisá los datos que te pasó el estudio.' : error.message;
      setListo(false);
      await recargar();
      return null;
    },
    recuperando,
    cambiarClave: async (nueva, actual) => {
      if (nueva.length < 8) return 'La contraseña tiene que tener al menos 8 caracteres.';
      if (actual !== undefined) {
        const { data } = await supabase.auth.getUser();
        const mail = data.user?.email;
        if (!mail) return 'Tu sesión se cerró. Volvé a ingresar.';
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: actual });
        if (error) return 'La contraseña actual no es correcta.';
      }
      const { error } = await supabase.auth.updateUser({ password: nueva });
      return error ? errorClave(error.message) : null;
    },
    pedirRecuperacion: async (mail) => {
      const { error } = await supabase.auth.resetPasswordForEmail(mail.trim().toLowerCase(), { redirectTo: window.location.origin });
      return error ? errorClave(error.message) : null;
    },
    terminarRecuperacion: () => {
      setRecuperando(false);
      if (window.location.hash) history.replaceState(null, '', window.location.pathname);
    },
    salir: async () => {
      await supabase.rpc('numeros_cerrar').then(() => {}, () => {});
      await supabase.auth.signOut();
      setSesion(null);
    },

    setEstadoEntrega: async (pid, eid, estado, feedback) => {
      try {
        if (estado === 'aprobado' || estado === 'cambios') {
          await rpc('responder_entrega', { entrega: eid, aprobar: estado === 'aprobado', texto: feedback?.texto ?? null });
        } else {
          const { error } = await supabase.from('entregas').update({ estado, ...(estado === 'enviado' ? { fecha: HOY } : {}) }).eq('id', eid);
          if (error) throw error;
          const e = proyectos.find((p) => p.id === pid)?.entregas.find((x) => x.id === eid);
          const p = proyectos.find((x) => x.id === pid);
          await supabase.from('actividad').insert({ proyecto_id: pid, quien: (sesion as any)?.persona, texto: estado === 'enviado' ? `envió ${e?.titulo} a ${p?.cliente}` : `volvió ${e?.titulo} al estudio` });
        }
      } catch (e) { fallo(e); }
      await recargar();
    },
    subirArchivo: async (pid, eid, file) => {
      const path = `${pid}/${eid}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
      const up = await supabase.storage.from('entregas').upload(path, file);
      if (up.error) return fallo(up.error);
      const kb = file.size / 1024;
      const peso = kb > 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(kb)} KB`;
      const { error } = await supabase.from('archivos').insert({ entrega_id: eid, nombre: file.name, tipo: (file.name.split('.').pop() ?? '').toUpperCase().slice(0, 4), peso, storage_path: path });
      if (error) fallo(error);
      await recargar();
    },
    urlArchivo: async (path) => {
      const { data, error } = await supabase.storage.from('entregas').createSignedUrl(path, 120, { download: true });
      if (error) { fallo(error); return null; }
      return data.signedUrl;
    },

    toggleTarea: (tid) => {
      const t = tareas.find((x) => x.id === tid);
      if (t) store.setEstadoTarea(tid, t.estado === 'hecha' ? 'pendiente' : 'hecha');
    },
    setEstadoTarea: (tid, e) => {
      setTareas((ts) => ts.map((x) => (x.id === tid ? { ...x, estado: e } : x)));
      rpc('estado_tarea', { tarea: tid, nuevo: e }).then(recargar, (er) => { fallo(er); recargar(); });
    },
    agregarTarea: async (t) => {
      const { data, error } = await supabase.from('tareas').insert({
        cliente_id: clienteIdDe(t.cliente), proyecto_id: t.proyecto ?? null, titulo: t.titulo, estado: t.estado, prioridad: t.prioridad,
        inicio: t.inicio, fin: t.fin ?? null, equipo: t.equipo ?? [], etapa: t.etapa ?? null, privada: !!t.privada, notas: t.notas ?? null,
        creado_por: (sesion as any)?.persona ?? null,
      }).select('id').single();
      if (error) return fallo(error);
      if (t.quien.length) await supabase.from('tarea_responsables').insert(t.quien.map((q) => ({ tarea_id: data.id, profile_id: q })));
      await supabase.from('tarea_historial').insert({ tarea_id: data.id, quien: (sesion as any)?.persona, texto: 'creó la tarea' });
      await recargar();
    },
    actualizarTarea: (tid, patch, log) => {
      setTareas((ts) => ts.map((x) => (x.id === tid ? { ...x, ...patch, historial: log ? [...(x.historial ?? []), { quien: (sesion as any)?.persona, texto: log, cuando: 'Recién' }] : x.historial } : x)));
      const cols: Record<string, any> = {};
      (['titulo', 'prioridad', 'inicio', 'fin', 'equipo', 'notas', 'checklist', 'links'] as const).forEach((k) => { if (k in patch) cols[k] = (patch as any)[k] ?? null; });
      if (Object.keys(cols).length) {
        debounce('t-' + tid + Object.keys(cols).join(), async () => {
          const { error } = await supabase.from('tareas').update(cols).eq('id', tid);
          if (error) fallo(error);
        }, 'titulo' in cols || 'notas' in cols ? 700 : 0);
      }
      if (patch.quien) {
        (async () => {
          await supabase.from('tarea_responsables').delete().eq('tarea_id', tid);
          if (patch.quien!.length) await supabase.from('tarea_responsables').insert(patch.quien!.map((q) => ({ tarea_id: tid, profile_id: q })));
        })().catch(fallo);
      }
      if (log) supabase.from('tarea_historial').insert({ tarea_id: tid, quien: (sesion as any)?.persona, texto: log }).then(({ error }) => error && fallo(error));
    },
    avanzarEtapa: async (pid, dir) => {
      const p = proyectos.find((x) => x.id === pid);
      if (!p) return;
      try { await rpc('mover_etapa', { p: pid, nueva: p.etapa + dir }); } catch (e) { fallo(e); }
      await recargar();
    },

    toggleAuto: (id) => {
      const a = autos.find((x) => x.id === id);
      if (!a) return;
      setAutos((as) => as.map((x) => (x.id === id ? { ...x, activa: !x.activa } : x)));
      supabase.from('automatizaciones').update({ activa: !a.activa }).eq('id', id).then(({ error }) => error && fallo(error));
    },

    crearProyecto: async ({ cliente, plan, inicio, diseno }) => {
      let clave = slug(cliente);
      while (proyectos.some((p) => p.clave === clave)) clave += '-2';
      const tareasP = tareasDePlantilla({ plan, inicio, cliente: clave, proyecto: '', estrategia: adminId(), diseno, nombreCliente: cliente });
      const id = await rpc('crear_proyecto', {
        datos: {
          clave, cliente, plan, total: PLANES[plan].total, inicio, color: COLORES[proyectos.length % COLORES.length],
          equipo: [adminId(), diseno].filter((v, i, a) => v && a.indexOf(v) === i),
          tareas: tareasP.map((t) => ({ titulo: t.titulo, prioridad: t.prioridad, inicio: t.inicio, fin: t.fin ?? '', equipo: t.equipo ?? [], etapa: t.etapa, quien: t.quien[0] })),
        },
      });
      await recargar();
      if (numeros?.abierto) await cargarNumeros();
      return id as string;
    },

    /* ---------- Números ---------- */
    numerosCrear: async (clave) => {
      try { await rpc('numeros_crear_clave', { clave }); } catch (e: any) { return e.message; }
      setNumeros({ tiene_clave: true, abierto: true });
      await cargarNumeros();
      return null;
    },
    numerosAbrir: async (clave) => {
      try {
        const r = await rpc('numeros_abrir', { clave });
        if (!r.ok) return r.motivo === 'bloqueado' ? 'Demasiados intentos. Probá de nuevo en 15 minutos.' : r.restantes === 0 ? 'Contraseña incorrecta. Un intento más y se bloquea 15 minutos.' : 'Contraseña incorrecta.';
      } catch (e: any) { return e.message; }
      setNumeros({ tiene_clave: true, abierto: true });
      await cargarNumeros();
      return null;
    },
    numerosCerrar: async () => {
      await supabase.rpc('numeros_cerrar');
      setNumeros((n) => (n ? { ...n, abierto: false } : n));
      setCuotas([]); setCobrosExtra([]); setPagosEquipo([]);
    },
    numerosCambiar: async (actual, nueva) => {
      try { await rpc('numeros_cambiar_clave', { actual, nueva }); } catch (e: any) { return e.message; }
      return null;
    },
    marcarPagado: async (pid, pagoId) => {
      const { error } = await supabase.from('cuotas').update({ estado: 'pagado', pagado_el: HOY, detalle: `Pagado el ${fecha(HOY)}` }).eq('id', pagoId);
      if (error) return fallo(error);
      const sig = cuotas.filter((c) => c.proyecto === pid && c.estado === 'futuro')[0];
      if (sig && !cuotas.some((c) => c.proyecto === pid && c.estado === 'pendiente' && c.id !== pagoId)) await supabase.from('cuotas').update({ estado: 'pendiente' }).eq('id', sig.id);
      await cargarNumeros();
    },
    marcarCobroExtra: async (id) => {
      const { error } = await supabase.from('cobros_extra').update({ estado: 'pagado', pagado_el: HOY, detalle: `Pagado el ${fecha(HOY)}` }).eq('id', id);
      if (error) return fallo(error);
      await cargarNumeros();
    },
    actualizarPagoEquipo: (id, patch) => {
      setPagosEquipo((ps) => ps.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      const cols: any = {};
      if ('monto' in patch) cols.monto = patch.monto;
      if ('pagado' in patch) cols.pagado = patch.pagado;
      if ('pagadoISO' in patch) cols.pagado_el = patch.pagadoISO ?? null;
      if ('quien' in patch) cols.profile_id = patch.quien;
      debounce('pe-' + id + Object.keys(cols).join(), async () => {
        const { error } = await supabase.from('pagos_equipo').update(cols).eq('id', id);
        if (error) fallo(error);
      }, 'monto' in cols ? 600 : 0);
    },
    guardarAjustes: (patch) => {
      setAjustes((a) => ({ ...a, ...patch }));
      debounce('ajustes', async () => {
        const { error } = await supabase.from('ajustes_numeros').update(patch).eq('id', 1);
        if (error) fallo(error);
      }, 800);
    },
  };

  // Mientras Números está abierto, mantener viva la sesión con actividad
  useEffect(() => {
    if (!numeros?.abierto) return;
    let ultimo = Date.now();
    const ping = () => {
      if (Date.now() - ultimo < 60000) return; // como mucho una vez por minuto
      ultimo = Date.now();
      supabase.rpc('numeros_mantener');
    };
    window.addEventListener('pointerdown', ping);
    window.addEventListener('keydown', ping);
    return () => { window.removeEventListener('pointerdown', ping); window.removeEventListener('keydown', ping); };
  }, [numeros?.abierto]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
