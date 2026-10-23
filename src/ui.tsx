import React, { createContext, useCallback, useContext, useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sun, Moon, Monitor } from 'lucide-react';
import { useTema, type Tema } from './lib/tema';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import logoSvg from './logo.svg?raw';
import { EQUIPO, type EstadoEntrega, type Proyecto, type Entrega } from './data';

const TEMAS: { id: Tema; label: string; icon: typeof Sun }[] = [
  { id: 'claro', label: 'Claro', icon: Sun },
  { id: 'oscuro', label: 'Oscuro', icon: Moon },
  { id: 'sistema', label: 'Automático (según tu dispositivo)', icon: Monitor },
];

/** Selector de tema: claro / oscuro / automático */
export function TemaSwitch({ className, conTexto = false }: { className?: string; conTexto?: boolean }) {
  const { tema, setTema } = useTema();
  const uid = useId();
  return (
    <div role="radiogroup" aria-label="Tema" className={cn('inline-flex items-center gap-0.5 p-0.5 rounded-full bg-surface-raised border border-border', className)}>
      {TEMAS.map((t) => {
        const on = tema === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t.label}
            title={t.label}
            onClick={() => setTema(t.id)}
            className={cn('relative inline-flex items-center justify-center gap-1.5 h-7 rounded-full text-[12px] font-medium transition-colors', conTexto ? 'px-3 flex-1' : 'w-7', on ? 'text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            {on && <motion.span layoutId={'tema-' + uid} className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,.12)]" transition={motionTransitions.springSnappy} />}
            <t.icon className="relative size-3.5" strokeWidth={1.9} />
            {conTexto && <span className="relative">{t.id === 'sistema' ? 'Auto' : t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const Logo = ({ className }: { className?: string }) => (
  <span className={cn('block [&>svg]:w-full [&>svg]:h-auto', className)} dangerouslySetInnerHTML={{ __html: logoSvg }} />
);

export const Avatar = ({ id, size = 28, ring = false }: { id: string; size?: number; ring?: boolean }) => {
  const p = EQUIPO.find((e) => e.id === id);
  // el negro de marca (#1A1A1A) se invierte en modo oscuro para que no desaparezca
  const tinta = !p?.tono || p.tono.toUpperCase() === '#1A1A1A';
  return (
    <span
      title={p ? `${p.nombre} · ${p.rol}` : id}
      className={cn('inline-grid place-items-center rounded-full text-[10px] font-medium shrink-0 tnum', tinta ? 'bg-ink text-on-ink' : 'text-white', ring && 'ring-2 ring-[var(--surface)]')}
      style={{ width: size, height: size, background: tinta ? undefined : p!.tono, fontSize: size < 26 ? 9 : 10 }}
    >
      {p?.iniciales ?? '?'}
    </span>
  );
};

/* Avatar Stack (EasyUI): se abren al pasar el mouse */
export const AvatarStack = ({ ids, size = 26 }: { ids: string[]; size?: number }) => (
  <motion.div className="flex items-center" initial="rest" whileHover="hover">
    {ids.map((id, i) => (
      <motion.span key={id} variants={{ rest: { marginLeft: i ? -8 : 0 }, hover: { marginLeft: i ? 3 : 0 } }} transition={motionTransitions.springSnappy}>
        <Avatar id={id} size={size} ring />
      </motion.span>
    ))}
  </motion.div>
);

const ESTADO: Record<EstadoEntrega, { label: string; cls: string; dot: string }> = {
  interno: { label: 'En el estudio', cls: 'bg-surface-raised text-text-secondary', dot: 'bg-text-subtle' },
  enviado: { label: 'Esperando aprobación', cls: 'bg-err-bg text-err-fg', dot: 'bg-rojo' },
  aprobado: { label: 'Aprobado', cls: 'bg-ok-bg text-ok-fg', dot: 'bg-ok' },
  cambios: { label: 'Cambios pedidos', cls: 'bg-warn-bg text-warn-fg', dot: 'bg-warn' },
};
export const EstadoBadge = ({ estado, cliente = false }: { estado: EstadoEntrega; cliente?: boolean }) => {
  const e = ESTADO[estado];
  const label = cliente && estado === 'enviado' ? 'Necesita tu aprobación' : cliente && estado === 'cambios' ? 'Ajustando tus cambios' : e.label;
  return (
    <span className={cn('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap', e.cls)}>
      <span className={cn('size-1.5 rounded-full', e.dot)} />
      {label}
    </span>
  );
};

/* Pill Navigation (EasyUI) con el punto rojo de la web 1607: la píldora activa viaja con layoutId */
export function PillNav<T extends string>({ items, value, onChange, className, size = 'md' }: {
  items: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const uid = useId();
  return (
    <div className={cn('glass inline-flex items-center gap-1 p-1 rounded-full max-w-full scroll-x', className)} role="tablist">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.id)}
            className={cn(
              'relative inline-flex items-center rounded-full font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-7 px-3 text-[12px]' : 'h-8 px-3.5 text-[13px]',
              on ? 'text-text-primary' : 'text-text-subtle hover:text-text-primary'
            )}
          >
            {on && (
              <motion.span
                layoutId={`pill-${uid}`}
                className="absolute inset-0 rounded-full bg-surface dark:bg-surface-raised shadow-[0_2px_8px_rgba(26,26,26,.12)]"
                transition={motionTransitions.springMorph}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              <motion.span
                initial={false}
                animate={{ width: on ? 7 : 0, opacity: on ? 1 : 0, marginRight: on ? 0 : -8 }}
                transition={motionTransitions.springSnappy}
                className="h-[7px] rounded-full bg-rojo"
              />
              {it.label}
              {it.count !== undefined && <span className="tnum text-[11px] text-text-muted">{it.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const Btn = ({ variant = 'primary', size = 'md', className, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'red'; size?: 'sm' | 'md' }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    transition={motionTransitions.springSnappy}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
      size === 'sm' ? 'h-8 px-3.5 text-[12px]' : 'h-10 px-5 text-[13px]',
      variant === 'primary' && 'bg-ink text-on-ink hover:bg-ink-hover',
      variant === 'red' && 'bg-rojo text-white hover:bg-rojo-hover',
      variant === 'secondary' && 'bg-surface-raised text-text-primary hover:bg-border',
      variant === 'ghost' && 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
      className
    )}
    {...(p as any)}
  >
    {children}
  </motion.button>
);

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('rounded-2xl bg-surface border border-border', className)}>{children}</div>
);

/* Barra de etapas compacta para listas */
export const EtapaBar = ({ etapa, total = 6 }: { etapa: number; total?: number }) => (
  <div className="grid gap-[3px] w-full" style={{ gridTemplateColumns: `repeat(${total}, minmax(0,1fr))` }}>
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className={cn('h-1.5 rounded-full transition-colors duration-500', i < etapa ? 'bg-ink' : i === etapa ? 'bg-rojo' : 'bg-border')}
      />
    ))}
  </div>
);

/* Previsualizaciones de entregables, armadas con los colores de cada marca */
export const Preview = ({ p, e, className }: { p: Proyecto; e: Entrega; className?: string }) => {
  const [a, b, c] = p.colores;
  const word = (p.cliente.startsWith('Dr.') ? p.cliente.split(' ').pop()! : p.cliente.split(' ')[0]).toLowerCase();
  const base = 'relative overflow-hidden rounded-xl aspect-[4/3] w-full [container-type:inline-size]';
  if (!e.archivos.length) {
    return (
      <div className={cn(base, 'grid place-items-center border border-dashed border-border-hover bg-[var(--bg)]', className)}>
        <span className="text-[12px] text-text-subtle">Todavía sin archivos</span>
      </div>
    );
  }
  switch (e.preview) {
    case 'conceptoA':
      return (
        <div className={cn(base, className)} style={{ background: a }}>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-bold tracking-[-0.06em] leading-none" style={{ color: b, fontSize: '22cqw' }}>{word}</span>
          </div>
          <span className="absolute left-3 right-3 bottom-3 text-[max(8px,2.6cqw)] font-medium uppercase tracking-[.08em] truncate" style={{ color: b }}>{p.clave === 'meso' ? 'Pan de masa madre · desde 2019' : p.cliente + ' · concepto A'}</span>
        </div>
      );
    case 'conceptoB':
      return (
        <div className={cn(base, className)} style={{ background: b }}>
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid place-items-center rounded-t-full border-[3px] px-6 pt-8 pb-4" style={{ borderColor: a }}>
              <span className="font-bold uppercase tracking-[.12em] text-[8cqw]" style={{ color: a }}>{word}</span>
              <span className="text-[9px] uppercase tracking-[.2em] mt-1" style={{ color: c === '#FFFFFF' ? a : c }}>{p.clave === 'meso' ? 'horno · barrio' : 'concepto B'}</span>
            </div>
          </div>
        </div>
      );
    case 'moodboard':
      return (
        <div className={cn(base, 'grid grid-cols-3 grid-rows-2 gap-1 p-1 bg-surface-raised', className)}>
          {[a, b, '#D8CBB1', c, '#F6F1E6', '#8A6E52'].map((col, i) => (
            <span key={i} className={cn('rounded-lg', i === 0 && 'row-span-2')} style={{ background: col }} />
          ))}
        </div>
      );
    case 'brief':
    case 'manual':
      return (
        <div className={cn(base, 'bg-surface-raised grid place-items-center', className)}>
          <div className="w-[46%] aspect-[3/4] rounded-md bg-white shadow-[0_8px_24px_-8px_rgba(26,26,26,.25)] p-3 flex flex-col">
            <span className="text-[9px] uppercase tracking-[.1em] text-text-muted">{e.preview === 'brief' ? 'Brief' : 'Manual de marca'}</span>
            <span className="mt-auto font-bold text-[15px] tracking-[-0.03em] leading-none" style={{ color: b === '#FFFFFF' ? a : b }}>{p.cliente}</span>
            <span className="mt-2 h-1.5 w-8 rounded-full" style={{ background: c === '#FFFFFF' ? a : c }} />
          </div>
        </div>
      );
    case 'logo':
      return (
        <div className={cn(base, 'grid grid-cols-2 gap-1 p-1', className)} style={{ background: '#E4E3DC' }}>
          <span className="rounded-lg grid place-items-center font-bold text-[22px] tracking-[-0.05em]" style={{ background: a, color: b }}>manki</span>
          <span className="rounded-lg grid place-items-center font-bold text-[22px]" style={{ background: b, color: a }}>m</span>
        </div>
      );
    case 'packaging':
      return (
        <div className={cn(base, 'flex items-end justify-center gap-3 pb-5', className)} style={{ background: c }}>
          {[56, 72, 48].map((h, i) => (
            <span key={i} className="w-[18%] rounded-t-lg rounded-b-md grid place-items-center text-[10px] font-bold" style={{ height: `${h}%`, background: i === 1 ? b : a, color: i === 1 ? a : b }}>munika</span>
          ))}
        </div>
      );
    default:
      return (
        <div className={cn(base, 'relative', className)} style={{ background: c }}>
          <span className="absolute left-[12%] top-[16%] w-[44%] aspect-[1.6] rounded-md shadow-[0_8px_20px_-8px_rgba(0,0,0,.35)] p-2 flex items-end" style={{ background: a }}>
            <span className="text-[10px] font-bold tracking-[.06em]" style={{ color: b }}>{p.cliente.toUpperCase()}</span>
          </span>
          <span className="absolute right-[12%] bottom-[14%] w-[34%] aspect-[0.72] rounded-md bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,.25)] p-2">
            <span className="block h-1 w-6 rounded-full" style={{ background: b }} />
          </span>
        </div>
      );
  }
};

/* Toasts (EasyUI Undo/Velocity Toast, simplificado) */
type Toast = { id: number; text: string };
const ToastCtx = createContext<(t: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[80] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={motionTransitions.springResponsive}
              className="pointer-events-auto inline-flex items-center gap-2.5 h-10 pl-2 pr-3 rounded-full bg-ink text-on-ink text-[13px] shadow-[var(--shadow-elevated)] max-w-[calc(100vw-32px)]"
            >
              <span className="grid place-items-center size-6 rounded-full bg-rojo"><Check className="size-3.5" strokeWidth={2.5} /></span>
              <span className="truncate">{t.text}</span>
              <button aria-label="Cerrar" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="opacity-60 hover:opacity-100"><X className="size-3.5" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};

export const Fade = ({ k, children, className }: { k: string; children: React.ReactNode; className?: string }) => (
  <AnimatePresence mode="wait">
    <motion.div key={k} className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={motionTransitions.springGentle}>
      {children}
    </motion.div>
  </AnimatePresence>
);

/** Botón de dos toques para acciones que no se pueden deshacer (sin ventanas del navegador) */
export function ConfirmBtn({ onConfirm, children, confirmText = '¿Seguro? Tocá de nuevo', className, size = 'sm' }: { onConfirm: () => void; children: React.ReactNode; confirmText?: string; className?: string; size?: 'sm' | 'md' }) {
  const [armado, setArmado] = useState(false);
  React.useEffect(() => { if (!armado) return; const t = setTimeout(() => setArmado(false), 3500); return () => clearTimeout(t); }, [armado]);
  return (
    <Btn size={size} variant={armado ? 'red' : 'ghost'} className={cn(!armado && 'hover:!text-rojo', className)} onClick={() => (armado ? (setArmado(false), onConfirm()) : setArmado(true))}>
      {armado ? confirmText : children}
    </Btn>
  );
}
