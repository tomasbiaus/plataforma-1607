import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, X, FileText, Play } from 'lucide-react';
import { cn } from './lib/utils';
import { useStore } from './store';
import type { Archivo } from './data';

/* Vista previa real de los archivos de una entrega: cada archivo por separado, con su miniatura. */

type Tipo = 'imagen' | 'pdf' | 'video' | 'otro';
const ext = (a: Archivo) => (a.nombre.split('.').pop() ?? '').toLowerCase();
export const tipoDe = (a: Archivo): Tipo => {
  const e = ext(a);
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif'].includes(e)) return 'imagen';
  if (e === 'pdf') return 'pdf';
  if (['mp4', 'mov', 'webm', 'm4v'].includes(e)) return 'video';
  return 'otro';
};

function useUrl(path?: string | null) {
  const { urlVista } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    if (path) urlVista(path).then((u) => vivo && setUrl(u));
    return () => { vivo = false; };
  }, [path]);
  return url;
}

/* Primera página de un PDF, dibujada con pdf.js (se carga solo cuando hace falta) */
const cachePdf = new Map<string, string>();
function PdfPagina({ url, path, className }: { url: string; path: string; className?: string }) {
  const [img, setImg] = useState<string | null>(cachePdf.get(path) ?? null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (img) return;
    let vivo = true;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const doc = await pdfjs.getDocument({ url }).promise;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const scale = 900 / Math.max(base.width, base.height);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
        const data = canvas.toDataURL('image/jpeg', 0.85);
        cachePdf.set(path, data);
        if (vivo) setImg(data);
        doc.destroy();
      } catch {
        if (vivo) setError(true);
      }
    })();
    return () => { vivo = false; };
  }, [url, path]);
  if (error) return <Ficha etiqueta="PDF" className={className} />;
  if (!img) return <div className={cn('animate-pulse bg-surface-raised', className)} />;
  return <img src={img} alt="" className={cn('object-contain bg-white', className)} />;
}

/* PDF completo (todas las páginas) para el visor: funciona igual en compu y celular */
function PdfCompleto({ url }: { url: string }) {
  const [paginas, setPaginas] = useState<string[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    setPaginas([]); setTotal(null); setError(false);
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const doc = await pdfjs.getDocument({ url }).promise;
        if (!vivo) return;
        setTotal(doc.numPages);
        for (let i = 1; i <= Math.min(doc.numPages, 40) && vivo; i++) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: Math.min(2, 1400 / base.width) });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width; canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
          const img = canvas.toDataURL('image/jpeg', 0.88);
          if (vivo) setPaginas((x) => [...x, img]);
        }
        doc.destroy();
      } catch { if (vivo) setError(true); }
    })();
    return () => { vivo = false; };
  }, [url]);
  if (error) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-white underline">No se pudo mostrar el PDF. Abrirlo en otra pestaña</a>;
  return (
    <div className="w-full h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-[900px] space-y-3 pb-6">
        {paginas.map((src, i) => <img key={i} src={src} alt={`Página ${i + 1}`} className="w-full rounded-md bg-white shadow-lg" />)}
        {(total === null || paginas.length < Math.min(total, 40)) && <div className="w-full aspect-[1/1.414] rounded-md bg-white/10 animate-pulse" />}
        {total !== null && total > 40 && <p className="text-center text-[12px] text-white/60">Se muestran las primeras 40 de {total} páginas. Descargalo para verlo completo.</p>}
      </div>
    </div>
  );
}

function Ficha({ etiqueta, className }: { etiqueta: string; className?: string }) {
  return (
    <div className={cn('grid place-items-center bg-surface-raised', className)}>
      <span className="flex flex-col items-center gap-1.5 text-text-muted">
        <FileText className="size-6" strokeWidth={1.5} />
        <span className="text-[11px] font-bold tracking-[.08em]">{etiqueta}</span>
      </span>
    </div>
  );
}

