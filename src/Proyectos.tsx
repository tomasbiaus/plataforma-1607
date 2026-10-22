import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Table2, Columns3, GanttChart, CalendarDays, Layers, Flag, Zap, Sparkles } from 'lucide-react';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { Avatar, AvatarStack, PillNav, Btn, Card, Fade, useToast } from './ui';
import { useStore, useTareas } from './store';
import { NuevoProyectoSheet, AutomatizacionesSheet } from './Paneles';
import { GooeyMenu } from './easyui/GooeyMenu';
import { CLIENTES, EQUIPO, ETAPAS, HOY, fecha, dias, addDias, type Tarea, type EstadoTarea, type Prioridad, type Proyecto } from './data';

/* ───────── piezas compartidas ───────── */

const ESTADOS: Record<EstadoTarea, { label: string; cls: string; dot: string }> = {
  pendiente: { label: 'Sin empezar', cls: 'bg-surface-raised text-text-secondary', dot: 'bg-text-subtle' },
  curso: { label: 'En curso', cls: 'bg-[#E6EEF8] text-[#2D5B91]', dot: 'bg-[#4E86C6]' },
  hecha: { label: 'Hecho', cls: 'bg-[#E7F2EA] text-[#2F6B41]', dot: 'bg-[#3F8C55]' },
};
const SIGUIENTE: Record<EstadoTarea, EstadoTarea> = { pendiente: 'curso', curso: 'hecha', hecha: 'pendiente' };

const DOT: Record<EstadoTarea, string> = { pendiente: '#A9A79E', curso: '#4E86C6', hecha: '#3F8C55' };
/* Selector de estado con el GooeyMenu de EasyUI */
export function EstadoPill({ t }: { t: Tarea }) {
  const { setEstadoTarea } = useStore();
  return (
    <GooeyMenu
      ariaLabel="Estado"
      value={t.estado}
      onSelect={(v) => v !== t.estado && setEstadoTarea(t.id, v as EstadoTarea)}
      options={(['pendiente', 'curso', 'hecha'] as EstadoTarea[]).map((e) => ({ value: e, label: ESTADOS[e].label, dot: DOT[e] }))}
    />
  );
}

const PRIO: Record<string, { label: string; cls: string }> = {
  alta: { label: 'Alta', cls: 'bg-[#FBEAE5] text-[#9E321C]' },
  media: { label: 'Media', cls: 'bg-[#FBF1DC] text-[#8A5A12]' },
  baja: { label: 'Baja', cls: 'bg-[#E7F2EA] text-[#2F6B41]' },
};
export const PrioridadTag = ({ p }: { p: Prioridad }) =>
  p ? <span className={cn('inline-flex items-center h-6 px-2 rounded-md text-[11px] font-medium', PRIO[p].cls)}>{PRIO[p].label}</span> : <span className="text-text-subtle text-[12px]">—</span>;

export const ClienteTag = ({ id, className }: { id: string; className?: string }) => {
  const c = CLIENTES[id];
  return (
    <span className={cn('inline-flex items-center gap-1.5 min-w-0 text-[12px]', className)}>
      <span className="size-2 rounded-[3px] shrink-0" style={{ background: c?.color ?? '#A9A79E' }} />
      <span className="truncate">{c?.nombre ?? id}</span>
    </span>
  );
};

const vence = (t: Tarea) => t.fin ?? t.inicio;
const atrasada = (t: Tarea) => t.estado !== 'hecha' && !!vence(t) && vence(t)! < HOY;

export const FechaTarea = ({ t }: { t: Tarea }) => (
  <span className={cn('text-[12px] tnum whitespace-nowrap', atrasada(t) ? 'text-rojo font-medium' : 'text-text-secondary')}>
    {t.inicio ? (t.fin ? `${fecha(t.inicio)} → ${fecha(t.fin)}` : fecha(t.inicio, true)) : <span className="text-text-subtle">Sin fecha</span>}
    {atrasada(t) && ' · atrasada'}
  </span>
);

/* DrawCheckbox (EasyUI) */
export function Check({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button role="checkbox" aria-checked={on} aria-label={label} onClick={(e) => { e.stopPropagation(); onClick(); }} className={cn('size-[18px] rounded-md border grid place-items-center shrink-0 transition-colors', on ? 'bg-ink border-ink' : 'border-border-hover bg-white hover:border-text-muted')}>
      <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="#FAFAF6" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} />
      </svg>
    </button>
  );
}

