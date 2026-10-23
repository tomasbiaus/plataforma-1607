import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, UserPlus, PencilLine, MessageSquare, CheckCheck } from 'lucide-react';
import { cn } from './lib/utils';
import { motionTransitions } from './lib/motion-tokens';
import { useStore, type Notificacion } from './store';
import { hace } from './data';

const ICONO: Record<Notificacion['tipo'], React.ElementType> = { asignada: UserPlus, cambio: PencilLine, cliente: MessageSquare };

/** Campanita de avisos: te asignan o cambian una tarea, un cliente responde */
export function Campanita({ abrirProyecto, lado = 'izquierda', className }: { abrirProyecto: (id: string) => void; lado?: 'izquierda' | 'derecha'; className?: string }) {
  const { notifs, marcarLeidas, abrirTarea, tareas } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sinLeer = notifs.filter((n) => !n.leida).length;

  useEffect(() => {
    if (!open) return;
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc); };
  }, [open]);

  const ir = (n: Notificacion) => {
    if (!n.leida) marcarLeidas([n.id]);
    setOpen(false);
    if (n.tarea && tareas.some((t) => t.id === n.tarea)) abrirTarea(n.tarea);
    else if (n.proyecto) abrirProyecto(n.proyecto);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={sinLeer ? `Avisos: ${sinLeer} sin leer` : 'Avisos'}
        aria-expanded={open}
        className={cn('relative grid place-items-center size-9 rounded-full transition-colors', open ? 'bg-surface-raised text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-surface-raised')}
      >
        <motion.span key={sinLeer} initial={sinLeer ? { rotate: -18 } : false} animate={{ rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 8 }}>
          <Bell className="size-[18px]" strokeWidth={1.75} />
        </motion.span>
        <AnimatePresence>
          {sinLeer > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={motionTransitions.springSnappy}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rojo text-white text-[10px] font-bold grid place-items-center tnum ring-2 ring-[var(--sidebar)]"
            >
              {sinLeer > 9 ? '9+' : sinLeer}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={motionTransitions.springSnappy}
            className={cn('absolute top-full mt-2 z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-border bg-surface shadow-[var(--shadow-elevated)] overflow-hidden', lado === 'izquierda' ? 'left-0 origin-top-left' : 'right-0 origin-top-right')}
            role="dialog" aria-label="Avisos"
          >
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-border-subtle">
              <p className="text-[14px] font-bold tracking-[-0.01em]">Avisos</p>
              {sinLeer > 0 && (
                <button onClick={() => marcarLeidas()} className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary">
                  <CheckCheck className="size-3.5" />Marcar todo leído
                </button>
              )}
            </div>
            <ul className="max-h-[min(440px,70vh)] overflow-y-auto py-1">
              {!notifs.length && (
                <li className="px-4 py-10 text-center text-[13px] text-text-muted">
                  Nada nuevo por ahora.
                  <span className="block text-[12px] text-text-subtle mt-1">Te avisamos cuando te asignen una tarea o un cliente responda.</span>
                </li>
              )}
              {notifs.map((n) => {
                const Icono = ICONO[n.tipo] ?? Bell;
                return (
                  <li key={n.id}>
                    <button onClick={() => ir(n)} className={cn('w-full flex gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover', !n.leida && 'bg-[var(--accent-subtle)]')}>
                      <span className={cn('grid place-items-center size-8 rounded-full shrink-0', n.tipo === 'cliente' ? 'bg-err-bg text-rojo' : 'bg-surface-raised text-text-secondary')}>
                        <Icono className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-[13px] leading-snug', n.leida ? 'text-text-secondary' : 'text-text-primary font-medium')}>{n.texto}</span>
                        {n.detalle && <span className="block text-[12px] text-text-muted truncate mt-0.5">{n.tipo === 'cliente' ? `“${n.detalle}”` : n.detalle}</span>}
                        <span className="block text-[11px] text-text-subtle mt-1">{hace(n.creado)}</span>
                      </span>
                      {!n.leida && <span className="size-2 rounded-full bg-rojo shrink-0 mt-1.5" aria-label="Sin leer" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
