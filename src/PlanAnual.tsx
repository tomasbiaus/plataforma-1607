import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Target, TrendingUp, Users, Rocket, Check as CheckIcon } from 'lucide-react';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { Card } from './ui';
import { usd } from './data';
import { useStore } from './store';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Plan = {
  objetivo: number;
  mensualesHoy: number;
  ticket: number;
  nuevosMensuales: number;
  feeMensual: number;
  brandings: [number, number, number, number];
  hechos: Record<string, boolean>;
};
const DEFAULT: Plan = { objetivo: 36000, mensualesHoy: 2000, ticket: 1700, nuevosMensuales: 2, feeMensual: 500, brandings: [1, 1, 1, 1], hechos: {} };
const KEY = '1607-plan-2027';

// Hitos por trimestre, tomados del plan de escalado del estudio
const HITOS: { q: string; titulo: string; icon: React.ElementType; items: { id: string; t: string }[] }[] = [
  { q: 'T1', titulo: 'Capacidad', icon: Users, items: [
    { id: 'h1', t: 'Sumar un diseñador (prueba paga) para liberar a Matías' },
    { id: 'h2', t: 'Sumar un operador que saque lo administrativo a Tomás' },
    { id: 'h3', t: 'Adquisición founder-led: referidos de los clientes actuales + outbound 5 por día' },
  ] },
  { q: 'T2', titulo: 'Recurrencia', icon: TrendingUp, items: [
    { id: 'h4', t: 'Lanzar la oferta de retainer: de branding a mensual' },
    { id: 'h5', t: 'Productizar el sprint de estrategia + identidad para moda y lifestyle' },
    { id: 'h6', t: 'Pasarle Manki a Camila (social) y a diseño' },
  ] },
  { q: 'T3', titulo: 'Ventas', icon: Target, items: [
    { id: 'h7', t: 'Sumar un setter para agendar llamadas' },
    { id: 'h8', t: 'Subir el ticket promedio con Core como la opción más elegida' },
    { id: 'h9', t: 'Caso de moda publicado (Mysaint) como carta de presentación' },
  ] },
  { q: 'T4', titulo: 'Escala', icon: Rocket, items: [
    { id: 'h10', t: 'Crecer por células: Camila como segunda líder' },
    { id: 'h11', t: 'Sumar un closer si el volumen de llamadas lo justifica' },
    { id: 'h12', t: 'Evaluar la expansión a Asunción (Paraguay)' },
  ] },
];

const Num = ({ id, label, value, onChange, step = 100, prefix = 'USD', sufijo }: { id: string; label: string; value: number; onChange: (n: number) => void; step?: number; prefix?: string; sufijo?: string }) => (
  <label htmlFor={id} className="block">
    <span className="text-[12px] text-text-muted">{label}</span>
    <span className="mt-1.5 flex items-center gap-1.5 h-10 rounded-lg bg-surface-raised px-3 focus-within:ring-2 focus-within:ring-[var(--accent-ring)]">
      {prefix && <span className="text-[12px] text-text-subtle">{prefix}</span>}
      <input id={id} type="number" inputMode="numeric" min={0} step={step} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-transparent outline-none text-[14px] font-medium tnum" />
      {sufijo && <span className="text-[12px] text-text-subtle whitespace-nowrap">{sufijo}</span>}
    </span>
  </label>
);