export function TareaRow({ t, conCliente = true }: { t: Tarea; conCliente?: boolean }) {
  const { toggleTarea, abrirTarea } = useStore();
  const hecha = t.estado === 'hecha';
  return (
    <motion.div layout transition={motionTransitions.springSmooth} className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-surface-hover">
      <span className="mt-px"><Check on={hecha} onClick={() => toggleTarea(t.id)} label={t.titulo} /></span>
      <button className="min-w-0 flex-1 text-left" onClick={() => abrirTarea(t.id)}>
        <p className={cn('text-[13px] leading-snug transition-colors hover:underline underline-offset-2', hecha && 'line-through text-text-subtle')}>{t.titulo}</p>
        <p className="text-[11px] text-text-muted mt-0.5 flex flex-wrap items-center gap-x-2">
          {conCliente && <ClienteTag id={t.cliente} className="!text-[11px]" />}
          <FechaTarea t={t} />
          {!!t.checklist?.length && <span className="tnum">· {t.checklist.filter((c) => c.hecha).length}/{t.checklist.length}</span>}
        </p>
      </button>
      <AvatarStack ids={t.quien} size={22} />
    </motion.div>
  );
}

/* ───────── eventos de calendario: tareas + entregas al cliente ───────── */
type Evento = { id: string; dia: string; titulo: string; cliente: string; tipo: 'entrega' | 'final' | 'tarea'; tarea?: Tarea; proyecto?: string; hecho: boolean };

function useEventos(): Evento[] {
  const { proyectos } = useStore();
  const tareas = useTareas();
  return useMemo(() => {
    const ev: Evento[] = [];
    const clienteDe = (p: Proyecto) => Object.keys(CLIENTES).find((k) => CLIENTES[k].proyecto === p.id) ?? p.id;
    proyectos.forEach((p) => {
      p.entregas.forEach((e) => {
        const d = e.fechaISO ?? null;
        if (d && e.estado !== 'interno') ev.push({ id: e.id, dia: d, titulo: e.titulo, cliente: clienteDe(p), tipo: 'entrega', proyecto: p.id, hecho: e.estado === 'aprobado' });
      });
      const hito = p.proximoHito.iso ?? null;
      if (hito && p.etapa < 6) ev.push({ id: p.id + '-hito', dia: hito, titulo: p.proximoHito.titulo, cliente: clienteDe(p), tipo: 'entrega', proyecto: p.id, hecho: false });
      const fin = p.entregaFinalISO ?? null;
      if (fin) ev.push({ id: p.id + '-final', dia: fin, titulo: 'Entrega final', cliente: clienteDe(p), tipo: 'final', proyecto: p.id, hecho: p.etapa >= 6 });
    });
    tareas.forEach((t) => {
      const d = vence(t);
      if (d) ev.push({ id: t.id, dia: d, titulo: t.titulo, cliente: t.cliente, tipo: 'tarea', tarea: t, hecho: t.estado === 'hecha' });
    });
    return ev.sort((a, b) => (a.tipo === 'tarea' ? 1 : 0) - (b.tipo === 'tarea' ? 1 : 0));
  }, [tareas, proyectos]);
}

/* ───────── workspace ───────── */
type VistaDB = 'tabla' | 'cliente' | 'cronograma' | 'calendario' | 'etapas';