/** Miniatura de un archivo */
export function Miniatura({ a, className, grande = false }: { a: Archivo; className?: string; grande?: boolean }) {
  const url = useUrl(a.path);
  const t = tipoDe(a);
  const cls = cn('w-full h-full', className);
  if (!a.path) return <Ficha etiqueta={ext(a).toUpperCase() || 'ARCHIVO'} className={cls} />;
  if (!url) return <div className={cn('animate-pulse bg-surface-raised', cls)} />;
  if (t === 'imagen') return <img src={url} alt={a.nombre} loading="lazy" className={cn(grande ? 'object-contain' : 'object-cover', 'bg-surface-raised', cls)} />;
  if (t === 'pdf') return <PdfPagina url={url} path={a.path} className={cls} />;
  if (t === 'video') return (
    <div className={cn('relative bg-black', cls)}>
      <video src={url + '#t=0.1'} muted playsInline preload="metadata" className="w-full h-full object-cover" />
      {!grande && <span className="absolute inset-0 grid place-items-center"><span className="grid place-items-center size-10 rounded-full bg-black/55 text-white"><Play className="size-4 fill-current" /></span></span>}
    </div>
  );
  return <Ficha etiqueta={ext(a).toUpperCase() || 'ARCHIVO'} className={cls} />;
}

/** Galería de la entrega: 1 archivo grande, varios en grilla, todos por separado */
export function GaleriaArchivos({ archivos, className }: { archivos: Archivo[]; className?: string }) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const n = archivos.length;
  const cols = n === 1 ? 'grid-cols-1' : n <= 4 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <>
      <div className={cn('grid gap-1.5 rounded-xl overflow-hidden', cols, className)}>
        {archivos.map((a, i) => (
          <button
            key={a.id ?? a.nombre + i}
            onClick={() => setAbierto(i)}
            title={a.nombre}
            className={cn('group relative overflow-hidden rounded-lg bg-surface-raised focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]', n === 1 ? 'aspect-[4/3]' : 'aspect-square', n === 3 && i === 0 && 'col-span-2 aspect-[2/1]')}
          >
            <Miniatura a={a} className="transition-transform duration-300 group-hover:scale-[1.03]" />
            {n > 1 && (
              <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent text-left text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">{a.nombre}</span>
            )}
          </button>
        ))}
      </div>
      <Visor archivos={archivos} indice={abierto} onCambiar={setAbierto} />
    </>
  );
}

/* Visor a pantalla completa con flechas */
function Visor({ archivos, indice, onCambiar }: { archivos: Archivo[]; indice: number | null; onCambiar: (i: number | null) => void }) {
  const { urlArchivo } = useStore();
  const a = indice !== null ? archivos[indice] : null;
  const url = useUrl(a?.path);
  const n = archivos.length;
  const ir = (d: number) => indice !== null && onCambiar((indice + d + n) % n);
  const ref = useRef(ir); ref.current = ir;
  useEffect(() => {
    if (indice === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCambiar(null); }
      if (e.key === 'ArrowRight') ref.current(1);
      if (e.key === 'ArrowLeft') ref.current(-1);
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [indice]);
  return createPortal(
    <AnimatePresence>
      {a && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex flex-col" role="dialog" aria-label={a.nombre} onClick={() => onCambiar(null)}>
          <div className="flex items-center gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-[13px] truncate flex-1">{a.nombre} <span className="text-white/50">· {a.peso}{n > 1 ? ` · ${indice! + 1} de ${n}` : ''}</span></span>
            {a.path && <button onClick={async () => { const u = await urlArchivo(a.path!); if (u) window.open(u, '_blank', 'noopener'); }} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[12px]"><Download className="size-3.5" />Descargar</button>}
            <button onClick={() => onCambiar(null)} aria-label="Cerrar" className="grid place-items-center size-9 rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
          </div>
          <div className="relative flex-1 min-h-0 px-4 pb-4 sm:px-16 grid place-items-center" onClick={(e) => e.stopPropagation()}>
            <motion.div key={indice} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="w-full h-full grid place-items-center">
              {tipoDe(a) === 'imagen' && url ? <img src={url} alt={a.nombre} className="max-w-full max-h-full object-contain rounded-lg" />
                : tipoDe(a) === 'pdf' && url ? <PdfCompleto url={url} />
                : tipoDe(a) === 'video' && url ? <video src={url} controls autoPlay className="max-w-full max-h-full rounded-lg" />
                : <div className="w-[min(320px,80vw)] aspect-square rounded-2xl overflow-hidden"><Miniatura a={a} grande /></div>}
            </motion.div>
            {n > 1 && (
              <>
                <button onClick={() => ir(-1)} aria-label="Anterior" className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 grid place-items-center size-10 rounded-full bg-white/10 hover:bg-white/20 text-white"><ChevronLeft className="size-5" /></button>
                <button onClick={() => ir(1)} aria-label="Siguiente" className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 grid place-items-center size-10 rounded-full bg-white/10 hover:bg-white/20 text-white"><ChevronRight className="size-5" /></button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
