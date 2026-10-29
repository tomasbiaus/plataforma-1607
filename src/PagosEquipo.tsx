import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { Avatar, Btn, Card, useToast } from './ui';
import { useStore } from './store';
import { EQUIPO, persona, usd, fecha, HOY, terminado } from './data';

/* Pagos al equipo por proyecto de branding (aparte del sueldo). Cada branding lo hace una sola persona. */
export default function PagosEquipo() {
  const { proyectos, pagosEquipo, actualizarPagoEquipo, ajustes, guardarAjustes } = useStore();
  const toast = useToast();
  const pct = ajustes.pct_equipo;
  const setPct = (n: number) => guardarAjustes({ pct_equipo: n });
  const pagos = pagosEquipo.map((x) => ({ ...x, cuando: x.pagadoISO ? fecha(x.pagadoISO) : undefined }));
  const upd = (proyecto: string, patch: { quien?: string; monto?: number; pagado?: number; cuando?: string }) => {
    const row = pagosEquipo.find((x) => x.proyecto === proyecto);
    if (!row) return;
    actualizarPagoEquipo(row.id, { ...('quien' in patch ? { quien: patch.quien } : {}), ...('monto' in patch ? { monto: patch.monto } : {}), ...('pagado' in patch ? { pagado: patch.pagado, pagadoISO: patch.pagado ? HOY : null } : {}) });
  };
  const aplicarPct = () => {
    pagosEquipo.forEach((x) => { const p = proyectos.find((y) => y.id === x.proyecto); if (p && x.pagado === 0 && p.total) actualizarPagoEquipo(x.id, { monto: Math.round((p.total * pct) / 100) }); });
    toast(`Pagos todavía sin pagar recalculados al ${pct}%`);
  };

  const filas = pagos.map((x) => ({ ...x, p: proyectos.find((p) => p.id === x.proyecto)! })).filter((x) => x.p);
  const porPersona = useMemo(
    () => EQUIPO.filter((m) => !m.esAdmin).map((m) => {
      const suyos = filas.filter((x) => x.quien === m.id);
      return { m, pendiente: suyos.reduce((a, x) => a + Math.max(0, x.monto - x.pagado), 0), pagado: suyos.reduce((a, x) => a + Math.min(x.pagado, x.monto), 0), n: suyos.length };
    }),
    [filas]
  );
  const totalEquipo = filas.reduce((a, x) => a + x.monto, 0);
  const totalProyectos = filas.reduce((a, x) => a + x.p.total, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="eyebrow">Pagos al equipo por proyecto</h2>
          <p className="text-[12px] text-text-muted mt-1">Aparte del sueldo. Cada branding lo hace una sola persona de punta a punta.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pe-pct" className="text-[12px] text-text-muted">Pago base</label>
          <span className="flex items-center h-8 rounded-lg bg-surface-raised px-2.5 focus-within:ring-2 focus-within:ring-[var(--accent-ring)]">
            <input id="pe-pct" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-9 bg-transparent outline-none text-[13px] font-medium tnum text-right" />
            <span className="text-[12px] text-text-subtle ml-0.5">% del proyecto</span>
          </span>
          <Btn size="sm" variant="secondary" onClick={aplicarPct}>Aplicar a pendientes</Btn>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {porPersona.map(({ m, pendiente, pagado, n }) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-center gap-2.5">
              <Avatar id={m.id} size={30} />
              <span><span className="block text-[14px] font-medium">{m.nombre}</span><span className="block text-[11px] text-text-muted">{n} proyecto{n === 1 ? '' : 's'}</span></span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-[12px] text-text-muted">Le debés</span>
              <span className={cn('text-[20px] font-bold tracking-[-0.03em] tnum', pendiente && 'text-rojo')}>{usd(pendiente)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="text-text-muted">Ya cobró</span><span className="tnum">{usd(pagado)}</span>
            </div>
          </Card>
        ))}
        <Card className="p-4">
          <p className="eyebrow">Equipo / facturado</p>
          <p className="text-[20px] font-bold tracking-[-0.03em] tnum mt-2">{totalProyectos ? Math.round((totalEquipo / totalProyectos) * 100) : 0}%</p>
          <p className="text-[12px] text-text-muted mt-1">{usd(totalEquipo)} al equipo sobre {usd(totalProyectos)} de proyectos. Le queda al estudio {usd(totalProyectos - totalEquipo)}.</p>
        </Card>
      </div>

      <Card className="scroll-x">
        <table className="w-full text-left text-[13px] min-w-[860px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[.06em] text-text-muted">
              <th className="font-medium px-4 py-3">Proyecto</th>
              <th className="font-medium px-4 py-3">Lo hace</th>
              <th className="font-medium px-4 py-3 text-right">Proyecto</th>
              <th className="font-medium px-4 py-3">Pago</th>
              <th className="font-medium px-4 py-3 text-right">Le queda al estudio</th>
              <th className="font-medium px-4 py-3">Pagado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border border-t border-border">
            {filas.map((x) => (
              <tr key={x.proyecto} className="hover:bg-surface-hover">
                <td className="px-4 py-3"><span className="font-medium">{x.p.cliente}</span><span className="block text-[11px] text-text-muted">{terminado(x.p) ? 'Terminado' : 'En curso'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {EQUIPO.filter((m) => !m.esAdmin).map((m) => (
                      <button key={m.id} onClick={() => upd(x.proyecto, { quien: m.id })} aria-pressed={x.quien === m.id} aria-label={`Asignar a ${m.nombre}`} className={cn('inline-flex items-center gap-1.5 h-7 pl-0.5 pr-2.5 rounded-full text-[12px] transition-all', x.quien === m.id ? 'bg-surface-raised text-text-primary' : 'text-text-subtle opacity-50 hover:opacity-100')}>
                        <Avatar id={m.id} size={24} />{m.nombre}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tnum text-text-secondary">{usd(x.p.total)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center h-8 rounded-lg bg-surface-raised px-2.5 focus-within:ring-2 focus-within:ring-[var(--accent-ring)]">
                    <span className="text-[11px] text-text-subtle mr-1">USD</span>
                    <input id={'pe-' + x.proyecto} aria-label={`Pago por ${x.p.cliente}`} type="number" min={0} step={10} value={x.monto} onChange={(e) => upd(x.proyecto, { monto: Math.max(0, Number(e.target.value) || 0) })} className="w-16 bg-transparent outline-none text-[13px] font-medium tnum" />
                    <span className="text-[11px] text-text-subtle tnum">{(x.p.total ? Math.round((x.monto / x.p.total) * 100) : 0)}%</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right tnum">{usd(x.p.total - x.monto)}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const resta = Math.max(0, x.monto - x.pagado);
                    const pctPagado = x.monto ? Math.min(100, (x.pagado / x.monto) * 100) : 0;
                    return (
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-[132px]">
                          <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
                            <motion.div className={cn('h-full', resta ? 'bg-rojo' : 'bg-ok')} initial={false} animate={{ width: pctPagado + '%' }} transition={motionTransitions.springGentle} />
                          </div>
                          <p className="text-[11px] mt-1 tnum">
                            {resta === 0 ? <span className="text-ok-fg">Pagado{x.cuando ? ` · ${x.cuando.toLowerCase()}` : ''}</span> : x.pagado > 0 ? <span>Pagó {usd(x.pagado)} · <span className="text-rojo">falta {usd(resta)}</span></span> : <span className="text-rojo">Falta {usd(resta)}</span>}
                          </p>
                        </div>
                        <AnimatePresence initial={false}>
                          {resta > 0 && (
                            <motion.span initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={motionTransitions.springSnappy} className="flex gap-1">
                              {x.pagado === 0 && x.monto >= 2 && <Btn size="sm" variant="ghost" onClick={() => { upd(x.proyecto, { pagado: Math.round(x.monto / 2) }); toast(`Mitad pagada a ${persona(x.quien).nombre} por ${x.p.cliente}`); }}>Mitad</Btn>}
                              <Btn size="sm" variant="secondary" onClick={() => { upd(x.proyecto, { pagado: x.monto }); toast(`Pago a ${persona(x.quien).nombre} por ${x.p.cliente} saldado`); }}>Saldar</Btn>
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {resta === 0 && <button onClick={() => upd(x.proyecto, { pagado: 0 })} className="text-[11px] text-text-subtle hover:text-text-primary underline underline-offset-2">Deshacer</button>}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
