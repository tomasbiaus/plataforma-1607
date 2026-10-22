import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { Lock, LockOpen, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { LockInput } from './easyui/LockInput';
import { Btn, Card, PillNav, Fade, useToast } from './ui';
import PlanAnual from './PlanAnual';
import PagosEquipo from './PagosEquipo';
import { useStore } from './store';
import { aISO, usd, CLIENTES, HOY } from './data';

const INACTIVIDAD_MS = 5 * 60 * 1000;

export default function Numeros({ abrir }: { abrir: (id: string) => void }) {
  const { numeros, numerosCerrar } = useStore();
  const abierto = !!numeros?.abierto;
  const [cambiar, setCambiar] = useState(false);

  // se bloquea al salir de la sección y tras 5 minutos sin actividad (el servidor también lo corta)
  useEffect(() => () => { numerosCerrar(); }, []);
  useEffect(() => {
    if (!abierto) return;
    let t = setTimeout(numerosCerrar, INACTIVIDAD_MS);
    const reset = () => { clearTimeout(t); t = setTimeout(numerosCerrar, INACTIVIDAD_MS); };
    window.addEventListener('pointerdown', reset);
    window.addEventListener('keydown', reset);
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', reset); window.removeEventListener('keydown', reset); };
  }, [abierto]);

  if (!numeros) return null;
  return (
    <AnimatePresence mode="wait">
      {abierto && !cambiar ? (
        <motion.div key="in" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={motionTransitions.springGentle}>
          <Panel onBloquear={numerosCerrar} onCambiar={() => setCambiar(true)} abrir={abrir} />
        </motion.div>
      ) : cambiar ? (
        <motion.div key="cambiar" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={motionTransitions.springSmooth}>
          <CambiarClave onListo={() => setCambiar(false)} />
        </motion.div>
      ) : (
        <motion.div key="lock" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={motionTransitions.springSmooth}>
          <Candado />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CambiarClave({ onListo }: { onListo: () => void }) {
  const { numerosCambiar } = useStore();
  const toast = useToast();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva.length < 6) return setError('Usá al menos 6 caracteres.');
    const err = await numerosCambiar(actual, nueva);
    if (err) return setError(err);
    toast('Contraseña de Números cambiada');
    onListo();
  };
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <form onSubmit={guardar} className="w-full max-w-[380px] rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-3">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-center mb-3">Cambiar contraseña de Números</h1>
        {error && <div className="p-3 rounded-lg bg-[#FBEAE5] text-[#9E321C] text-[12px]">{error}</div>}
        <LockInput id="num-actual" aria-label="Contraseña actual" type="password" placeholder="Contraseña actual" value={actual} onChange={(e) => { setActual(e.target.value); setError(null); }} leftIcon={<Lock className="size-4" />} />
        <LockInput id="num-nueva" aria-label="Contraseña nueva" type="password" placeholder="Contraseña nueva" value={nueva} onChange={(e) => { setNueva(e.target.value); setError(null); }} leftIcon={<KeyRound className="size-4" />} />
        <div className="flex gap-2 pt-1"><Btn type="button" variant="ghost" className="flex-1 !h-11 !rounded-lg" onClick={onListo}>Cancelar</Btn><Btn type="submit" className="flex-1 !h-11 !rounded-lg">Guardar</Btn></div>
      </form>
    </div>
  );
}

function Candado() {
  const { numeros, numerosCrear, numerosAbrir } = useStore();
  const crear = !numeros?.tiene_clave;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shake = useAnimationControls();
  const toast = useToast();

  const fallar = (msg: string) => {
    setError(msg);
    shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (crear) {
      if (a.length < 6) return fallar('Usá al menos 6 caracteres.');
      if (a !== b) return fallar('Las dos contraseñas no coinciden.');
      const err = await numerosCrear(a);
      if (err) return fallar(err);
      toast('Contraseña creada. Solo vos podés entrar a Números.');
    } else {
      const err = await numerosAbrir(a);
      if (err) { setA(''); return fallar(err); }
    }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <motion.div animate={shake} className="w-full max-w-[380px] rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-[0_20px_50px_-24px_rgba(26,26,26,.18)]">
        <div className="flex flex-col items-center text-center mb-6">
          <span className="grid place-items-center size-12 rounded-2xl bg-ink text-[#FAFAF6] mb-4">
            {crear ? <KeyRound className="size-5" /> : <Lock className="size-5" />}
          </span>
          <h1 className="text-[22px] font-bold tracking-[-0.03em]">{crear ? 'Protegé tus números' : 'Números del estudio'}</h1>
          <p className="text-[13px] text-text-muted mt-1.5 max-w-[30ch]">
            {crear ? 'Creá una contraseña aparte de la de tu cuenta. Solo vos la vas a saber.' : 'Escribí tu contraseña de Números para entrar.'}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mb-4 p-3 rounded-lg bg-[#FBEAE5] text-[#9E321C] text-[12px] flex gap-2"><AlertCircle className="size-4 shrink-0" />{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="relative">
            <LockInput id="num-pass" aria-label={crear ? 'Nueva contraseña' : 'Contraseña'} type={ver ? 'text' : 'password'} placeholder={crear ? 'Nueva contraseña' : 'Contraseña'} autoFocus autoComplete={crear ? 'new-password' : 'current-password'} value={a} onChange={(e) => { setA(e.target.value); setError(null); }} leftIcon={<Lock className="size-4" />} className="pr-10" />
            <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar' : 'Mostrar'} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-text-subtle hover:text-text-primary">
              {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {crear && (
            <LockInput id="num-pass2" aria-label="Repetí la contraseña" type={ver ? 'text' : 'password'} placeholder="Repetila" autoComplete="new-password" value={b} onChange={(e) => { setB(e.target.value); setError(null); }} leftIcon={<Lock className="size-4" />} />
          )}
          <Btn type="submit" className="w-full !h-11 !rounded-lg mt-1">{crear ? 'Crear y entrar' : 'Desbloquear'}</Btn>
        </form>
        <p className="text-[11px] text-text-subtle text-center mt-5">{crear ? 'La vas a crear una sola vez. Después solo te la pide para desbloquear.' : 'Se vuelve a bloquear al salir de esta sección o tras 5 minutos sin uso.'}</p>
      </motion.div>
    </div>
  );
}

// Seis meses: los 4 anteriores, el actual y el próximo. Clave "AAAA-MM"
const CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(Number(HOY.slice(0, 4)), Number(HOY.slice(5, 7)) - 1 - 4 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});
const corto = (k: string) => CORTOS[Number(k.slice(5, 7)) - 1];
const MES_LARGO: Record<string, string> = Object.fromEntries(MESES.map((k) => [k, `${LARGOS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`]));

function Panel({ onBloquear, onCambiar, abrir }: { onBloquear: () => void; onCambiar: () => void; abrir: (id: string) => void }) {
  const { proyectos, marcarPagado, cobrosExtra, marcarCobroExtra } = useStore();
  const extrasPend = cobrosExtra.filter((c) => c.estado === 'pendiente');
  const extrasCobrado = cobrosExtra.filter((c) => c.estado === 'pagado').reduce((a, c) => a + c.monto, 0);
  const toast = useToast();
  const pagos = proyectos.flatMap((p) => p.pagos.map((x) => ({ ...x, p })));
  const contratado = proyectos.reduce((a, p) => a + p.total, 0);
  const cobrado = pagos.filter((x) => x.estado === 'pagado').reduce((a, x) => a + x.monto, 0) + extrasCobrado;
  const porCobrar = pagos.filter((x) => x.estado === 'pendiente');
  const futuro = pagos.filter((x) => x.estado === 'futuro').reduce((a, x) => a + x.monto, 0);
  const conTotal = proyectos.filter((p) => p.total > 0);
  const ticket = conTotal.length ? contratado / conTotal.length : 0;

  const porMes = useMemo(() => {
    const m: Record<string, { cobrado: number; esperado: number }> = Object.fromEntries(MESES.map((k) => [k, { cobrado: 0, esperado: 0 }]));
    pagos.forEach((x) => {
      if (x.estado === 'pagado') {
        const iso = x.pagadoISO ?? aISO(x.detalle);
        const k = iso ? iso.slice(0, 7) : undefined;
        if (k && m[k]) m[k].cobrado += x.monto;
      } else {
        const ref = x.estado === 'pendiente' ? (x.p.proximoHito.iso ?? null) : (x.p.entregaFinalISO ?? null);
        const k = ref ? (ref.slice(0, 7) < MESES[4] ? MESES[4] : ref.slice(0, 7)) : MESES[4];
        if (k && m[k]) m[k].esperado += x.monto;
      }
    });
    return m;
  }, [pagos]);
  const max = Math.max(...MESES.map((k) => porMes[k].cobrado + porMes[k].esperado), 1);
  const [mesSel, setMesSel] = useState(MESES[4]);
  const [vista, setVista] = useState<'hoy' | 'plan'>('hoy');

  const kpis = [
    { l: 'Contratado', v: usd(contratado), sub: `${proyectos.length} proyectos` },
    { l: 'Cobrado', v: usd(cobrado), sub: `${Math.round((cobrado / contratado) * 100)}% de lo contratado` },
    { l: 'Por cobrar ahora', v: usd(porCobrar.reduce((a, x) => a + x.monto, 0) + extrasPend.reduce((a, c) => a + c.monto, 0)), sub: `${porCobrar.length + extrasPend.length} cobros pendientes`, red: true },
    { l: 'A futuro', v: usd(futuro), sub: 'Saldos antes de cada entrega' },
    { l: 'Ticket promedio', v: usd(ticket), sub: 'Por proyecto de identidad' },
  ];

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><LockOpen className="size-3" /> Solo vos</p>
          <h1 className="h-display text-[clamp(34px,5vw,60px)] mt-2">Números</h1>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={onCambiar}>Cambiar contraseña</Btn>
          <Btn size="sm" onClick={onBloquear}><Lock className="size-3.5" /> Bloquear</Btn>
        </div>
      </div>

      <PillNav items={[{ id: 'hoy', label: 'Este año' }, { id: 'plan', label: 'Plan 2027' }]} value={vista} onChange={(v) => setVista(v as 'hoy' | 'plan')} />

      <Fade k={vista}>
      {vista === 'plan' ? <PlanAnual /> : (
      <div className="space-y-9">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={k.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...motionTransitions.springGentle, delay: i * 0.04 }} className={cn(i === 0 && 'col-span-2 lg:col-span-1')}>
            <Card className="p-4 h-full">
              <p className="eyebrow">{k.l}</p>
              <p className={cn('text-[24px] font-bold tracking-[-0.03em] tnum mt-2', k.red && 'text-rojo')}>{k.v}</p>
              <p className="text-[11px] text-text-muted mt-1">{k.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        <section className="min-w-0">
          <h2 className="eyebrow mb-3">Cobros por mes</h2>
          <Card className="p-5">
            <div className="h-[200px] grid grid-cols-6 gap-3 items-end">
              {MESES.map((k) => {
                const v = porMes[k];
                const hC = (v.cobrado / max) * 100;
                const hE = (v.esperado / max) * 100;
                return (
                  <button key={k} onClick={() => setMesSel(k)} className="h-full flex flex-col justify-end items-stretch group" aria-label={`${MES_LARGO[k]}: ${usd(v.cobrado)} cobrados, ${usd(v.esperado)} esperados`}>
                    <motion.span initial={{ height: 0 }} animate={{ height: `${hE}%` }} transition={motionTransitions.springGentle} className="rounded-t-md border-2 border-dashed border-rojo/60 border-b-0" style={{ borderColor: hE ? '#C7422799' : 'transparent' }} />
                    <motion.span initial={{ height: 0 }} animate={{ height: `${hC}%` }} transition={motionTransitions.springGentle} className={cn('bg-ink', hE ? '' : 'rounded-t-md', mesSel === k ? 'opacity-100' : 'opacity-80 group-hover:opacity-100')} />
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-6 gap-3 mt-2">
              {MESES.map((k) => <span key={k} className={cn('text-[11px] text-center capitalize', mesSel === k ? 'text-text-primary font-medium' : 'text-text-muted')}>{corto(k)}</span>)}
            </div>
            <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-medium">{MES_LARGO[mesSel]}</p>
              <p className="text-[13px] text-text-secondary tnum">
                <span className="text-text-primary font-medium">{usd(porMes[mesSel].cobrado)}</span> cobrados
                {porMes[mesSel].esperado > 0 && <> · <span className="text-rojo font-medium">{usd(porMes[mesSel].esperado)}</span> esperados</>}
              </p>
            </div>
            <p className="text-[11px] text-text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink" />Cobrado</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border-2 border-dashed" style={{ borderColor: '#C74227' }} />Esperado según el próximo hito</span>
            </p>
          </Card>
        </section>

        <section className="min-w-0">
          <h2 className="eyebrow mb-3">Cuotas por cobrar</h2>
          <Card className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {extrasPend.map((c) => (
                <motion.div key={c.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-3 px-4 py-3.5 overflow-hidden">
                  <span className="flex-1 min-w-[150px]">
                    <span className="block font-medium">{CLIENTES[c.cliente]?.nombre ?? c.cliente}</span>
                    <span className="block text-[12px] text-text-muted">{c.concepto} · sin proyecto en el portal</span>
                  </span>
                  <span className="tnum font-medium">{usd(c.monto)}</span>
                  <Btn size="sm" variant="secondary" onClick={() => { marcarCobroExtra(c.id); toast(`Pago de ${CLIENTES[c.cliente]?.nombre ?? c.cliente} registrado`); }}>Marcar pagado</Btn>
                </motion.div>
              ))}
              {porCobrar.length || extrasPend.length ? porCobrar.map((x) => (
                <motion.div key={x.p.id + x.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-3 px-4 py-3.5 overflow-hidden">
                  <span className="flex-1 min-w-[150px]">
                    <span className="block font-medium">{x.p.cliente}</span>
                    <span className="block text-[12px] text-text-muted">{x.concepto} ({x.pct}%) · {x.detalle.toLowerCase()}</span>
                  </span>
                  <span className="tnum font-medium">{usd(x.monto)}</span>
                  <Btn size="sm" variant="secondary" onClick={() => { marcarPagado(x.p.id, x.id); toast(`Pago de ${x.p.cliente} registrado`); }}>Marcar pagado</Btn>
                </motion.div>
              )) : <p className="p-4 text-text-muted">No hay cuotas pendientes.</p>}
            </AnimatePresence>
          </Card>
          <p className="text-[11px] text-text-muted mt-3">Montos en USD, se cobran al dólar blue del día.</p>
        </section>
      </div>

      <section>
        <h2 className="eyebrow mb-3">Por proyecto</h2>
        <Card className="scroll-x">
          <table className="w-full text-left text-[13px] min-w-[680px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-[.06em] text-text-muted">
                <th className="font-medium px-4 py-3">Cliente</th><th className="font-medium px-4 py-3">Plan</th><th className="font-medium px-4 py-3 text-right">Total</th><th className="font-medium px-4 py-3 w-[34%]">Cobrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border border-t border-border">
              {proyectos.map((p) => {
                const c = p.pagos.filter((x) => x.estado === 'pagado').reduce((a, x) => a + x.monto, 0);
                return (
                  <tr key={p.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3"><button onClick={() => abrir(p.id)} className="font-medium hover:underline underline-offset-2">{p.cliente}</button></td>
                    <td className="px-4 py-3 text-text-secondary">{p.plan}</td>
                    <td className="px-4 py-3 text-right tnum">{usd(p.total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-raised overflow-hidden flex">
                          {p.pagos.map((x) => <motion.span key={x.id} initial={false} animate={{ backgroundColor: x.estado === 'pagado' ? '#1A1A1A' : x.estado === 'pendiente' ? '#C74227' : '#EFEEE8' }} style={{ width: x.pct + '%' }} className="h-full border-r-2 border-white last:border-0" />)}
                        </div>
                        <span className="tnum text-[12px] text-text-secondary w-[72px] text-right">{usd(c)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {cobrosExtra.map((c) => (
                <tr key={c.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-3 font-medium">{CLIENTES[c.cliente]?.nombre ?? c.cliente}</td>
                  <td className="px-4 py-3 text-text-secondary">Sin proyecto en el portal</td>
                  <td className="px-4 py-3 text-right tnum text-text-subtle">—</td>
                  <td className="px-4 py-3 text-[12px]">{c.estado === 'pagado' ? <span className="text-[#2F6B41]">Saldo cobrado</span> : <span className="text-rojo">Falta {usd(c.monto)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      <PagosEquipo />
      </div>
      )}
      </Fade>
    </div>
  );
}