export default function Proyectos({ abrir, Etapas }: { abrir: (id: string) => void; Etapas: React.ComponentType<{ abrir: (id: string) => void }> }) {
  const [vista, setVista] = useState<VistaDB>('tabla');
  const [quien, setQuien] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [plantilla, setPlantilla] = useState(false);
  const [autos, setAutos] = useState(false);
  const { autos: reglas } = useStore();
  const toast = useToast();
  const iconos: Record<VistaDB, React.ElementType> = { tabla: Table2, cliente: Columns3, cronograma: GanttChart, calendario: CalendarDays, etapas: Layers };
  const labels: Record<VistaDB, string> = { tabla: 'Todas', cliente: 'Por cliente', cronograma: 'Cronograma', calendario: 'Calendario', etapas: 'Etapas' };

  return (
    <div>
      <p className="eyebrow">Proyectos</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-6">
        <h1 className="h-display text-[clamp(34px,5vw,60px)]">1607 studio to do</h1>
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="ghost" onClick={() => setAutos(true)}><Zap className="size-3.5" /> Automatizaciones <span className="tnum text-text-subtle">{reglas.filter((r) => r.activa).length}</span></Btn>
          <Btn size="sm" variant="secondary" onClick={() => { setVista('tabla'); setNueva(true); }}><Plus className="size-3.5" /> Nueva tarea</Btn>
          <Btn size="sm" onClick={() => setPlantilla(true)}><Sparkles className="size-3.5" /> Nuevo proyecto</Btn>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="max-w-full scroll-x">
          <PillNav size="sm" items={(Object.keys(labels) as VistaDB[]).map((v) => ({ id: v, label: labels[v] }))} value={vista} onChange={(v) => setVista(v as VistaDB)} />
        </div>
        {vista !== 'etapas' && (
          <div className="flex items-center gap-1" role="group" aria-label="Filtrar por persona">
            {EQUIPO.map((m) => (
              <button key={m.id} onClick={() => setQuien(quien === m.id ? null : m.id)} aria-pressed={quien === m.id} aria-label={'Solo ' + m.nombre} className={cn('rounded-full p-0.5 transition-opacity', quien === m.id ? 'ring-2 ring-rojo' : quien ? 'opacity-35 hover:opacity-80' : 'hover:opacity-80')}>
                <Avatar id={m.id} size={24} />
              </button>
            ))}
          </div>
        )}
      </div>

      <Fade k={vista}>
        {vista === 'tabla' && <Tabla quien={quien} nueva={nueva} setNueva={setNueva} />}
        {vista === 'cliente' && <PorCliente quien={quien} />}
        {vista === 'cronograma' && <Cronograma quien={quien} />}
        {vista === 'calendario' && <Calendario quien={quien} abrir={abrir} />}
        {vista === 'etapas' && <Etapas abrir={abrir} />}
      </Fade>
      <NuevoProyectoSheet open={plantilla} onClose={() => setPlantilla(false)} onCreado={(id) => { setPlantilla(false); toast('Proyecto creado con sus tareas y el acceso del cliente'); abrir(id); }} />
      <AutomatizacionesSheet open={autos} onClose={() => setAutos(false)} />
    </div>
  );
}

const ORDEN_P: Record<string, number> = { alta: 0, media: 1, baja: 2 };
const filtrar = (ts: Tarea[], quien: string | null) => (quien ? ts.filter((t) => t.quien.includes(quien)) : ts);

