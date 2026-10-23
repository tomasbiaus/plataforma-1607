import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Link2, Lock, Zap, ArrowUpRight, Sparkles, ListChecks, StickyNote, History, Trash2, KeyRound, LogOut, Archive, ArchiveRestore } from 'lucide-react';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from './easyui/sheet';
import { Avatar, Btn, TemaSwitch, useToast, ConfirmBtn } from './ui';
import { useStore, useArchivo, type NuevoProyecto } from './store';
import { CLIENTES, EQUIPO, ETAPAS, HOY, fecha, addDias, persona, adminId, disenadores, type Prioridad } from './data';
import { PLANES, tareasDePlantilla, type Plan } from './plantilla';
import { EstadoPill, Check, ClienteTag } from './Proyectos';
import { DatePicker, DateRangePicker } from './easyui/DatePicker';

const quienNombre = (q: string) => (q === 'auto' ? 'Automatización' : q === 'cliente' ? 'Cliente' : persona(q)?.nombre ?? q);

/* Fila de propiedad estilo Notion */
const Prop = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 min-h-[34px]">
    <span className="text-[12px] text-text-muted">{label}</span>
    <div className="min-w-0 flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
);

/* ───────── 1. La tarea como página ───────── */
export function TareaPanel({ abrirProyecto }: { abrirProyecto: (id: string) => void }) {
  const { tareas, tareaAbierta, abrirTarea, actualizarTarea, proyectos, archivarTareas, borrarTareas } = useStore();
  const toast = useToast();
  const t = tareas.find((x) => x.id === tareaAbierta);
  const [nuevoItem, setNuevoItem] = useState('');
  const [link, setLink] = useState({ titulo: '', url: '' });
  const [verLink, setVerLink] = useState(false);
  const p = t?.proyecto ? proyectos.find((x) => x.id === t.proyecto) : undefined;
  const hechos = t?.checklist?.filter((c) => c.hecha).length ?? 0;

  return (
    <Sheet open={!!t} onOpenChange={(o) => !o && abrirTarea(null)}>
      <SheetContent side="right" className="max-w-[34rem] bg-[var(--surface)] border-border text-text-primary">
        {t && (
          <>
            <SheetHeader className="pt-6 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <ClienteTag id={t.cliente} className="text-text-muted" />
                {t.privada && <span className="inline-flex items-center gap-1 text-[11px] text-text-muted"><Lock className="size-3" />Solo vos</span>}
                {t.plantilla && <span className="inline-flex items-center gap-1 text-[11px] text-text-muted"><Sparkles className="size-3" />De plantilla</span>}
              </div>
              <SheetTitle className="font-bold">
                <textarea
                  id={'titulo-' + t.id}
                  aria-label="Título de la tarea"
                  value={t.titulo}
                  rows={1}
                  onChange={(e) => actualizarTarea(t.id, { titulo: e.target.value.replace(/\n/g, '') })}
                  className="w-full resize-none bg-transparent outline-none text-[24px] leading-[1.15] tracking-[-0.03em] font-bold [field-sizing:content]"
                />
              </SheetTitle>
              <SheetDescription className="sr-only">Detalle de la tarea</SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-7 pb-8">
              <div className="space-y-1">
                <Prop label="Estado"><EstadoPill t={t} /></Prop>
                <Prop label="Prioridad">
                  {(['alta', 'media', 'baja'] as Prioridad[]).map((pr) => (
                    <button key={pr} onClick={() => actualizarTarea(t.id, { prioridad: t.prioridad === pr ? null : pr }, `cambió la prioridad a ${pr}`)} className={cn('h-6 px-2 rounded-md text-[11px] font-medium capitalize transition-colors', t.prioridad === pr ? (pr === 'alta' ? 'bg-err-bg text-err-fg' : pr === 'media' ? 'bg-warn-bg text-warn-fg' : 'bg-ok-bg text-ok-fg') : 'text-text-muted hover:bg-surface-raised')}>{pr}</button>
                  ))}
                </Prop>
                <Prop label="Responsables">
                  {EQUIPO.map((m) => {
                    const on = t.quien.includes(m.id);
                    return (
                      <button key={m.id} aria-pressed={on} aria-label={m.nombre} onClick={() => actualizarTarea(t.id, { quien: on ? t.quien.filter((q) => q !== m.id) : [...t.quien, m.id] }, `${on ? 'sacó' : 'sumó'} a ${m.nombre}`)} className={cn('inline-flex items-center gap-1.5 h-7 pl-0.5 pr-2.5 rounded-full text-[12px] transition-all', on ? 'bg-surface-raised text-text-primary' : 'text-text-subtle opacity-60 hover:opacity-100')}>
                        <Avatar id={m.id} size={24} /> {m.nombre}
                      </button>
                    );
                  })}
                </Prop>
                <Prop label="Fecha">
                  <DateRangePicker aria-label="Fechas de la tarea" desde={t.inicio} hasta={t.fin} placeholder="Sin fecha" onChange={(d, h) => actualizarTarea(t.id, { inicio: d, fin: h }, d ? 'cambió la fecha' : 'sacó la fecha')} />
                </Prop>
                <Prop label="Equipo">
                  {(['Brand Strategist', 'Design'] as const).map((eq) => {
                    const on = t.equipo?.includes(eq);
                    return <button key={eq} onClick={() => actualizarTarea(t.id, { equipo: on ? t.equipo!.filter((x) => x !== eq) : [...(t.equipo ?? []), eq] })} className={cn('h-6 px-2 rounded-md text-[11px] font-medium transition-colors', on ? (eq === 'Design' ? 'bg-[#FBEDE4] text-[#9A4A1A]' : 'bg-info-bg text-info-fg') : 'text-text-muted hover:bg-surface-raised')}>{eq}</button>;
                  })}
                </Prop>
                {p && (
                  <Prop label="Proyecto">
                    <button onClick={() => { abrirTarea(null); abrirProyecto(p.id); }} className="inline-flex items-center gap-1 text-[13px] hover:underline underline-offset-2">{p.nombre}<ArrowUpRight className="size-3.5 text-text-subtle" /></button>
                    {t.etapa && <span className="text-[11px] text-text-muted">· {t.etapa}</span>}
                  </Prop>
                )}
              </div>

              {/* Checklist */}
              <section>
                <h3 className="eyebrow mb-2 flex items-center gap-1.5"><ListChecks className="size-3.5" />Checklist {t.checklist?.length ? <span className="tnum normal-case tracking-normal">· {hechos}/{t.checklist.length}</span> : null}</h3>
                {!!t.checklist?.length && (
                  <div className="h-1 rounded-full bg-surface-raised overflow-hidden mb-2">
                    <motion.div className="h-full bg-ink" initial={false} animate={{ width: `${(hechos / t.checklist.length) * 100}%` }} transition={motionTransitions.springGentle} />
                  </div>
                )}
                <ul className="space-y-0.5">
                  <AnimatePresence initial={false}>
                    {t.checklist?.map((c) => (
                      <motion.li key={c.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-surface-hover">
                        <Check on={c.hecha} label={c.texto} onClick={() => actualizarTarea(t.id, { checklist: t.checklist!.map((x) => (x.id === c.id ? { ...x, hecha: !x.hecha } : x)) })} />
                        <span className={cn('flex-1 text-[13px]', c.hecha && 'line-through text-text-subtle')}>{c.texto}</span>
                        <button aria-label="Borrar" onClick={() => actualizarTarea(t.id, { checklist: t.checklist!.filter((x) => x.id !== c.id) })} className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-text-primary"><Trash2 className="size-3.5" /></button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <form onSubmit={(e) => { e.preventDefault(); if (!nuevoItem.trim()) return; actualizarTarea(t.id, { checklist: [...(t.checklist ?? []), { id: 'c' + Date.now(), texto: nuevoItem.trim(), hecha: false }] }); setNuevoItem(''); }} className="flex items-center gap-2.5 px-1.5 py-1">
                  <Plus className="size-4 text-text-subtle" />
                  <input id={'check-' + t.id} value={nuevoItem} onChange={(e) => setNuevoItem(e.target.value)} placeholder="Agregar un paso y Enter" className="flex-1 h-7 bg-transparent outline-none text-[13px] placeholder:text-text-subtle" />
                </form>
              </section>

              {/* Notas */}
              <section>
                <h3 className="eyebrow mb-2 flex items-center gap-1.5"><StickyNote className="size-3.5" />Notas</h3>
                <textarea id={'notas-' + t.id} value={t.notas ?? ''} onChange={(e) => actualizarTarea(t.id, { notas: e.target.value })} rows={4} placeholder="Escribí el contexto, decisiones, lo que pidió el cliente…" className="w-full rounded-xl bg-[var(--bg)] border border-border p-3 text-[13px] leading-relaxed outline-none focus:border-border-hover resize-y" />
              </section>

              {/* Referencias */}
              <section>
                <h3 className="eyebrow mb-2 flex items-center gap-1.5"><Link2 className="size-3.5" />Referencias</h3>
                <ul className="space-y-1.5">
                  {t.links?.map((l, i) => (
                    <li key={i} className="group flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <Link2 className="size-3.5 text-text-subtle shrink-0" />
                      <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-[13px] truncate hover:underline underline-offset-2">{l.titulo || l.url}</a>
                      <button aria-label="Quitar" onClick={() => actualizarTarea(t.id, { links: t.links!.filter((_, j) => j !== i) })} className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-text-primary"><X className="size-3.5" /></button>
                    </li>
                  ))}
                </ul>
                <AnimatePresence initial={false}>
                  {verLink ? (
                    <motion.form key="f" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" onSubmit={(e) => { e.preventDefault(); if (!link.url.trim()) return; const url = /^https?:\/\//.test(link.url) ? link.url : 'https://' + link.url; actualizarTarea(t.id, { links: [...(t.links ?? []), { titulo: link.titulo.trim(), url }] }, 'sumó una referencia'); setLink({ titulo: '', url: '' }); setVerLink(false); }}>
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        <input id="link-titulo" value={link.titulo} onChange={(e) => setLink({ ...link, titulo: e.target.value })} placeholder="Nombre (opcional)" className="h-9 rounded-lg bg-surface-raised px-3 text-[13px] outline-none" />
                        <input id="link-url" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="Link (Figma, Drive, Pinterest…)" className="h-9 rounded-lg bg-surface-raised px-3 text-[13px] outline-none" />
                      </div>
                      <div className="flex justify-end gap-1 mt-2"><Btn size="sm" variant="ghost" type="button" onClick={() => setVerLink(false)}>Cancelar</Btn><Btn size="sm" type="submit">Agregar</Btn></div>
                    </motion.form>
                  ) : (
                    <button key="b" onClick={() => setVerLink(true)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary"><Plus className="size-3.5" />Agregar link</button>
                  )}
                </AnimatePresence>
              </section>

              {/* Historial */}
              <section>
                <h3 className="eyebrow mb-3 flex items-center gap-1.5"><History className="size-3.5" />Historial</h3>
                <ol className="space-y-2.5">
                  {[...(t.historial ?? [])].reverse().map((h, i) => (
                    <li key={i} className="flex gap-2.5 text-[12px]">
                      {h.quien === 'auto' ? <span className="grid place-items-center size-5 rounded-full bg-rojo text-white shrink-0"><Zap className="size-3" /></span> : h.quien === 'cliente' ? <span className="size-5 rounded-full bg-err-bg shrink-0" /> : <Avatar id={h.quien} size={20} />}
                      <span className="text-text-secondary"><span className="text-text-primary font-medium">{quienNombre(h.quien)}</span> {h.texto} <span className="text-text-subtle">· {h.cuando}</span></span>
                    </li>
                  ))}
                  {!t.historial?.length && <li className="text-[12px] text-text-subtle">{t.notion ? 'Importada desde Notion.' : 'Sin cambios todavía.'}</li>}
                </ol>
              </section>
            </SheetBody>
            <SheetFooter className="justify-between">
              {t.archivada ? (
                <Btn size="sm" variant="secondary" onClick={() => { archivarTareas([t.id], false); toast('Volvió a la lista de tareas'); }}><ArchiveRestore className="size-3.5" />Sacar del archivo</Btn>
              ) : (
                <Btn size="sm" variant={t.estado === 'hecha' ? 'primary' : 'secondary'} onClick={() => { archivarTareas([t.id]); toast('Tarea archivada. La encontrás en Archivo.'); }}><Archive className="size-3.5" />Archivar</Btn>
              )}
              <ConfirmBtn onConfirm={() => { borrarTareas([t.id]); toast('Tarea borrada'); }} confirmText="¿Borrar para siempre?"><Trash2 className="size-3.5" />Borrar</ConfirmBtn>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* Archivo: tareas terminadas guardadas fuera de las vistas */
export function ArchivoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { archivarTareas, borrarTareas } = useStore();
  const archivo = useArchivo();
  const toast = useToast();
  const lista = [...archivo].sort((a, b) => (b.fin ?? b.inicio ?? '').localeCompare(a.fin ?? a.inicio ?? ''));
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="max-w-[32rem]">
        <SheetHeader className="pt-6">
          <SheetTitle className="text-[22px] font-bold tracking-[-0.03em] flex items-center gap-2"><Archive className="size-5" />Archivo</SheetTitle>
          <SheetDescription className="text-[13px] text-text-muted">Tareas terminadas que sacaste de las vistas. No se pierde nada: podés devolverlas o borrarlas para siempre.</SheetDescription>
        </SheetHeader>
        <SheetBody className="pb-6">
          {!lista.length ? (
            <div className="py-16 text-center text-[13px] text-text-muted">El archivo está vacío.</div>
          ) : (
            <ul className="divide-y divide-border-subtle -mx-1">
              <AnimatePresence initial={false}>
                {lista.map((t) => (
                  <motion.li key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 py-3 px-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] truncate">{t.titulo}</p>
                      <p className="text-[11px] text-text-muted truncate">{CLIENTES[t.cliente]?.nombre ?? 'Sin cliente'}{t.inicio ? ' · ' + fecha(t.inicio) : ''}</p>
                    </div>
                    <button onClick={() => { archivarTareas([t.id], false); toast('Volvió a la lista de tareas'); }} title="Sacar del archivo" aria-label={'Sacar del archivo: ' + t.titulo} className="grid place-items-center size-8 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised"><ArchiveRestore className="size-4" /></button>
                    <ConfirmBtn onConfirm={() => borrarTareas([t.id])} confirmText="¿Borrar?" className="!px-2.5"><Trash2 className="size-3.5" /></ConfirmBtn>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </SheetBody>
        {lista.length > 1 && (
          <SheetFooter className="justify-between">
            <span className="text-[12px] text-text-muted">{lista.length} tareas archivadas</span>
            <ConfirmBtn onConfirm={() => { borrarTareas(lista.map((t) => t.id)); toast('Archivo vaciado'); }} confirmText={`¿Borrar las ${lista.length}?`}><Trash2 className="size-3.5" />Vaciar archivo</ConfirmBtn>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ───────── 2. Plantilla "Nuevo proyecto" ───────── */
export function NuevoProyectoSheet({ open, onClose, onCreado }: { open: boolean; onClose: () => void; onCreado: (id: string) => void }) {
  const { crearProyecto } = useStore();
  const vacio = (): NuevoProyecto => ({ cliente: '', plan: 'Brand Core', inicio: addDias(HOY, 4), email: '', diseno: disenadores()[0]?.id ?? adminId() });
  const [f, setF] = useState<NuevoProyecto>(vacio);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const preview = useMemo(() => tareasDePlantilla({ plan: f.plan, inicio: f.inicio || HOY, cliente: 'x', proyecto: 'x', estrategia: adminId(), diseno: f.diseno, nombreCliente: f.cliente || 'el cliente' }), [f]);
  const crear = async () => {
    if (!f.cliente.trim()) return setError('Poné el nombre del cliente.');
    setCreando(true);
    try {
      const id = await crearProyecto({ ...f, cliente: f.cliente.trim() });
      setF(vacio());
      setError(null);
      onCreado(id);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo crear el proyecto');
    } finally {
      setCreando(false);
    }
  };
  const campo = 'w-full h-10 rounded-lg bg-surface-raised px-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent-ring)]';
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="max-w-[36rem] bg-[var(--surface)] border-border text-text-primary">
        <SheetHeader className="pt-6">
          <p className="eyebrow flex items-center gap-1.5"><Sparkles className="size-3.5" />Plantilla</p>
          <SheetTitle className="text-[24px] font-bold tracking-[-0.03em]">Nuevo proyecto</SheetTitle>
          <SheetDescription className="text-[13px] text-text-muted">Crea el proyecto, sus entregas, las cuotas 50/25/25 y todas las tareas de las 6 etapas con fechas y responsables. El acceso del cliente se crea después desde Clientes.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-6 pb-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1.5 sm:col-span-2"><span className="text-[12px] text-text-muted">Cliente</span><input id="np-cliente" className={campo} value={f.cliente} onChange={(e) => { setF({ ...f, cliente: e.target.value }); setError(null); }} placeholder="Ej: Café Nómade" /></label>
            <label className="space-y-1.5 sm:col-span-2"><span className="text-[12px] text-text-muted">Arranca el</span><DatePicker id="np-inicio" value={f.inicio} onChange={(d) => setF({ ...f, inicio: d ?? HOY })} /></label>
          </div>

          <div>
            <p className="text-[12px] text-text-muted mb-2">Plan</p>
            <div className="grid gap-2">
              {(Object.keys(PLANES) as Plan[]).map((pl) => {
                const on = f.plan === pl;
                return (
                  <button key={pl} onClick={() => setF({ ...f, plan: pl })} className={cn('relative text-left rounded-xl border p-3 transition-colors', on ? 'border-ink bg-[var(--bg)]' : 'border-border hover:border-border-hover')}>
                    {on && <motion.span layoutId="plan-dot" className="absolute right-3 top-3 size-2 rounded-full bg-rojo" transition={motionTransitions.springSnappy} />}
                    <span className="block text-[13px] font-medium">{pl}</span>
                    <span className="block text-[12px] text-text-muted mt-0.5 pr-5">{PLANES[pl].resumen}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[12px] text-text-muted mb-2">Diseño a cargo de</p>
            <div className="flex flex-wrap gap-1.5">
              {disenadores().map((m) => (
                <button key={m.id} onClick={() => setF({ ...f, diseno: m.id })} aria-pressed={f.diseno === m.id} className={cn('inline-flex items-center gap-1.5 h-8 pl-0.5 pr-3 rounded-full text-[12px] transition-colors', f.diseno === m.id ? 'bg-ink text-on-ink' : 'bg-surface-raised text-text-secondary')}>
                  <Avatar id={m.id} size={28} />{m.nombre}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-subtle mt-2">La estrategia (brief, research, presentaciones) queda a cargo de {persona(adminId()).nombre}.</p>
          </div>

          <div>
            <p className="text-[12px] text-text-muted mb-2">Se van a crear {preview.length} tareas · entrega final el {fecha(addDias(f.inicio || HOY, 42), true)}</p>
            <div className="rounded-xl border border-border divide-y divide-border">
              {ETAPAS.map((et) => {
                const ts = preview.filter((x) => x.etapa === et);
                return (
                  <div key={et} className="px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[.06em] text-text-muted mb-1.5">{et}</p>
                    <AnimatePresence initial={false}>
                      {ts.map((x) => (
                        <motion.div key={x.titulo} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 py-0.5 text-[12px]">
                          <Avatar id={x.quien[0]} size={18} />
                          <span className="flex-1 min-w-0 truncate">{x.titulo}</span>
                          <span className="text-text-subtle tnum whitespace-nowrap">{fecha(x.inicio)}{x.fin ? ' → ' + fecha(x.fin) : ''}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetBody>
        <SheetFooter className="border-border justify-between">
          <span className="text-[12px] text-rojo min-h-[1em]">{error}</span>
          <div className="flex gap-2"><Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn><Btn size="sm" disabled={creando} onClick={crear}>{creando ? 'Creando…' : 'Crear proyecto'}</Btn></div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ───────── 4. Automatizaciones ───────── */
function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={cn('relative h-6 w-10 rounded-full transition-colors shrink-0', on ? 'bg-rojo' : 'bg-border-hover')}>
      <motion.span layout transition={motionTransitions.springSnappy} className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow', on ? 'right-0.5' : 'left-0.5')} />
    </button>
  );
}

export function AutomatizacionesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { autos, toggleAuto, autoLog } = useStore();
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="max-w-[32rem] bg-[var(--surface)] border-border text-text-primary">
        <SheetHeader className="pt-6">
          <p className="eyebrow flex items-center gap-1.5"><Zap className="size-3.5" />Automatizaciones</p>
          <SheetTitle className="text-[24px] font-bold tracking-[-0.03em]">Lo que pasa solo</SheetTitle>
          <SheetDescription className="text-[13px] text-text-muted">Reglas que mueven proyectos y crean tareas sin que nadie lo tenga que hacer a mano.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3 pb-6">
          {autos.map((a) => (
            <div key={a.id} className={cn('rounded-xl border p-4 transition-colors', a.activa ? 'border-border' : 'border-border-subtle opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[.06em] text-text-muted">Cuando</p>
                  <p className="text-[14px] font-medium mt-0.5">{a.cuando}</p>
                  <p className="text-[11px] uppercase tracking-[.06em] text-text-muted mt-3">Entonces</p>
                  <p className="text-[13px] text-text-secondary mt-0.5">{a.entonces}</p>
                </div>
                <Switch on={a.activa} onClick={() => toggleAuto(a.id)} label={a.cuando} />
              </div>
            </div>
          ))}
          <div className="pt-4">
            <p className="eyebrow mb-2">Últimas ejecuciones</p>
            {autoLog.length ? (
              <ol className="space-y-2">
                {autoLog.map((l, i) => <li key={i} className="flex gap-2 text-[12px]"><Zap className="size-3.5 text-rojo shrink-0 mt-0.5" /><span>{l.texto} <span className="text-text-subtle">· {l.cuando}</span></span></li>)}
              </ol>
            ) : (
              <p className="text-[12px] text-text-muted">Todavía no se disparó ninguna.</p>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* Mi cuenta: tema + cambiar contraseña. Lo usan el equipo y los clientes. */
export function CuentaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cambiarClave, salir, email } = useStore();
  const toast = useToast();
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' });
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cerrar = () => { setF({ actual: '', nueva: '', repetir: '' }); setError(null); onClose(); };
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.actual) return setError('Escribí tu contraseña actual.');
    if (f.nueva.length < 8) return setError('La nueva contraseña tiene que tener al menos 8 caracteres.');
    if (f.nueva !== f.repetir) return setError('Las dos contraseñas nuevas no coinciden.');
    setGuardando(true);
    const err = await cambiarClave(f.nueva, f.actual);
    setGuardando(false);
    if (err) return setError(err);
    toast('Listo, tu contraseña nueva ya funciona.');
    cerrar();
  };
  const campo = 'h-10 w-full rounded-lg bg-surface-raised border border-transparent px-3 text-[13px] outline-none focus:border-border-hover focus:ring-2 focus:ring-[var(--accent-ring)]';
  return (
    <Sheet open={open} onOpenChange={(o) => !o && cerrar()}>
      <SheetContent side="right" className="max-w-[26rem]">
        <SheetHeader className="pt-6">
          <SheetTitle className="text-[22px] font-bold tracking-[-0.03em]">Mi cuenta</SheetTitle>
          <SheetDescription className="text-[13px] text-text-muted">{email}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-8 pb-8">
          <section className="space-y-3">
            <h3 className="eyebrow">Apariencia</h3>
            <TemaSwitch conTexto className="w-full" />
            <p className="text-[12px] text-text-muted">Automático sigue el modo de tu compu o celular.</p>
          </section>
          <form onSubmit={guardar} className="space-y-3" noValidate>
            <h3 className="eyebrow flex items-center gap-1.5"><KeyRound className="size-3.5" />Cambiar contraseña</h3>
            <label className="block space-y-1.5"><span className="text-[12px] text-text-muted">Contraseña actual</span>
              <input id="cuenta-actual" type={ver ? 'text' : 'password'} autoComplete="current-password" value={f.actual} onChange={(e) => { setF({ ...f, actual: e.target.value }); setError(null); }} className={campo} /></label>
            <label className="block space-y-1.5"><span className="text-[12px] text-text-muted">Nueva contraseña</span>
              <input id="cuenta-nueva" type={ver ? 'text' : 'password'} autoComplete="new-password" value={f.nueva} onChange={(e) => { setF({ ...f, nueva: e.target.value }); setError(null); }} placeholder="Mínimo 8 caracteres" className={campo} /></label>
            <label className="block space-y-1.5"><span className="text-[12px] text-text-muted">Repetila</span>
              <input id="cuenta-repetir" type={ver ? 'text' : 'password'} autoComplete="new-password" value={f.repetir} onChange={(e) => { setF({ ...f, repetir: e.target.value }); setError(null); }} className={campo} /></label>
            <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer select-none"><input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} className="accent-[var(--rojo)]" />Mostrar contraseñas</label>
            {error && <div className="p-3 rounded-lg bg-err-bg text-err-fg text-[12px]">{error}</div>}
            <Btn type="submit" className="w-full" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar contraseña'}</Btn>
          </form>
        </SheetBody>
        <SheetFooter className="justify-start">
          <Btn variant="ghost" size="sm" onClick={() => salir()}><LogOut className="size-3.5" />Cerrar sesión</Btn>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
