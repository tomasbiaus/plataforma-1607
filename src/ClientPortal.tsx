import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, MessageSquare, LogOut, CalendarDays, Check as CheckIcon, UserRound } from 'lucide-react';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { Stepper } from './easyui/stepper';
import { DragToConfirm } from './easyui/DragToConfirm';
import { UnfoldAccordion } from './easyui/UnfoldAccordion';
import { Logo, TemaSwitch, Avatar, EstadoBadge, PillNav, Btn, Card, Preview, Fade, useToast } from './ui';
import { useStore } from './store';
import { CuentaSheet } from './Paneles';
import { ETAPAS, ETAPA_DESC, persona, usd, type Proyecto, type Entrega } from './data';

type Tab = 'proyecto' | 'entregables' | 'pagos';

export default function ClientPortal({ proyectoId, preview = false, onSalirPreview }: { proyectoId: string; preview?: boolean; onSalirPreview?: () => void }) {
  const { proyectos, salir } = useStore();
  const p = proyectos.find((x) => x.id === proyectoId)!;
  const [tab, setTab] = useState<Tab>('proyecto');
  const [cuenta, setCuenta] = useState(false);
  const visibles = p.entregas.filter((e) => e.estado !== 'interno');
  const porRevisar = visibles.filter((e) => e.estado === 'enviado');

  return (
    <div className="min-h-full">
      {preview && (
        <div className="bg-ink text-on-ink gutter py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px]">
          <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-rojo" />Vista previa: así ve {p.cliente} su portal</span>
          <button onClick={onSalirPreview} className="inline-flex items-center gap-1 underline underline-offset-2"><ArrowLeft className="size-3" />Volver al estudio</button>
        </div>
      )}

      <header className="sticky z-30 gutter pt-4 pb-3 bg-[var(--bg)]/85 backdrop-blur-xl" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[1180px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo className="w-[54px]" />
            <span className="text-text-subtle text-[13px]">×</span>
            <span className="text-[14px] font-bold tracking-[-0.02em]">{p.cliente}</span>
          </div>
          <div className="order-3 w-full sm:order-none sm:w-auto flex justify-center">
            <PillNav items={[{ id: 'proyecto', label: 'Proyecto' }, { id: 'entregables', label: 'Entregables', count: visibles.length }]} value={tab} onChange={(v) => setTab(v as Tab)} />
          </div>
          <div className="flex items-center gap-2">
            <TemaSwitch />
            {!preview && (
              <button onClick={() => setCuenta(true)} aria-label="Mi cuenta" title="Mi cuenta: contraseña y apariencia" className="glass grid place-items-center size-9 rounded-full text-text-secondary hover:text-text-primary">
                <UserRound className="size-4" />
              </button>
            )}
            <button onClick={() => (preview ? onSalirPreview?.() : salir())} className="glass inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary">
              <LogOut className="size-3.5" /> {preview ? 'Cerrar vista' : 'Salir'}
            </button>
          </div>
        </div>
      </header>

      <main className="gutter pb-16 pt-6">
        <div className="max-w-[1180px] mx-auto">
          <Fade k={tab}>
            {tab === 'proyecto' && <Inicio p={p} porRevisar={porRevisar} irA={setTab} />}
            {tab === 'entregables' && <Entregables p={p} visibles={visibles} />}
            
          </Fade>
        </div>
      </main>
      {!preview && <CuentaSheet open={cuenta} onClose={() => setCuenta(false)} />}
    </div>
  );
}

function Inicio({ p, porRevisar, irA }: { p: Proyecto; porRevisar: Entrega[]; irA: (t: Tab) => void }) {
  const terminado = p.etapa >= 6;
  const etapa = terminado ? 'Entregado' : ETAPAS[p.etapa];
  return (
    <div className="space-y-12">
      <section>
        <p className="eyebrow">Tu proyecto con 1607</p>
        <h1 className="h-display text-[clamp(40px,7.4vw,108px)] mt-3 max-w-[14ch]">{p.nombre}</h1>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 items-start">
          <Card className="p-5 sm:p-7 min-w-0">
            <p className="eyebrow">Ahora estamos en</p>
            <div className="flex items-baseline gap-3 mt-2 flex-wrap">
              <span className="text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.035em] leading-none">{etapa}</span>
            </div>
            <div className="mt-7"><Stepper orientation="vertical" steps={ETAPAS.map((e) => ({ title: e, description: ETAPA_DESC[e] }))} current={p.etapa} /></div>
          </Card>
          <Card className="p-5 sm:p-7 flex flex-col gap-5">
            <div>
              <p className="eyebrow">Próximo paso</p>
              <p className="text-[18px] font-medium mt-1.5 leading-snug">{p.proximoHito.titulo}</p>
              <p className="text-text-muted text-[13px] mt-1 flex items-center gap-1.5"><CalendarDays className="size-3.5" />{p.proximoHito.fecha}</p>
            </div>
            <div className="flex justify-between text-[13px] border-t border-border pt-4">
              <span className="text-text-muted">Entrega final</span><span className="font-medium">{p.entregaFinal}</span>
            </div>
            <div className="border-t border-border pt-4">
              <p className="eyebrow mb-2.5">Tu equipo</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {p.equipo.map((id) => (
                  <span key={id} className="flex items-center gap-2"><Avatar id={id} size={28} /><span className="text-[13px] leading-tight">{persona(id).nombre}<span className="block text-[11px] text-text-muted">{persona(id).rol}</span></span></span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-[22px] font-bold tracking-[-0.025em] flex items-center gap-2.5">
            {porRevisar.length > 0 && <span className="size-2 rounded-full bg-rojo" />}
            {porRevisar.length ? 'Para revisar' : 'Todo al día'}
          </h2>
          {p.ronda && porRevisar.length > 0 && <span className="text-[12px] text-text-muted">Ronda de revisión {p.ronda.actual} de {p.ronda.total}</span>}
        </div>
        {porRevisar.length ? (
          <div className="grid lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {porRevisar.map((e) => <Revision key={e.id} p={p} e={e} />)}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="p-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-text-secondary max-w-[52ch]">No hay nada esperando tu respuesta. Te avisamos por mail cuando subamos la próxima entrega.</p>
            <Btn variant="secondary" size="sm" onClick={() => irA('entregables')}>Ver entregables</Btn>
          </Card>
        )}
      </section>
    </div>
  );
}

function EtapasTrack({ etapa }: { etapa: number }) {
  return (
    <ol className="mt-8 md:mt-auto md:pt-8 grid grid-cols-6 gap-1.5" aria-label="Etapas del proyecto">
      {ETAPAS.map((e, i) => {
        const estado = i < etapa ? 'hecha' : i === etapa ? 'actual' : 'proxima';
        return (
          <li key={e} aria-current={estado === 'actual' ? 'step' : undefined} className="min-w-0">
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ ...motionTransitions.springGentle, delay: i * 0.05 }}
              className={cn('block h-1.5 rounded-full origin-left', estado === 'hecha' ? 'bg-ink' : estado === 'actual' ? 'bg-rojo' : 'bg-border')}
            />
            <span className={cn('mt-2.5 flex items-center gap-1 text-[11px] leading-tight', estado === 'proxima' ? 'text-text-subtle' : 'text-text-primary', estado === 'actual' && 'font-medium')}>
              <span className="tnum text-text-subtle shrink-0">{estado === 'hecha' ? <CheckIcon className="size-3 text-text-primary" strokeWidth={2.5} /> : i + 1}</span>
              <span className="truncate hidden md:inline">{e}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Revision({ p, e }: { p: Proyecto; e: Entrega }) {
  const { setEstadoEntrega } = useStore();
  const toast = useToast();
  const [cambios, setCambios] = useState(false);
  const [txt, setTxt] = useState('');
  const esConcepto = e.etapa === 'Concepto';
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={motionTransitions.springSmooth}>
      <Card className="p-3 h-full flex flex-col">
        <Preview p={p} e={e} />
        <div className="px-2 pt-5 pb-2 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[18px] font-bold tracking-[-0.02em] leading-tight">{e.titulo}</p>
              <p className="text-[12px] text-text-muted mt-1">Enviado el {e.fecha} · {e.archivos.map((a) => a.nombre).join(', ')}</p>
            </div>
            <EstadoBadge estado={e.estado} cliente />
          </div>
          {e.nota && <p className="text-text-secondary mt-3 max-w-[60ch]">{e.nota}</p>}
          <div className="mt-auto pt-6 space-y-3">
            <DragToConfirm
              label={esConcepto ? 'Deslizá para elegir este concepto' : 'Deslizá para aprobar'}
              confirmedLabel={esConcepto ? 'Concepto elegido' : 'Aprobado'}
              autoResetDelay={0}
              className="max-w-none"
              onConfirm={() => setTimeout(() => { setEstadoEntrega(p.id, e.id, 'aprobado', { autor: p.cliente, texto: esConcepto ? 'Elegimos este concepto.' : 'Aprobado.' }); toast(esConcepto ? 'Listo, le avisamos al equipo qué concepto elegiste' : 'Aprobado. Le avisamos al equipo.'); }, 900)}
            />
            <button onClick={() => setCambios(!cambios)} aria-expanded={cambios} className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-full text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors">
              <MessageSquare className="size-3.5" /> Pedir cambios
            </button>
            <AnimatePresence initial={false}>
              {cambios && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={motionTransitions.springGentle}
                  className="overflow-hidden"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    if (!txt.trim()) return;
                    setEstadoEntrega(p.id, e.id, 'cambios', { autor: p.cliente, texto: txt.trim() });
                    toast('Enviamos tus comentarios al equipo');
                  }}
                >
                  <label htmlFor={'fb-' + e.id} className="sr-only">Qué te gustaría cambiar</label>
                  <textarea id={'fb-' + e.id} value={txt} onChange={(ev) => setTxt(ev.target.value)} rows={3} placeholder="Contanos qué te gustaría cambiar. Cuanto más concreto, mejor." className="w-full rounded-xl bg-surface-raised border border-border p-3 text-[13px] outline-none focus:border-border-hover resize-none" />
                  <div className="flex justify-end mt-2"><Btn size="sm" type="submit" disabled={!txt.trim()}>Enviar comentarios</Btn></div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function Entregables({ p, visibles }: { p: Proyecto; visibles: Entrega[] }) {
  const toast = useToast();
  const { urlArchivo } = useStore();
  const etapas = ETAPAS.filter((et) => visibles.some((e) => e.etapa === et));
  if (!visibles.length) return <p className="text-text-muted">Todavía no hay entregas. Vas a verlas acá apenas las enviemos.</p>;
  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Entregables</p>
        <h1 className="h-display text-[clamp(36px,5.4vw,72px)] mt-2">Todo lo que te enviamos</h1>
      </div>
      {etapas.map((et) => (
        <section key={et}>
          <h2 className="eyebrow mb-3">{et}</h2>
          <UnfoldAccordion
            allowMultiple
            defaultOpen={visibles.filter((e) => e.etapa === et && e.estado !== 'aprobado').map((e) => e.id)}
            items={visibles.filter((e) => e.etapa === et).map((e) => ({
              id: e.id,
              title: e.titulo,
              subtitle: `${e.estado === 'aprobado' ? 'Aprobado' : e.estado === 'cambios' ? 'Estamos ajustando tus cambios' : 'Esperando tu aprobación'} · ${e.fecha}`,
              content: (
                <div className="grid sm:grid-cols-[200px_minmax(0,1fr)] gap-5 pt-1">
                  <Preview p={p} e={e} />
                  <div className="space-y-4 min-w-0">
                    <ul className="space-y-2">
                      {e.archivos.map((a) => (
                        <li key={a.nombre} className="flex items-center gap-3 rounded-xl bg-[var(--bg)] border border-border px-3 py-2.5">
                          <span className="grid place-items-center size-8 rounded-lg bg-surface-raised text-[10px] font-medium text-text-secondary shrink-0">{a.tipo}</span>
                          <span className="min-w-0 flex-1"><span className="block text-[13px] text-text-primary truncate">{a.nombre}</span><span className="block text-[11px] text-text-muted">{a.peso}</span></span>
                          <Btn size="sm" variant="secondary" onClick={async () => { if (!a.path) return toast('Este archivo todavía no está disponible'); const u = await urlArchivo(a.path); if (u) window.open(u, '_blank', 'noopener'); }}><Download className="size-3.5" /><span className="hidden sm:inline">Descargar</span></Btn>
                        </li>
                      ))}
                    </ul>
                    {e.feedback?.length ? (
                      <div className="space-y-2">
                        {e.feedback.map((f, i) => (
                          <p key={i} className="text-[13px] flex gap-2"><span className="size-1.5 rounded-full bg-rojo mt-2 shrink-0" /><span><span className="text-text-primary">“{f.texto}”</span><span className="block text-[11px] text-text-muted">{f.autor} · {f.fecha}</span></span></p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            }))}
          />
        </section>
      ))}
    </div>
  );
}

function Pagos({ p }: { p: Proyecto }) {
  const toast = useToast();
  const pagado = p.pagos.filter((x) => x.estado === 'pagado').reduce((a, x) => a + x.monto, 0);
  const proximo = p.pagos.find((x) => x.estado === 'pendiente');
  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Pagos</p>
        <h1 className="h-display text-[clamp(36px,5.4vw,72px)] mt-2">{usd(pagado)} <span className="text-text-subtle">de {usd(p.total)}</span></h1>
        <p className="text-text-muted mt-3">{p.plan} · en tres cuotas: 50% al empezar, 25% al aprobar el concepto y 25% antes de la entrega final.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {p.pagos.map((x, i) => (
          <Card key={x.id} className={cn('p-5 relative overflow-hidden', x.estado === 'pendiente' && 'border-rojo/40')}>
            <div className="flex items-center justify-between h-6">
              <span className="tnum text-[12px] text-text-muted">Cuota {i + 1} · {x.pct}%</span>
              {x.estado === 'pagado' ? (
                <span className="grid place-items-center size-6 rounded-full bg-ink text-on-ink"><CheckIcon className="size-3.5" strokeWidth={2.5} /></span>
              ) : x.estado === 'pendiente' ? (
                <span className="text-[11px] font-medium text-err-fg bg-err-bg h-6 px-2.5 rounded-full inline-flex items-center">Próxima</span>
              ) : (
                <span className="text-[11px] text-text-subtle">Más adelante</span>
              )}
            </div>
            <p className="text-[26px] font-bold tracking-[-0.03em] tnum mt-4">{usd(x.monto)}</p>
            <p className="font-medium mt-1">{x.concepto}</p>
            <p className="text-[12px] text-text-muted mt-0.5">{x.detalle}</p>
          </Card>
        ))}
      </div>

      {proximo && (
        <Card className="p-5 sm:p-6 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center">
          <div>
            <p className="font-medium">Datos para transferir la próxima cuota</p>
            <p className="text-[13px] text-text-muted mt-1">Se toma el dólar blue del día del pago. Cuando lo hagas, mandanos el comprobante y lo marcamos acá.</p>
            <p className="mt-3 text-[13px]"><span className="text-text-muted">Alias </span><span className="font-medium select-all">ALIAS.DE.EJEMPLO</span></p>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => toast('En la versión real subís el comprobante desde acá')}>Enviar comprobante</Btn>
        </Card>
      )}
    </div>
  );
}