/* ── Tabla (vista "All Projects" de Notion) ── */
function Tabla({ quien, nueva, setNueva }: { quien: string | null; nueva: boolean; setNueva: (b: boolean) => void }) {
  const tareas = useTareas();
  const { abrirTarea } = useStore();
  const [verHechas, setVerHechas] = useState(true);
  const lista = useMemo(
    () =>
      filtrar(tareas, quien)
        .filter((t) => verHechas || t.estado !== 'hecha')
        .sort((a, b) => (a.estado === 'hecha' ? 1 : 0) - (b.estado === 'hecha' ? 1 : 0) || (ORDEN_P[a.prioridad ?? ''] ?? 3) - (ORDEN_P[b.prioridad ?? ''] ?? 3) || (vence(a) ?? '9').localeCompare(vence(b) ?? '9')),
    [tareas, quien, verHechas]
  );
  return (
    <div className="space-y-3">
      <Card className="scroll-x xl:overflow-visible">
        <table className="w-full text-left text-[13px] min-w-[880px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[.06em] text-text-muted">
              {['Cliente', 'Actividad', 'Responsables', 'Estado', 'Prioridad', 'Fecha', 'Equipo'].map((h) => <th key={h} className="font-medium px-3 py-3 first:pl-4">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border border-t border-border">
            {nueva && <FilaNueva onDone={() => setNueva(false)} />}
            <AnimatePresence initial={false}>
              {lista.map((t) => (
                <motion.tr key={t.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => abrirTarea(t.id)} className="hover:bg-surface-hover cursor-pointer">
                  <td className="px-3 pl-4 py-2.5 max-w-[170px]"><ClienteTag id={t.cliente} /></td>
                  <td className={cn('px-3 py-2.5 font-medium', t.estado === 'hecha' && 'text-text-muted')}>{t.titulo}{t.privada && <span className="ml-1.5 text-[10px] text-text-subtle font-normal">· solo vos</span>}{!!t.checklist?.length && <span className="ml-1.5 text-[11px] text-text-subtle font-normal tnum">{t.checklist.filter((c) => c.hecha).length}/{t.checklist.length}</span>}</td>
                  <td className="px-3 py-2.5"><AvatarStack ids={t.quien} size={22} /></td>
                  <td className="px-3 py-2.5"><EstadoPill t={t} /></td>
                  <td className="px-3 py-2.5"><PrioridadTag p={t.prioridad} /></td>
                  <td className="px-3 py-2.5"><FechaTarea t={t} /></td>
                  <td className="px-3 py-2.5 text-[12px] text-text-muted whitespace-nowrap">{t.equipo?.join(', ') ?? '—'}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-text-muted">
        <label className="flex items-center gap-2 cursor-pointer"><Check on={verHechas} onClick={() => setVerHechas(!verHechas)} label="Mostrar hechas" /> Mostrar hechas</label>
        <span>Tocá una fila para abrir la tarea; tocá el estado para elegir otro.</span>
      </div>
    </div>
  );
}

function FilaNueva({ onDone }: { onDone: () => void }) {
  const { agregarTarea, sesion } = useStore();
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [cliente, setCliente] = useState(Object.keys(CLIENTES)[0] ?? '');
  const [quien, setQuien] = useState((sesion as any)?.persona ?? '');
  const [dia, setDia] = useState(addDias(HOY, 7));
  const guardar = () => {
    if (!titulo.trim()) return onDone();
    agregarTarea({ cliente, proyecto: CLIENTES[cliente]?.proyecto, titulo: titulo.trim(), quien: [quien], estado: 'pendiente', prioridad: 'media', inicio: dia || null, equipo: ['Design'] });
    toast('Tarea agregada');
    onDone();
  };
  const sel = 'h-8 rounded-lg bg-surface-raised px-2 text-[12px] outline-none focus:ring-2 focus:ring-[var(--accent-ring)]';
  return (
    <tr className="bg-[#FBFAF6]">
      <td className="px-3 pl-4 py-2"><select id="nt-cliente" aria-label="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className={sel}>{Object.entries(CLIENTES).map(([k, c]) => <option key={k} value={k}>{c.nombre}</option>)}</select></td>
      <td className="px-3 py-2"><input id="nt-titulo" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardar()} placeholder="Qué hay que hacer" className={cn(sel, 'w-full bg-white border border-border')} /></td>
      <td className="px-3 py-2"><select id="nt-quien" aria-label="Responsable" value={quien} onChange={(e) => setQuien(e.target.value)} className={sel}>{EQUIPO.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></td>
      <td className="px-3 py-2 text-[12px] text-text-muted">Sin empezar</td>
      <td className="px-3 py-2 text-[12px] text-text-muted">Media</td>
      <td className="px-3 py-2"><input id="nt-fecha" type="date" aria-label="Fecha" value={dia} onChange={(e) => setDia(e.target.value)} className={sel} /></td>
      <td className="px-3 py-2"><div className="flex gap-1"><Btn size="sm" onClick={guardar}>Guardar</Btn><Btn size="sm" variant="ghost" onClick={onDone}>Cancelar</Btn></div></td>
    </tr>
  );
}

/* ── Por cliente (vista "Works by Client") ── */
function PorCliente({ quien }: { quien: string | null }) {
  const tareas = useTareas();
  const { abrirTarea } = useStore();
  const ts = filtrar(tareas, quien);
  const clientes = Object.keys(CLIENTES).filter((k) => ts.some((t) => t.cliente === k));
  return (
    <div className="scroll-x -mx-4 px-4 lg:mx-0 lg:px-0 pb-3">
      <div className="grid grid-flow-col auto-cols-[248px] gap-3">
        {clientes.map((k) => {
          const propias = ts.filter((t) => t.cliente === k).sort((a, b) => (a.estado === 'hecha' ? 1 : 0) - (b.estado === 'hecha' ? 1 : 0));
          return (
            <div key={k} className="rounded-2xl bg-[#F3F2EC] p-2">
              <div className="flex items-center justify-between px-2 pt-1.5 pb-3">
                <ClienteTag id={k} className="font-medium" />
                <span className="text-[11px] text-text-muted tnum">{propias.length}</span>
              </div>
              <div className="space-y-2">
                {propias.map((t) => (
                  <motion.div key={t.id} layout transition={motionTransitions.springSmooth} onClick={() => abrirTarea(t.id)} className={cn('rounded-xl bg-white border border-border p-3 shadow-xs space-y-2.5 cursor-pointer hover:border-border-hover', t.estado === 'hecha' && 'opacity-60')}>
                    <p className="text-[13px] font-medium leading-snug">{t.titulo}</p>
                    <div className="flex flex-wrap gap-1.5"><EstadoPill t={t} /><PrioridadTag p={t.prioridad} /></div>
                    <div className="flex items-center justify-between"><FechaTarea t={t} /><AvatarStack ids={t.quien} size={20} /></div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Cronograma (vista "Gantt") ── */
function Cronograma({ quien }: { quien: string | null }) {
  const tareas = useTareas();
  const { abrirTarea } = useStore();
  const ts = filtrar(tareas, quien);
  const conFecha = ts.filter((t) => t.inicio);
  const desde = addDias(HOY, -38 - ((new Date(HOY + 'T12:00:00').getDay() + 6) % 7));
  const total = 84; // 12 semanas
  const W = 26;
  const diasArr = Array.from({ length: total }, (_, i) => addDias(desde, i));
  const grupos: { e: EstadoTarea; ts: Tarea[] }[] = (['curso', 'pendiente', 'hecha'] as EstadoTarea[]).map((e) => ({ e, ts: conFecha.filter((t) => t.estado === e).sort((a, b) => a.inicio!.localeCompare(b.inicio!)) }));
  const hoyX = dias(desde, HOY) * W;
  const sinFecha = ts.filter((t) => !t.inicio);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollLeft = Math.max(0, hoyX - 200); }, []);
  return (
    <div className="space-y-3">
      <div ref={ref} className="scroll-x relative rounded-2xl bg-surface border border-border">
        <div style={{ width: 240 + total * W }} className="relative">
          {/* cabecera */}
          <div className="flex sticky top-0 bg-surface z-10 border-b border-border">
            <div className="w-[240px] shrink-0 sticky left-0 bg-surface z-20 px-4 py-2 text-[11px] uppercase tracking-[.06em] text-text-muted flex items-end">Actividad</div>
            {diasArr.map((d) => {
              const dt = new Date(d + 'T12:00:00');
              const lunes = dt.getDay() === 1;
              return (
                <div key={d} style={{ width: W }} className={cn('shrink-0 text-center py-1.5', lunes && 'border-l border-border')}>
                  {(dt.getDate() === 1 || d === desde) && <div className="text-[10px] font-medium uppercase tracking-[.06em] text-text-primary text-left pl-1 whitespace-nowrap">{fecha(d).split(' ')[1]}</div>}
                  {dt.getDate() !== 1 && d !== desde && <div className="h-[15px]" />}
                  <div className={cn('text-[10px] tnum', d === HOY ? 'text-rojo font-bold' : dt.getDay() === 0 || dt.getDay() === 6 ? 'text-text-subtle' : 'text-text-muted')}>{dt.getDate()}</div>
                </div>
              );
            })}
          </div>
          {/* hoy */}
          <div aria-hidden className="absolute top-0 bottom-0 w-px bg-rojo z-[5]" style={{ left: 240 + hoyX + W / 2 }} />
          {grupos.map(({ e, ts: gts }) => (
            <div key={e}>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#FBFAF6] border-b border-border sticky left-0 w-[240px] z-10">
                <span className={cn('size-1.5 rounded-full', ESTADOS[e].dot)} /><span className="text-[12px] font-medium">{ESTADOS[e].label}</span><span className="text-[11px] text-text-muted tnum">{gts.length}</span>
              </div>
              {gts.map((t) => {
                const ini = Math.max(0, dias(desde, t.inicio!));
                const largo = Math.max(1, dias(t.inicio!, t.fin ?? t.inicio!) + 1);
                const color = CLIENTES[t.cliente]?.color ?? '#A9A79E';
                return (
                  <div key={t.id} className="flex items-center border-b border-border-subtle h-11 relative">
                    <div className="w-[240px] shrink-0 sticky left-0 bg-surface z-10 px-4 flex items-center gap-2 h-full border-r border-border-subtle">
                      <span className="size-2 rounded-[3px] shrink-0" style={{ background: color }} />
                      <button onClick={() => abrirTarea(t.id)} className={cn('text-[12px] truncate text-left hover:underline underline-offset-2', t.estado === 'hecha' && 'text-text-muted')}>{t.titulo}</button>
                    </div>
                    <div className="relative h-full" style={{ width: total * W }}>
                      <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={motionTransitions.springGentle}
                        className="absolute top-2 h-7 rounded-lg flex items-center gap-1.5 px-1.5 origin-left overflow-hidden"
                        style={{ left: ini * W + 2, width: largo * W - 4, background: color + (t.estado === 'hecha' ? '33' : '2E'), boxShadow: `inset 0 0 0 1px ${color}66` }}
                        title={`${t.titulo} · ${fecha(t.inicio)}${t.fin ? ' → ' + fecha(t.fin) : ''}`}
                      >
                        {t.quien.slice(0, 1).map((q) => <Avatar key={q} id={q} size={18} />)}
                        {largo > 3 && <span className="text-[11px] truncate text-text-primary">{t.titulo}</span>}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-rojo" />Hoy</span>
        {sinFecha.length > 0 && <span>{sinFecha.length} tareas sin fecha no aparecen acá: {sinFecha.map((t) => t.titulo).join(', ')}.</span>}
      </p>
    </div>
  );
}

/* ── Calendario de entregas ── */
const NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
function Calendario({ quien, abrir }: { quien: string | null; abrir: (id: string) => void }) {
  const todos = useEventos();
  const { abrirTarea } = useStore();
  const [mes, setMes] = useState(Number(HOY.slice(5, 7)) - 1 + (Number(HOY.slice(0, 4)) - 2026) * 12);
  const [soloEntregas, setSoloEntregas] = useState(false);
  const [sel, setSel] = useState<string>(() => [...todos].map((e) => e.dia).filter((d) => d >= HOY).sort()[0] ?? HOY);
  const eventos = todos.filter((e) => (soloEntregas ? e.tipo !== 'tarea' : true) && (!quien || e.tipo !== 'tarea' || e.tarea!.quien.includes(quien)));
  const porDia = useMemo(() => {
    const m = new Map<string, Evento[]>();
    eventos.forEach((e) => m.set(e.dia, [...(m.get(e.dia) ?? []), e]));
    return m;
  }, [eventos]);

  const anio = 2026 + Math.floor(mes / 12);
  const mm = ((mes % 12) + 12) % 12;
  const primero = new Date(anio, mm, 1, 12);
  const offset = (primero.getDay() + 6) % 7; // lunes primero
  const enMes = new Date(anio, mm + 1, 0).getDate();
  const celdas = Math.ceil((offset + enMes) / 7) * 7;
  const iso = (d: number) => `${anio}-${String(mm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const delDia = porDia.get(sel) ?? [];

  const chip = (e: Evento, compact = false) => {
    const color = CLIENTES[e.cliente]?.color ?? '#A9A79E';
    const entrega = e.tipo !== 'tarea';
    return (
      <span
        key={e.id}
        className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-tight min-w-0', entrega ? 'bg-ink text-[#FAFAF6]' : 'bg-surface-raised text-text-primary', e.hecho && 'opacity-50')}
        title={`${CLIENTES[e.cliente]?.nombre ?? ''} · ${e.titulo}`}
      >
        {entrega ? <Flag className="size-2.5 shrink-0 text-rojo" fill="currentColor" /> : <span className="size-1.5 rounded-full shrink-0" style={{ background: color }} />}
        {!compact && <span className="truncate">{e.titulo}</span>}
      </span>
    );
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-5">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button aria-label="Mes anterior" onClick={() => setMes((m) => m - 1)} className="grid place-items-center size-8 rounded-full hover:bg-surface-raised"><ChevronLeft className="size-4" /></button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2 key={mes} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={motionTransitions.springSnappy} className="text-[22px] font-bold tracking-[-0.025em] w-[170px] text-center">
                {NOMBRES_MES[mm]} <span className="text-text-subtle font-normal">{anio}</span>
              </motion.h2>
            </AnimatePresence>
            <button aria-label="Mes siguiente" onClick={() => setMes((m) => m + 1)} className="grid place-items-center size-8 rounded-full hover:bg-surface-raised"><ChevronRight className="size-4" /></button>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer"><Check on={soloEntregas} onClick={() => setSoloEntregas(!soloEntregas)} label="Solo entregas" /> Solo entregas al cliente</label>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 text-[11px] uppercase tracking-[.06em] text-text-muted border-b border-border">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: celdas }).map((_, i) => {
              const d = i - offset + 1;
              const valido = d >= 1 && d <= enMes;
              const dia = valido ? iso(d) : '';
              const evs = valido ? porDia.get(dia) ?? [] : [];
              const esHoy = dia === HOY;
              const esSel = dia === sel;
              return (
                <button
                  key={i}
                  disabled={!valido}
                  onClick={() => setSel(dia)}
                  className={cn('relative flex flex-col items-stretch justify-start text-left min-h-[64px] sm:min-h-[104px] p-1.5 border-b border-r border-border-subtle [&:nth-child(7n)]:border-r-0 transition-colors', valido ? 'hover:bg-surface-hover' : 'bg-[#FBFAF6]', esSel && 'bg-[#FBF4F1]')}
                >
                  {valido && (
                    <span className={cn('inline-grid place-items-center size-6 rounded-full text-[12px] tnum', esHoy ? 'bg-rojo text-white font-bold' : 'text-text-secondary')}>{d}</span>
                  )}
                  {esSel && <motion.span layoutId="cal-sel" className="absolute inset-0 ring-2 ring-inset ring-[#C74227]/40 pointer-events-none" transition={motionTransitions.springSnappy} />}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-1">
                    {evs.slice(0, 3).map((e) => chip(e))}
                    {evs.length > 3 && <span className="text-[10px] text-text-muted px-1">+{evs.length - 3} más</span>}
                  </div>
                  <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                    {evs.slice(0, 4).map((e) => <span key={e.id} className={cn('size-1.5 rounded-full', e.tipo !== 'tarea' ? 'bg-rojo' : 'bg-text-subtle')} />)}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <p className="text-[12px] text-text-muted flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5"><span className="inline-flex items-center rounded bg-ink px-1 py-0.5"><Flag className="size-2.5 text-rojo" fill="currentColor" /></span>Entrega o hito con el cliente</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-text-subtle" />Tarea interna, en su fecha límite</span>
        </p>
      </div>

      <aside className="min-w-0">
        <Card className="p-4 xl:sticky xl:top-6">
          <p className="eyebrow">{sel === HOY ? 'Hoy' : 'Día elegido'}</p>
          <p className="text-[18px] font-bold tracking-[-0.02em] mt-1 capitalize">{fecha(sel, true)}</p>
          <div className="mt-4 space-y-2">
            {delDia.length ? (
              delDia.map((e) => (
                <motion.div key={e.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <ClienteTag id={e.cliente} className="!text-[11px] text-text-muted" />
                    {e.tipo !== 'tarea' ? <span className="text-[10px] font-medium uppercase tracking-[.06em] text-rojo">{e.tipo === 'final' ? 'Entrega final' : 'Entrega'}</span> : <EstadoPill t={e.tarea!} />}
                  </div>
                  {e.tarea ? <button onClick={() => abrirTarea(e.tarea!.id)} className={cn('block text-left text-[13px] font-medium mt-1.5 hover:underline underline-offset-2', e.hecho && 'text-text-muted line-through')}>{e.titulo}</button> : <p className={cn('text-[13px] font-medium mt-1.5', e.hecho && 'text-text-muted line-through')}>{e.titulo}</p>}
                  <div className="flex items-center justify-between mt-2">
                    {e.tarea ? <AvatarStack ids={e.tarea.quien} size={20} /> : <span />}
                    {e.proyecto && <button onClick={() => abrir(e.proyecto!)} className="text-[11px] text-text-muted hover:text-text-primary underline underline-offset-2">Abrir proyecto</button>}
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-[13px] text-text-muted">Nada agendado para este día.</p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}

export { ETAPAS };