const Stepper = ({ label, value, onChange, max = 9 }: { label: string; value: number; onChange: (n: number) => void; max?: number }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-raised px-2 h-10">
    <span className="text-[12px] text-text-muted pl-1">{label}</span>
    <span className="flex items-center gap-1">
      <button aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="grid place-items-center size-7 rounded-md hover:bg-surface"><Minus className="size-3.5" /></button>
      <motion.span key={value} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-5 text-center text-[14px] font-bold tnum">{value}</motion.span>
      <button aria-label={`Más ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="grid place-items-center size-7 rounded-md hover:bg-surface"><Plus className="size-3.5" /></button>
    </span>
  </div>
);

export default function PlanAnual() {
  const { ajustes, guardarAjustes } = useStore();
  const plan: Plan = { ...DEFAULT, ...(ajustes.plan_anual as Partial<Plan>) };
  const set = (p: Partial<Plan>) => guardarAjustes({ plan_anual: { ...plan, ...p } });

  const calc = useMemo(() => {
    // Nuevos mensuales: se suman repartidos en el año (con 2: abril y agosto)
    const arranques = Array.from({ length: plan.nuevosMensuales }, (_, i) => Math.round(((i + 1) * 12) / (plan.nuevosMensuales + 1)));
    const meses = MESES.map((m, i) => {
      const nuevos = arranques.filter((a) => a <= i).length;
      const mensuales = plan.mensualesHoy + nuevos * plan.feeMensual;
      // Cada branding se cobra 50% al arrancar y 50% el mes siguiente; arrancan en el 1er mes del trimestre y se reparten
      let branding = 0;
      plan.brandings.forEach((n, q) => {
        for (let k = 0; k < n; k++) {
          const inicio = q * 3 + (k % 3);
          if (inicio === i) branding += plan.ticket * 0.5;
          if (inicio + 1 === i && inicio + 1 < 12) branding += plan.ticket * 0.5;
          if (inicio === 11 && i === 11) branding += plan.ticket * 0.5; // diciembre cierra completo
        }
      });
      return { m, mensuales, branding, total: mensuales + branding, nuevos };
    });
    let acc = 0;
    const acumulado = meses.map((x) => (acc += x.total));
    const total = acc;
    const totalBrandings = plan.brandings.reduce((a, b) => a + b, 0);
    const falta = Math.max(0, plan.objetivo - total);
    return { meses, acumulado, total, falta, totalBrandings, arranques, ingresoMensualFinal: meses[11].mensuales };
  }, [plan]);

  const pct = Math.min(100, Math.round((calc.total / plan.objetivo) * 100));
  const maxMes = Math.max(...calc.meses.map((x) => x.total), plan.objetivo / 12) * 1.1;
  const brandingsQueFaltan = Math.ceil(calc.falta / plan.ticket);
  const mensualesQueFaltan = Math.ceil(calc.falta / (plan.feeMensual * 6)); // sumados a mitad de año
  const tope = (n: number) => usd(Math.round(n * 0.3));

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6">
        {/* Supuestos */}
        <Card className="p-5 space-y-4">
          <p className="eyebrow">Supuestos 2027</p>
          <Num id="pl-objetivo" label="Objetivo anual" value={plan.objetivo} onChange={(n) => set({ objetivo: n })} step={1000} />
          <div className="grid grid-cols-2 gap-3">
            <Num id="pl-mensuales" label="Mensuales hoy" value={plan.mensualesHoy} onChange={(n) => set({ mensualesHoy: n })} sufijo="/mes" />
            <Num id="pl-ticket" label="Ticket de branding" value={plan.ticket} onChange={(n) => set({ ticket: n })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[12px] text-text-muted">Nuevos mensuales en el año</span>
              <div className="mt-1.5"><Stepper label="Clientes" value={plan.nuevosMensuales} onChange={(n) => set({ nuevosMensuales: n })} max={6} /></div>
            </div>
            <Num id="pl-fee" label="Fee de cada nuevo mensual" value={plan.feeMensual} onChange={(n) => set({ feeMensual: n })} sufijo="/mes" step={50} />
          </div>
          <div>
            <span className="text-[12px] text-text-muted">Brandings por trimestre</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {plan.brandings.map((b, i) => (
                <Stepper key={i} label={`T${i + 1}`} value={b} onChange={(n) => { const bs = [...plan.brandings] as Plan['brandings']; bs[i] = n; set({ brandings: bs }); }} max={6} />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-text-subtle leading-relaxed">
            Los nuevos mensuales se suman repartidos en el año{calc.arranques.length ? ` (${calc.arranques.map((a) => MESES[a].toLowerCase()).join(', ')})` : ''}. Cada branding se cobra mitad al arrancar y mitad al mes siguiente. Se guarda en la plataforma.
          </p>
        </Card>

        {/* Resultado */}
        <div className="space-y-4 min-w-0">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Proyección 2027</p>
                <p className="text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.035em] tnum leading-none mt-2">{usd(calc.total)}</p>
                <p className="text-[13px] text-text-muted mt-1.5">de {usd(plan.objetivo)} · {usd(Math.round(plan.objetivo / 12))} por mes</p>
              </div>
              <span className={cn('inline-flex items-center h-7 px-3 rounded-full text-[12px] font-medium', calc.falta ? 'bg-err-bg text-err-fg' : 'bg-ok-bg text-ok-fg')}>
                {calc.falta ? `Faltan ${usd(calc.falta)}` : `Objetivo cubierto · ${Math.round((calc.total / plan.objetivo) * 100)}%`}
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-surface-raised overflow-hidden">
              <motion.div className={cn('h-full', calc.falta ? 'bg-rojo' : 'bg-ink')} initial={false} animate={{ width: pct + '%' }} transition={motionTransitions.springGentle} />
            </div>

            {/* Barras por mes */}
            <div className="mt-6 relative">
              <div className="h-[170px] grid grid-cols-12 gap-1.5 items-end relative">
                <div aria-hidden className="absolute left-0 right-0 border-t border-dashed border-rojo/70" style={{ bottom: `${((plan.objetivo / 12) / maxMes) * 100}%` }}>
                  <span className="absolute right-0 -top-4 text-[10px] text-rojo tnum">{usd(Math.round(plan.objetivo / 12))}/mes</span>
                </div>
                {calc.meses.map((x) => (
                  <div key={x.m} className="h-full flex flex-col justify-end" title={`${x.m}: ${usd(x.total)} (mensuales ${usd(x.mensuales)} + brandings ${usd(x.branding)})`}>
                    <motion.span initial={false} animate={{ height: `${(x.branding / maxMes) * 100}%` }} transition={motionTransitions.springGentle} className="bg-rojo rounded-t-[4px]" />
                    <motion.span initial={false} animate={{ height: `${(x.mensuales / maxMes) * 100}%` }} transition={motionTransitions.springGentle} className={cn('bg-ink', !x.branding && 'rounded-t-[4px]')} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-12 gap-1.5 mt-1.5">
                {calc.meses.map((x) => <span key={x.m} className="text-[10px] text-center text-text-muted">{x.m}</span>)}
              </div>
              <p className="text-[11px] text-text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink" />Mensuales</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rojo" />Brandings</span>
                <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-rojo" />Lo que hay que facturar por mes</span>
              </p>
            </div>
          </Card>

          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="eyebrow">Mensuales</p>
              <p className="text-[20px] font-bold tracking-[-0.03em] tnum mt-1.5">{usd(calc.meses.reduce((a, x) => a + x.mensuales, 0))}</p>
              <p className="text-[11px] text-text-muted mt-1">Terminás el año en {usd(calc.ingresoMensualFinal)}/mes</p>
            </Card>
            <Card className="p-4">
              <p className="eyebrow">Brandings</p>
              <p className="text-[20px] font-bold tracking-[-0.03em] tnum mt-1.5">{usd(calc.meses.reduce((a, x) => a + x.branding, 0))}</p>
              <p className="text-[11px] text-text-muted mt-1">{calc.totalBrandings} proyectos a {usd(plan.ticket)}</p>
            </Card>
            <Card className="p-4">
              <p className="eyebrow">Costo operativo máx.</p>
              <p className="text-[20px] font-bold tracking-[-0.03em] tnum mt-1.5">{tope(calc.total / 12)}<span className="text-[12px] font-normal text-text-muted">/mes</span></p>
              <p className="text-[11px] text-text-muted mt-1">Regla del 30%: hasta {tope(calc.ingresoMensualFinal)}/mes a fin de año</p>
            </Card>
          </div>

          <Card className="p-4">
            <p className="text-[13px] leading-relaxed">
              {calc.falta ? (
                <>Para llegar te faltan <b>{usd(calc.falta)}</b>. Lo cubrís con <b>{brandingsQueFaltan} branding{brandingsQueFaltan > 1 ? 's' : ''} más</b> en el año, o con <b>{mensualesQueFaltan} mensual{mensualesQueFaltan > 1 ? 'es' : ''} más</b> desde julio a {usd(plan.feeMensual)}.</>
              ) : (
                <>Con este ritmo pasás el objetivo por <b>{usd(calc.total - plan.objetivo)}</b>. El {Math.round((calc.meses.reduce((a, x) => a + x.mensuales, 0) / calc.total) * 100)}% del año sale de los mensuales: son la base, y los brandings son lo que te hace crecer.</>
              )}
            </p>
          </Card>
        </div>
      </div>

      {/* Hitos */}
      <section>
        <h2 className="eyebrow mb-3">Hitos del plan de escalado</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {HITOS.map((h) => {
            const hechos = h.items.filter((it) => plan.hechos[it.id]).length;
            return (
              <Card key={h.q} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="grid place-items-center size-7 rounded-lg bg-ink text-on-ink"><h.icon className="size-3.5" /></span><span className="text-[14px] font-bold">{h.q} · {h.titulo}</span></span>
                  <span className="text-[11px] text-text-muted tnum">{hechos}/{h.items.length}</span>
                </div>
                <ul className="mt-3 space-y-1">
                  {h.items.map((it) => {
                    const on = !!plan.hechos[it.id];
                    return (
                      <li key={it.id}>
                        <button onClick={() => set({ hechos: { ...plan.hechos, [it.id]: !on } })} className="w-full flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-surface-hover">
                          <span className={cn('mt-0.5 size-4 rounded-[5px] border grid place-items-center shrink-0 transition-colors', on ? 'bg-ink border-ink' : 'border-border-hover bg-surface')}>{on && <CheckIcon className="size-3 text-white" strokeWidth={3} />}</span>
                          <span className={cn('text-[12px] leading-snug', on && 'line-through text-text-subtle')}>{it.t}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
