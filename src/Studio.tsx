import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, FolderKanban, Users, Lock, Zap, LogOut, ArrowLeft, ArrowRight, Eye, Upload, Send, FileText, Plus, CornerDownRight, Copy, UserRound } from 'lucide-react';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { Stepper } from './easyui/stepper';
import { OriginDropdown } from './easyui/OriginDropdown';
import { Logo, TemaSwitch, Avatar, AvatarStack, EstadoBadge, PillNav, Btn, Card, EtapaBar, Preview, Fade, useToast } from './ui';
import { useStore, useTareas } from './store';
import { TareaPanel, CuentaSheet } from './Paneles';
import { ETAPAS, ETAPA_DESC, EQUIPO, persona, esAdmin, fechaLarga, type Proyecto, type Tarea } from './data';
import { supabase } from './lib/supabase';
import ClientPortal from './ClientPortal';
import Proyectos, { TareaRow } from './Proyectos';
import Numeros from './Numeros';

type Vista = 'resumen' | 'proyectos' | 'clientes' | 'numeros';
const NAV: { id: Vista; label: string; icon: React.ElementType }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { id: 'clientes', label: 'Clientes', icon: Users },
];

const etapaNombre = (i: number) => (i >= 6 ? 'Terminado' : ETAPAS[i]);

