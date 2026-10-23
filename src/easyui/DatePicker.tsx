import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, X } from 'lucide-react';
import { Calendar, type DateRange } from './calendar';
import { cn } from '../lib/utils';

/* Selector de fecha con el Calendar de EasyUI. Trabaja con fechas ISO (YYYY-MM-DD) como la base. */

const desdeISO = (iso?: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const aISO = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;
const fmt = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtCorto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const texto = (iso?: string | null, corto = false) => {
  const d = desdeISO(iso);
  if (!d) return '';
  const anio = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return (corto ? fmtCorto : fmt).format(d).replace(/[.,]/g, '') + anio;
};

/** Popover flotante (en portal, para que no lo corten paneles con scroll) */
function Flotante({ ancla, open, onClose, children }: { ancla: React.RefObject<HTMLElement>; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const ubicar = () => {
      const r = ancla.current?.getBoundingClientRect();
      if (!r) return;
      const w = caja.current?.offsetWidth ?? 280;
      const h = caja.current?.offsetHeight ?? 340;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      const abajo = r.bottom + 6 + h <= window.innerHeight - 8;
      setPos({ left, top: abajo ? r.bottom + 6 : Math.max(8, r.top - h - 6) });
    };
    ubicar();
    const raf = requestAnimationFrame(ubicar);
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', ubicar, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', ubicar); window.removeEventListener('scroll', ubicar, true); };
  }, [open, ancla]);

  useEffect(() => {
    if (!open) return;
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!caja.current?.contains(t) && !ancla.current?.contains(t)) onClose();
    };
    // en captura, para que Esc cierre el calendario y no el panel que está debajo
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); ancla.current?.focus(); } };
    document.addEventListener('pointerdown', fuera, true);
    window.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', fuera, true); window.removeEventListener('keydown', esc, true); };
  }, [open, onClose, ancla]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={caja}
          role="dialog"
          aria-label="Elegir fecha"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 520, damping: 36 }}
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          className="z-[70] rounded-xl border border-border bg-surface shadow-[var(--shadow-elevated)] origin-top-left"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

type Base = { id?: string; placeholder?: string; className?: string; 'aria-label'?: string; corto?: boolean };

export function DatePicker({ id, value, onChange, placeholder = 'Elegir fecha', className, corto, ...rest }: Base & { value?: string | null; onChange: (iso: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const cerrar = React.useCallback(() => setOpen(false), []);
  const v = desdeISO(value);
  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest['aria-label']}
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-2 h-10 w-full rounded-lg bg-surface-raised px-3 text-left text-[13px] outline-none transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]',
          open && 'ring-2 ring-[var(--accent-ring)]',
          className
        )}
      >
        <CalendarDays className="size-3.5 shrink-0 text-text-muted" />
        <span className={cn('flex-1 truncate', !v && 'text-text-subtle')}>{v ? texto(value, corto) : placeholder}</span>
      </button>
      <Flotante ancla={btn} open={open} onClose={cerrar}>
        <Calendar mode="single" value={v} onChange={(d) => { onChange(aISO(d)); setOpen(false); }} />
        <Pie onHoy={() => { onChange(aISO(new Date())); setOpen(false); }} onBorrar={v ? () => { onChange(null); setOpen(false); } : undefined} />
      </Flotante>
    </>
  );
}

/** Rango desde → hasta (para tareas) */
export function DateRangePicker({ id, desde, hasta, onChange, placeholder = 'Elegir fechas', className, ...rest }: Base & { desde?: string | null; hasta?: string | null; onChange: (desde: string | null, hasta: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const cerrar = React.useCallback(() => setOpen(false), []);
  const [rango, setRango] = useState<DateRange>({ from: desdeISO(desde), to: desdeISO(hasta) });
  const [eligiendo, setEligiendo] = useState(false); // ya tocó el primer día y falta el último
  useEffect(() => { if (!open) { setRango({ from: desdeISO(desde), to: desdeISO(hasta) }); setEligiendo(false); } }, [open, desde, hasta]);
  const etiqueta = desde ? (hasta && hasta !== desde ? `${texto(desde, true)} → ${texto(hasta, true)}` : texto(desde)) : '';
  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest['aria-label']}
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-2 h-8 rounded-lg bg-surface-raised px-2.5 text-left text-[12px] outline-none transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]',
          open && 'ring-2 ring-[var(--accent-ring)]',
          className
        )}
      >
        <CalendarDays className="size-3.5 shrink-0 text-text-muted" />
        <span className={cn('truncate', !desde && 'text-text-subtle')}>{etiqueta || placeholder}</span>
      </button>
      <Flotante ancla={btn} open={open} onClose={cerrar}>
        <Calendar
          mode="range"
          value={rango}
          onChange={(r) => {
            // si la tarea tenía un solo día, el primer toque arranca un rango nuevo
            const n = !eligiendo && r.to ? { from: r.to, to: null } : r;
            setRango(n);
            if (n.from && n.to) { onChange(aISO(n.from), aISO(n.to)); setOpen(false); } else setEligiendo(true);
          }}
        />
        <p className="px-4 -mt-1 pb-1 text-[11px] text-text-muted">{eligiendo ? 'Ahora elegí el último día, o tocá "Un solo día".' : 'Tocá el primer día y después el último.'}</p>
        <Pie
          onHoy={eligiendo ? undefined : () => { onChange(aISO(new Date()), null); setOpen(false); }}
          extra={eligiendo && rango.from ? { label: 'Un solo día', onClick: () => { onChange(aISO(rango.from), null); setOpen(false); } } : undefined}
          onBorrar={desde || hasta ? () => { onChange(null, null); setOpen(false); } : undefined}
        />
      </Flotante>
    </>
  );
}

function Pie({ onHoy, onBorrar, extra }: { onHoy?: () => void; onBorrar?: () => void; extra?: { label: string; onClick: () => void } }) {
  const b = 'h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors';
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-2 py-2">
      {onBorrar ? (
        <button type="button" onClick={onBorrar} className={cn(b, 'inline-flex items-center gap-1 text-text-muted hover:text-rojo hover:bg-surface-raised')}><X className="size-3.5" />Sin fecha</button>
      ) : <span />}
      <div className="flex items-center gap-1">
        {extra && <button type="button" onClick={extra.onClick} className={cn(b, 'bg-ink text-on-ink hover:bg-ink-hover')}>{extra.label}</button>}
        {onHoy && <button type="button" onClick={onHoy} className={cn(b, 'text-text-secondary hover:text-text-primary hover:bg-surface-raised')}>Hoy</button>}
      </div>
    </div>
  );
}
