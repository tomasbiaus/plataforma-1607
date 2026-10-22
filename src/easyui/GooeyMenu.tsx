'use client';

/* GooeyMenu de EasyUI (MIT), adaptado: tamaño compacto para celdas de tabla,
   colores 1607 y el panel flota por encima sin empujar el layout. */
import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export interface GooeyOption {
  value: string;
  label: string;
  dot?: string;
}

export interface GooeyMenuProps {
  options: GooeyOption[];
  value: string;
  onSelect: (value: string) => void;
  width?: number;
  pillH?: number;
  rowH?: number;
  className?: string;
  ariaLabel?: string;
}

const DROP_SPRING = { type: 'spring', stiffness: 240, damping: 17, mass: 1 } as const;
const GROW_SPRING = { type: 'spring', stiffness: 210, damping: 22, mass: 1 } as const;
const SNAP_SPRING = { type: 'spring', stiffness: 240, damping: 20, mass: 0.9 } as const;
const ROW_SPRING = { type: 'spring', stiffness: 420, damping: 26 } as const;

export const GooeyMenu: React.FC<GooeyMenuProps> = ({ options, value, onSelect, width = 136, pillH = 26, rowH = 30, className, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex((o) => o.value === value)));
  const ref = useRef<HTMLDivElement>(null);
  const fid = 'goo-' + useId().replace(/:/g, '');
  const GAP = Math.round(pillH * 0.25);
  const PAD = 5;
  const panelHeight = options.length * rowH + PAD * 2;
  const panelY = pillH + GAP;
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', down);
    return () => window.removeEventListener('pointerdown', down);
  }, [open]);

  const choose = (i: number) => { onSelect(options[i].value); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((p) => (p + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((p) => (p - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(activeIndex); }
  };

  return (
    <div
      ref={ref}
      onKeyDown={onKey}
      onClick={(e) => e.stopPropagation()}
      className={cn('relative inline-block select-none align-middle', open && 'z-40', className)}
      style={{ width, height: pillH }}
    >
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id={fid} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={pillH * 0.2} result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -14" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Capa gooey: pastilla + panel que gotea */}
      <div className="absolute left-0 top-0 pointer-events-none" style={{ width, height: panelY + panelHeight, filter: `url(#${fid})`, transform: 'translateZ(0)', isolation: 'isolate' }}>
        <div className="absolute left-0 top-0 bg-[#1A1A1A]" style={{ width, height: pillH, borderRadius: pillH / 2 }} />
        <motion.div
          className="absolute left-0 top-0 bg-[#1A1A1A]"
          style={{ width, height: panelHeight, transformOrigin: '50% 0%', borderRadius: 14, willChange: 'transform' }}
          initial={false}
          animate={open ? { y: panelY, scaleY: 1 } : { y: 0, scaleY: pillH / panelHeight }}
          transition={open ? { y: DROP_SPRING, scaleY: { ...GROW_SPRING, delay: 0.05 } } : { y: SNAP_SPRING, scaleY: SNAP_SPRING }}
        />
      </div>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}: ${selected.label}` : selected.label}
        onClick={() => setOpen((o) => !o)}
        className="absolute left-0 top-0 z-20 flex items-center justify-between gap-1.5 px-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74227]"
        style={{ width, height: pillH, borderRadius: pillH / 2 }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {selected.dot && <span className="size-1.5 rounded-full shrink-0" style={{ background: selected.dot }} />}
          <span className="text-[11px] font-medium text-[#F4F4F4] truncate">{selected.label}</span>
        </span>
        <motion.svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B5B4AD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            className="absolute left-0 m-0 list-none p-0 z-20"
            style={{ top: panelY, width, paddingTop: PAD, paddingBottom: PAD }}
            initial="closed"
            animate="open"
            exit="closed"
            variants={{ open: { transition: { staggerChildren: 0.035, delayChildren: 0.12 } }, closed: { transition: { staggerChildren: 0.015, staggerDirection: -1 } } }}
          >
            {options.map((o, i) => (
              <motion.li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(i)}
                variants={{ open: { opacity: 1, y: 0, transition: ROW_SPRING }, closed: { opacity: 0, y: -8, transition: SNAP_SPRING } }}
                className={cn('mx-[5px] flex cursor-pointer items-center justify-between rounded-[10px] px-2 text-[11px] font-medium transition-colors duration-150', i === activeIndex ? 'bg-[#333331] text-white' : 'text-[#D6D5CF]')}
                style={{ height: rowH }}
              >
                <span className="flex items-center gap-1.5">
                  {o.dot && <span className="size-1.5 rounded-full" style={{ background: o.dot }} />}
                  {o.label}
                </span>
                {o.value === value && <span className="size-1.5 rounded-full bg-[#C74227]" />}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GooeyMenu;