export default function Studio({ yo }: { yo: string }) {
  const { salir, proyectos } = useStore();
  const [vista, setVista] = useState<Vista>('resumen');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [comoCliente, setComoCliente] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState(false);
  const me = persona(yo);
  const nav = esAdmin(yo) ? [...NAV, { id: 'numeros' as Vista, label: 'Números', icon: Lock }] : NAV;

  if (comoCliente) {
    return <ClientPortal proyectoId={comoCliente} preview onSalirPreview={() => setComoCliente(null)} />;
  }

  const ir = (v: Vista) => { setVista(v); setAbierto(null); };
  const proyecto = proyectos.find((p) => p.id === abierto);

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Sidebar escritorio */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen border-r border-border px-4 py-6 bg-sidebar">
        <div className="px-2 mb-9 flex items-center gap-2.5">
          <Logo className="w-[58px]" />
          <span className="text-[11px] text-text-muted leading-tight">Estudio</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((n) => {
            const on = vista === n.id;
            return (
              <button key={n.id} onClick={() => ir(n.id)} className={cn('relative flex items-center gap-3 h-9 px-3 rounded-full text-[13px] font-medium transition-colors', on ? 'text-text-primary' : 'text-text-muted hover:text-text-primary')}>
                {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgba(26,26,26,.08)]" transition={motionTransitions.springMorph} />}
                <n.icon className="relative size-4" strokeWidth={1.75} />
                <span className="relative">{n.label}</span>
                {on && <motion.span layoutId="side-dot" className="relative ml-auto size-[7px] rounded-full bg-rojo" transition={motionTransitions.springMorph} />}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <TemaSwitch className="ml-1" />
          <OriginDropdown
            side="top"
            className="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-2xl [&>button]:justify-between"
            trigger={
              <span className="flex items-center gap-2.5">
                <Avatar id={yo} size={28} />
                <span className="text-left"><span className="block text-[13px]">{me.nombre}</span><span className="block text-[11px] text-text-muted font-normal">{me.rol}</span></span>
              </span>
            }
            items={[
              { id: 'cuenta', label: 'Mi cuenta', description: 'Contraseña y apariencia', icon: <UserRound className="size-3.5" />, onSelect: () => setCuenta(true) },
              { id: 'out', label: 'Cerrar sesión', icon: <LogOut className="size-3.5" />, onSelect: () => salir() },
            ]}
          />
        </div>
      </aside>

      {/* Barra móvil */}
      <header className="lg:hidden sticky z-30 gutter pt-3 pb-3 bg-[var(--bg)]/90 backdrop-blur-xl border-b border-border" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between mb-3">
          <Logo className="w-[52px]" />
          <button onClick={() => setCuenta(true)} className="flex items-center gap-2 text-[12px] text-text-muted" aria-label="Mi cuenta"><Avatar id={yo} size={26} /> Mi cuenta</button>
        </div>
        <PillNav size="sm" items={nav.map((n) => ({ id: n.id, label: n.label }))} value={vista} onChange={ir} />
      </header>

      <main className="gutter lg:px-10 py-7 lg:py-10 min-w-0 max-w-[1240px] w-full">
        <Fade k={proyecto ? 'p-' + proyecto.id : vista}>
          {proyecto ? (
            <DetalleProyecto admin={esAdmin(yo)} p={proyecto} onVolver={() => setAbierto(null)} onComoCliente={() => setComoCliente(proyecto.id)} />
          ) : vista === 'resumen' ? (
            <Resumen yo={yo} abrir={setAbierto} />
          ) : vista === 'numeros' && esAdmin(yo) ? (
            <Numeros abrir={setAbierto} />
          ) : vista === 'proyectos' ? (
            <Proyectos abrir={setAbierto} Etapas={Tablero} />
          ) : (
            <Clientes abrir={setAbierto} />
          )}
        </Fade>
      </main>
      <CuentaSheet open={cuenta} onClose={() => setCuenta(false)} />
      <TareaPanel abrirProyecto={(id) => { setVista('proyectos'); setAbierto(id); }} />
    </div>
  );
}

/* ───────── Resumen ───────── */
function Resumen({ yo, abrir }: { yo: string; abrir: (id: string) => void }) {
  const { proyectos } = useStore();
  const tareas = useTareas();
  const activos = proyectos.filter((p) => p.etapa < 6);
  const esperan = proyectos.flatMap((p) => p.entregas.filter((e) => e.estado === 'enviado').map((e) => ({ p, e })));
  const cambios = proyectos.flatMap((p) => p.entregas.filter((e) => e.estado === 'cambios').map((e) => ({ p, e })));
  const pendientes = tareas.filter((t) => t.estado !== 'hecha');
  const porCobrar = proyectos.flatMap((p) => p.pagos).filter((x) => x.estado === 'pendiente').reduce((a, x) => a + x.monto, 0);
  const mias = pendientes.filter((t) => t.quien.includes(yo));

  const stats = [
    { n: activos.length, l: 'proyectos en curso' },
    { n: esperan.length, l: 'entregas esperan al cliente', red: esperan.length > 0 },
    { n: pendientes.length, l: 'tareas abiertas' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{fechaLarga()}</p>
        <h1 className="h-display text-[clamp(34px,5vw,60px)] mt-2">Buen día, {persona(yo).nombre}.</h1>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {stats.map((s) => (
            <div key={s.l} className="flex items-baseline gap-2">
              <span className={cn('text-[22px] font-bold tracking-[-0.03em] tnum', s.red && 'text-rojo')}>{s.n}</span>
              <span className="text-text-muted text-[13px]">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {(cambios.length > 0 || esperan.length > 0) && (
        <section>
          <h2 className="eyebrow mb-3">Necesita atención</h2>
          <div className="grid gap-2">
            {cambios.map(({ p, e }) => (
              <button key={e.id} onClick={() => abrir(p.id)} className="text-left flex flex-wrap items-center gap-3 rounded-2xl bg-surface border border-border hover:border-border-hover px-4 py-3">
                <EstadoBadge estado="cambios" />
                <span className="font-medium">{p.cliente}</span>
                <span className="text-text-muted min-w-0 basis-full sm:basis-0 flex-1 order-last sm:order-none">“{e.feedback?.[e.feedback.length - 1]?.texto}”</span>
                <ArrowRight className="size-4 text-text-subtle ml-auto sm:ml-0" />
              </button>
            ))}
            {esperan.map(({ p, e }) => (
              <button key={e.id} onClick={() => abrir(p.id)} className="text-left flex flex-wrap items-center gap-3 rounded-2xl bg-surface border border-border hover:border-border-hover px-4 py-3">
                <EstadoBadge estado="enviado" />
                <span className="font-medium">{p.cliente}</span>
                <span className="text-text-muted min-w-0 basis-full sm:basis-0 flex-1 order-last sm:order-none">{e.titulo} · enviado el {e.fecha}</span>
                <ArrowRight className="size-4 text-text-subtle ml-auto sm:ml-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8">
        <section className="min-w-0">
          <h2 className="eyebrow mb-3">Proyectos en curso</h2>
          <Card className="divide-y divide-border overflow-hidden">
            {activos.map((p) => (
              <button key={p.id} onClick={() => abrir(p.id)} className="w-full text-left grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-x-6 gap-y-2 items-center px-4 py-4 hover:bg-surface-hover transition-colors">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="size-9 rounded-lg shrink-0 grid grid-cols-2 overflow-hidden">
                    <span style={{ background: p.colores[0] }} /><span style={{ background: p.colores[1] }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{p.cliente}</span>
                    <span className="block text-[12px] text-text-muted truncate">{p.servicio} · {p.plan}</span>
                  </span>
                </div>
                <div className="hidden sm:block min-w-0">
                  <EtapaBar etapa={p.etapa} />
                  <span className="flex justify-between gap-2 text-[11px] mt-1.5"><span className="font-medium">{etapaNombre(p.etapa)}</span><span className="text-text-muted truncate">{p.proximoHito.fecha}</span></span>
                </div>
                <AvatarStack ids={p.equipo} size={24} />
                <div className="sm:hidden col-span-2"><EtapaBar etapa={p.etapa} /><span className="text-[11px] mt-1 block">{etapaNombre(p.etapa)} · {p.proximoHito.fecha}</span></div>
              </button>
            ))}
          </Card>
        </section>

        <section className="min-w-0 space-y-8">
          <div>
            <h2 className="eyebrow mb-3">Tus tareas</h2>
            <Card className="p-1.5">
              {mias.length ? mias.map((t) => <TareaRow key={t.id} t={t} />) : <p className="p-4 text-text-muted">No tenés tareas abiertas.</p>}
            </Card>
          </div>
          <div>
            <h2 className="eyebrow mb-3">Actividad</h2>
            <Feed items={proyectos.flatMap((p) => p.actividad.map((a) => ({ ...a, cliente: p.cliente }))).slice(-6).reverse()} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Feed({ items }: { items: { quien: string; texto: string; cuando: string; cliente?: string }[] }) {
  return (
    <ol className="relative space-y-4 pl-1">
      <AnimatePresence initial={false}>
        {items.map((a, i) => (
          <motion.li key={a.texto + a.cuando + i} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={motionTransitions.springGentle} className="flex gap-3">
            {a.quien === 'cliente' ? <span className="size-6 rounded-full bg-err-bg grid place-items-center shrink-0"><span className="size-1.5 rounded-full bg-rojo" /></span> : a.quien === 'auto' ? <span className="size-6 rounded-full bg-rojo text-white grid place-items-center shrink-0"><Zap className="size-3.5" /></span> : <Avatar id={a.quien} size={24} />}
            <p className="text-[13px] leading-snug min-w-0">
              {a.quien === 'auto' ? <span className="font-medium">Automatización: </span> : a.quien !== 'cliente' && <span className="font-medium">{persona(a.quien)?.nombre} </span>}
              <span className="text-text-secondary">{a.texto}</span>
              <span className="block text-[11px] text-text-subtle mt-0.5">{a.cliente ? a.cliente + ' · ' : ''}{a.cuando}</span>
            </p>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

/* ───────── Tablero de proyectos ───────── */
function Tablero({ abrir, quien = [] }: { abrir: (id: string) => void; quien?: string[] }) {
  const { proyectos: todos } = useStore();
  const proyectos = quien.length ? todos.filter((p) => p.equipo.some((q) => quien.includes(q))) : todos;
  const cols = [...ETAPAS.map((e, i) => ({ i, e })), { i: 6, e: 'Terminado' }];
  return (
    <div>
      <p className="text-[13px] text-text-muted mb-4">Los proyectos con portal de cliente, ordenados por etapa. Tocá uno para ver entregables y tareas.</p>
      <div className="scroll-x -mx-4 px-4 lg:mx-0 lg:px-0 pb-3">
        <div className="grid grid-flow-col auto-cols-[220px] gap-3">
          {cols.map((c) => {
            const ps = proyectos.filter((p) => p.etapa === c.i);
            return (
              <div key={c.e} className="rounded-2xl bg-column p-2 min-h-[260px]">
                <div className="flex items-center justify-between px-2 pt-1.5 pb-3">
                  <span className="text-[12px] font-medium flex items-center gap-2">{ps.length > 0 && c.i < 6 && <span className="size-1.5 rounded-full bg-rojo" />}{c.e}</span>
                  <span className="text-[11px] text-text-muted tnum">{ps.length}</span>
                </div>
                <div className="space-y-2">
                  {ps.map((p) => (
                    <motion.button key={p.id} layoutId={'card-' + p.id} whileHover={{ y: -2 }} transition={motionTransitions.springSnappy} onClick={() => abrir(p.id)} className="w-full text-left rounded-xl bg-surface border border-border p-3 shadow-xs">
                      <span className="flex gap-1 mb-3">{p.colores.map((col) => <span key={col} className="h-1.5 flex-1 rounded-full" style={{ background: col, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)' }} />)}</span>
                      <span className="block font-medium text-[13px]">{p.cliente}</span>
                      <span className="block text-[11px] text-text-muted">{p.servicio}</span>
                      <span className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-text-secondary">{p.etapa < 6 ? p.proximoHito.fecha : 'Entregado ' + p.entregaFinal}</span>
                        <AvatarStack ids={p.equipo} size={20} />
                      </span>
                    </motion.button>
                  ))}
                  {!ps.length && <p className="px-2 text-[11px] text-text-subtle">Sin proyectos</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────── Detalle de proyecto ───────── */
type Tab = 'entregables' | 'tareas' | 'pagos' | 'actividad';
function DetalleProyecto({ p, admin, onVolver, onComoCliente }: { p: Proyecto; admin: boolean; onVolver: () => void; onComoCliente: () => void }) {
  const { avanzarEtapa } = useStore();
  const tareas = useTareas();
  const [tab, setTab] = useState<Tab>('entregables');
  const [editar, setEditar] = useState(false);
  const toast = useToast();
  const ts = tareas.filter((t) => t.proyecto === p.id);

  return (
    <div className="space-y-8">
      <button onClick={onVolver} className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary"><ArrowLeft className="size-3.5" /> Proyectos</button>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="eyebrow">{p.cliente}{p.rubro ? ' · ' + p.rubro : ''}</p>
          <h1 className="h-display text-[clamp(34px,5vw,60px)] mt-2">{p.nombre}</h1>
          <p className="mt-3 text-text-secondary">{p.plan} · {p.inicio} → {p.entregaFinal}</p>
        </div>
        <div className="flex items-center gap-3">
          <AvatarStack ids={p.equipo} />
          <Btn variant="secondary" size="sm" onClick={onComoCliente}><Eye className="size-3.5" /> Ver como cliente</Btn>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="eyebrow">Etapa actual</p>
            <p className="text-[20px] font-bold tracking-[-0.02em] mt-1">{etapaNombre(p.etapa)} <span className="font-normal text-text-muted text-[14px]">{p.etapa < 6 ? '· ' + ETAPA_DESC[ETAPAS[p.etapa]] : ''}</span></p>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" disabled={p.etapa === 0} onClick={() => avanzarEtapa(p.id, -1)}>Volver</Btn>
            <Btn size="sm" disabled={p.etapa >= 6} onClick={() => { avanzarEtapa(p.id, 1); toast(p.etapa + 1 >= 6 ? `${p.cliente}: proyecto terminado` : `${p.cliente} pasó a ${ETAPAS[p.etapa + 1]}. El cliente ya lo ve.`); }}>
              {p.etapa >= 5 ? 'Cerrar proyecto' : `Pasar a ${ETAPAS[Math.min(p.etapa + 1, 5)]}`} <ArrowRight className="size-3.5" />
            </Btn>
          </div>
        </div>
        <Stepper steps={ETAPAS.map((e) => ({ title: e }))} current={p.etapa} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-text-muted flex items-center gap-2"><span className="size-1.5 rounded-full bg-rojo" />Próximo hito: <span className="text-text-primary">{p.proximoHito.titulo || '—'}</span> · {p.proximoHito.fecha}</p>
          <button onClick={() => setEditar(!editar)} className="text-[12px] text-text-muted hover:text-text-primary underline underline-offset-2">{editar ? 'Cerrar' : 'Editar fechas e hito'}</button>
        </div>
        <AnimatePresence initial={false}>
          {editar && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <EditarFechas p={p} onListo={() => setEditar(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <PillNav items={[{ id: 'entregables', label: 'Entregables', count: p.entregas.length }, { id: 'tareas', label: 'Tareas', count: ts.filter((t) => t.estado !== 'hecha').length }, { id: 'actividad', label: 'Actividad' }]} value={tab} onChange={(v) => setTab(v as Tab)} />

      <Fade k={tab}>
        {tab === 'entregables' && <EntregablesEstudio p={p} />}
        {tab === 'tareas' && <TareasProyecto p={p} ts={ts} />}
        {tab === 'actividad' && <Card className="p-5"><Feed items={[...p.actividad].reverse()} /></Card>}
      </Fade>
    </div>
  );
}

function EditarFechas({ p, onListo }: { p: Proyecto; onListo: () => void }) {
  const { recargar } = useStore();
  const toast = useToast();
  const [f, setF] = useState({ inicio: p.inicioISO ?? '', entrega_final: p.entregaFinalISO ?? '', hito_titulo: p.proximoHito.titulo, hito_fecha: p.proximoHito.iso ?? '' });
  const guardar = async () => {
    const { error } = await supabase.from('proyectos').update({ inicio: f.inicio || null, entrega_final: f.entrega_final || null, hito_titulo: f.hito_titulo, hito_fecha: f.hito_fecha || null }).eq('id', p.id);
    if (error) return toast('No se pudo guardar: ' + error.message);
    await recargar();
    toast('Fechas guardadas. El cliente ya las ve.');
    onListo();
  };
  const campo = 'h-10 w-full rounded-lg bg-surface-raised px-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent-ring)]';
  return (
    <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <label className="space-y-1.5"><span className="text-[12px] text-text-muted">Arrancó</span><input id={'ef-ini-' + p.id} type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} className={campo} /></label>
      <label className="space-y-1.5"><span className="text-[12px] text-text-muted">Entrega final</span><input id={'ef-fin-' + p.id} type="date" value={f.entrega_final} onChange={(e) => setF({ ...f, entrega_final: e.target.value })} className={campo} /></label>
      <label className="space-y-1.5"><span className="text-[12px] text-text-muted">Próximo hito</span><input id={'ef-hito-' + p.id} value={f.hito_titulo} onChange={(e) => setF({ ...f, hito_titulo: e.target.value })} placeholder="Ej: Presentación de conceptos" className={campo} /></label>
      <label className="space-y-1.5"><span className="text-[12px] text-text-muted">Fecha del hito</span><input id={'ef-hf-' + p.id} type="date" value={f.hito_fecha} onChange={(e) => setF({ ...f, hito_fecha: e.target.value })} className={campo} /></label>
      <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2"><Btn size="sm" variant="ghost" onClick={onListo}>Cancelar</Btn><Btn size="sm" onClick={guardar}>Guardar</Btn></div>
    </div>
  );
}

function EntregablesEstudio({ p }: { p: Proyecto }) {
  const { setEstadoEntrega, subirArchivo, urlArchivo, recargar } = useStore();
  const toast = useToast();
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [etapa, setEtapa] = useState<string>(ETAPAS[Math.min(p.etapa, 5)]);
  const subir = async (eid: string, files: FileList | null) => {
    if (!files?.length) return;
    setSubiendo(eid);
    for (const f of Array.from(files)) await subirArchivo(p.id, eid, f);
    setSubiendo(null);
    toast(files.length > 1 ? `${files.length} archivos subidos` : 'Archivo subido');
  };
  const crearEntrega = async () => {
    if (!titulo.trim()) return;
    const { error } = await supabase.from('entregas').insert({ proyecto_id: p.id, titulo: titulo.trim(), etapa, preview: etapa === 'Concepto' ? 'conceptoA' : etapa === 'Entrega' ? 'manual' : 'brief', orden: p.entregas.length + 1 });
    if (error) return toast('No se pudo crear: ' + error.message);
    setTitulo(''); setNueva(false); await recargar(); toast('Entrega creada como borrador');
  };
  const abrirArchivo = async (path?: string | null) => { if (!path) return; const u = await urlArchivo(path); if (u) window.open(u, '_blank', 'noopener'); };
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {p.entregas.map((e) => {
        const tieneArchivos = e.archivos.length > 0;
        return (
          <motion.div layout key={e.id} transition={motionTransitions.springSmooth}>
            <Card className="p-3 h-full flex flex-col">
              <Preview p={p} e={e} />
              <div className="px-1.5 pt-4 pb-1 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{e.titulo}</p>
                    <p className="text-[11px] text-text-muted mt-1">{e.etapa} · {tieneArchivos ? `${e.archivos.length} archivo${e.archivos.length > 1 ? 's' : ''}` : 'Sin archivos'}</p>
                  </div>
                  <EstadoBadge estado={e.estado} />
                </div>
                {tieneArchivos && (
                  <ul className="mt-3 space-y-1">
                    {e.archivos.map((a) => (
                      <li key={a.id ?? a.nombre}><button onClick={() => abrirArchivo(a.path)} className="w-full flex items-center gap-2 text-left text-[12px] text-text-secondary hover:text-text-primary"><FileText className="size-3.5 shrink-0 text-text-subtle" /><span className="truncate">{a.nombre}</span><span className="ml-auto text-text-subtle shrink-0">{a.peso}</span></button></li>
                    ))}
                  </ul>
                )}
                {e.estado === 'cambios' && e.feedback?.length ? (
                  <p className="mt-3 text-[12px] text-text-secondary flex gap-1.5"><CornerDownRight className="size-3.5 shrink-0 mt-0.5 text-text-subtle" />“{e.feedback[e.feedback.length - 1].texto}”</p>
                ) : null}
                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                  {(e.estado === 'interno' || e.estado === 'cambios') && (
                    <label className={cn('inline-flex items-center justify-center gap-2 h-8 px-3.5 rounded-full text-[12px] font-medium cursor-pointer transition-colors bg-surface-raised hover:bg-border', subiendo === e.id && 'opacity-50 pointer-events-none')}>
                      <Upload className="size-3.5" /> {subiendo === e.id ? 'Subiendo…' : 'Subir archivos'}
                      <input type="file" multiple className="sr-only" onChange={(ev) => { subir(e.id, ev.target.files); ev.target.value = ''; }} />
                    </label>
                  )}
                  {e.estado === 'interno' && tieneArchivos && (
                    <Btn size="sm" onClick={() => { setEstadoEntrega(p.id, e.id, 'enviado'); toast(`Enviado a ${p.cliente}. Ya lo ve en su portal.`); }}><Send className="size-3.5" /> Enviar al cliente</Btn>
                  )}
                  {e.estado === 'cambios' && tieneArchivos && (
                    <Btn size="sm" onClick={() => { setEstadoEntrega(p.id, e.id, 'enviado'); toast('Nueva versión enviada'); }}><Send className="size-3.5" /> Enviar nueva versión</Btn>
                  )}
                  {e.estado === 'enviado' && <span className="text-[12px] text-text-muted">Enviado el {e.fecha}. Esperando a {p.cliente}.</span>}
                  {e.estado === 'aprobado' && <span className="text-[12px] text-text-muted">Aprobado{e.fecha !== '—' ? ' · ' + e.fecha : ''}</span>}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
      {nueva ? (
        <Card className="p-4 flex flex-col gap-3 min-h-[200px]">
          <p className="font-medium">Nueva entrega</p>
          <input id={'ne-titulo-' + p.id} autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && crearEntrega()} placeholder="Ej: Papelería v2" className="h-10 rounded-lg bg-surface-raised px-3 text-[13px] outline-none" />
          <select id={'ne-etapa-' + p.id} aria-label="Etapa" value={etapa} onChange={(e) => setEtapa(e.target.value)} className="h-10 rounded-lg bg-surface-raised px-3 text-[13px] outline-none">
            {ETAPAS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <p className="text-[11px] text-text-muted">Queda como borrador (el cliente no la ve) hasta que subas archivos y la envíes.</p>
          <div className="mt-auto flex justify-end gap-2"><Btn size="sm" variant="ghost" onClick={() => setNueva(false)}>Cancelar</Btn><Btn size="sm" onClick={crearEntrega}>Crear</Btn></div>
        </Card>
      ) : (
        <button onClick={() => setNueva(true)} className="rounded-2xl border border-dashed border-border-hover min-h-[200px] grid place-items-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors">
          <span className="flex flex-col items-center gap-2 text-[13px]"><Plus className="size-5" />Nueva entrega</span>
        </button>
      )}
    </div>
  );
}

function TareasProyecto({ p, ts }: { p: Proyecto; ts: Tarea[] }) {
  const { agregarTarea } = useStore();
  const [txt, setTxt] = useState('');
  const [quien, setQuien] = useState(p.equipo[0]);
  return (
    <Card className="p-2">
      {ts.map((t) => <TareaRow key={t.id} t={t} conCliente={false} />)}
      <form
        onSubmit={(e) => { e.preventDefault(); if (!txt.trim()) return; agregarTarea({ cliente: p.clave, proyecto: p.id, titulo: txt.trim(), quien: [quien], estado: 'pendiente', prioridad: 'media', inicio: null }); setTxt(''); }}
        className="flex flex-wrap items-center gap-2 border-t border-border mt-1 pt-2 px-1.5"
      >
        <Plus className="size-4 text-text-subtle" />
        <input id={'nueva-tarea-' + p.id} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Agregar tarea y apretar Enter" className="flex-1 min-w-[160px] h-9 bg-transparent outline-none text-[13px] placeholder:text-text-subtle" />
        <div className="flex gap-1">
          {EQUIPO.map((m) => (
            <button type="button" key={m.id} onClick={() => setQuien(m.id)} aria-label={'Asignar a ' + m.nombre} className={cn('rounded-full p-0.5 transition-opacity', quien === m.id ? 'ring-2 ring-rojo' : 'opacity-40 hover:opacity-80')}>
              <Avatar id={m.id} size={22} />
            </button>
          ))}
        </div>
      </form>
    </Card>
  );
}

/* ───────── Clientes ───────── */
function Clientes({ abrir }: { abrir: (id: string) => void }) {
  const { proyectos, recargar, sesion } = useStore();
  const toast = useToast();
  const admin = esAdmin((sesion as any)?.persona);
  const [form, setForm] = useState<{ abierto: boolean; email: string; clave: string; proyecto: string; nombre: string }>({ abierto: false, email: '', clave: '', proyecto: '', nombre: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copiar = (txt: string, msg = 'Copiado') => {
    navigator.clipboard?.writeText(txt).then(() => toast(msg), () => toast(txt));
  };
  const generar = () => Array.from(crypto.getRandomValues(new Uint8Array(9))).map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
  const invitar = async () => {
    setError(null);
    const p = proyectos.find((x) => x.id === form.proyecto);
    if (!p) return setError('Elegí el proyecto.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Escribí un email válido.');
    if (form.clave.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres.');
    setEnviando(true);
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch('/api/invitar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.session?.access_token }, body: JSON.stringify({ email: form.email, password: form.clave, cliente_id: p.clienteId, nombre: form.nombre || p.cliente, rol: 'cliente' }) });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) return setError(j.error ?? 'No se pudo crear el acceso.');
    copiar(`Hola! Ya podés ver tu proyecto con 1607 en ${location.origin}\nUsuario: ${form.email}\nContraseña: ${form.clave}`, 'Acceso creado. Copié el mensaje con los datos para mandarle.');
    setForm({ abierto: false, email: '', clave: '', proyecto: '', nombre: '' });
    await recargar();
  };
  const campo = 'h-10 rounded-lg bg-surface-raised px-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent-ring)] w-full';
  return (
    <div>
      <p className="eyebrow">Clientes</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-7">
        <h1 className="h-display text-[clamp(34px,5vw,60px)]">Accesos al portal</h1>
        {admin && <Btn size="sm" onClick={() => setForm({ ...form, abierto: !form.abierto, clave: form.clave || generar() })}><Plus className="size-3.5" /> Crear acceso</Btn>}
      </div>
      <AnimatePresence initial={false}>
        {form.abierto && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="p-5 mb-6">
              <p className="font-medium mb-4">Nuevo acceso de cliente</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select id="ac-proyecto" aria-label="Proyecto" value={form.proyecto} onChange={(e) => setForm({ ...form, proyecto: e.target.value })} className={campo}>
                  <option value="">Proyecto…</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.cliente} · {p.nombre}</option>)}
                </select>
                <input id="ac-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre (opcional)" className={campo} />
                <input id="ac-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@marca.com" className={campo} />
                <div className="flex gap-1.5">
                  <input id="ac-clave" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} placeholder="Contraseña" className={cn(campo, 'font-mono')} />
                  <Btn size="sm" variant="ghost" className="!h-10" onClick={() => setForm({ ...form, clave: generar() })}>Otra</Btn>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <span className="text-[12px] text-rojo">{error}</span>
                <span className="flex gap-2"><Btn size="sm" variant="ghost" onClick={() => setForm({ ...form, abierto: false })}>Cancelar</Btn><Btn size="sm" disabled={enviando} onClick={invitar}>{enviando ? 'Creando…' : 'Crear y copiar datos'}</Btn></span>
              </div>
              <p className="text-[11px] text-text-muted mt-3">Al crearlo te copio un mensaje con el link, el usuario y la contraseña para que se lo mandes por WhatsApp o mail.</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <Card className="scroll-x">
        <table className="w-full text-left text-[13px] min-w-[600px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[.06em] text-text-muted">
              <th className="font-medium px-4 py-3">Cliente</th><th className="font-medium px-4 py-3">Proyecto</th><th className="font-medium px-4 py-3">Acceso</th><th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border border-t border-border">
            {proyectos.map((p) => (
              <tr key={p.id} className="hover:bg-surface-hover">
                <td className="px-4 py-3 font-medium">{p.cliente}</td>
                <td className="px-4 py-3"><button onClick={() => abrir(p.id)} className="hover:underline underline-offset-2">{p.nombre}</button><span className="block text-[11px] text-text-muted">{etapaNombre(p.etapa)}</span></td>
                <td className="px-4 py-3 text-text-secondary">{p.accesoCliente?.email ?? <span className="text-text-subtle">Sin acceso todavía</span>}</td>
                <td className="px-4 py-3 text-right">{p.accesoCliente && <button onClick={() => copiar(p.accesoCliente!.email, 'Email copiado')} aria-label="Copiar email" className="text-text-subtle hover:text-text-primary"><Copy className="size-3.5" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-[12px] text-text-muted mt-4 flex items-center gap-1.5"><FileText className="size-3.5" />Cada cliente ve solo su proyecto: etapas, entregas enviadas y archivos. Lo que está “En el estudio” no lo ve.</p>
    </div>
  );
}
