import { AnimatePresence, motion } from 'framer-motion';
import { StoreProvider, useStore } from './store';
import { ToastProvider, useToast, useOculto } from './ui';
import { useEffect, useRef } from 'react';
import Login, { NuevaClave } from './Login';
import Studio from './Studio';
import ClientPortal from './ClientPortal';

function Avisos() {
  const { avisos, sesion } = useStore();
  const toast = useToast();
  const vistos = useRef(0);
  useEffect(() => {
    const nuevos = avisos.slice(vistos.current);
    vistos.current = avisos.length;
    nuevos.forEach((a, i) => setTimeout(() => toast(a.texto), 400 + i * 500));
  }, [avisos]);
  return null;
}

function Cargando() {
  return (
    <div className="min-h-[100dvh] grid place-items-center">
      <motion.span className="size-6 rounded-full border-2 border-border border-t-rojo" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
    </div>
  );
}

function Router() {
  const { sesion, listo, error, salir, recuperando, debeCambiarClave } = useStore();
  const oculto = useOculto();
  if (recuperando) return <NuevaClave />;
  if (listo && sesion && debeCambiarClave) return <NuevaClave primeraVez />;
  if (!listo) return <Cargando />;
  if (error && !sesion) {
    return (
      <div className="min-h-[100dvh] grid place-items-center gutter text-center">
        <div className="max-w-[360px] space-y-4">
          <p className="text-[15px]">{error}</p>
          <button onClick={() => salir()} className="text-[13px] underline underline-offset-2 text-text-muted">Volver a ingresar</button>
        </div>
      </div>
    );
  }
  const key = !sesion ? 'login' : sesion.tipo === 'estudio' ? 'e-' + sesion.persona : 'c-' + sesion.proyecto;
  return (
    <AnimatePresence mode={oculto ? 'sync' : 'wait'}>
      <motion.div key={key} className="min-h-full" initial={oculto ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={oculto ? undefined : { opacity: 0 }} transition={{ duration: 0.25 }}>
        {!sesion ? <Login /> : sesion.tipo === 'estudio' ? <Studio yo={sesion.persona} /> : <ClientPortal proyectoId={sesion.proyecto} />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Avisos />
        <Router />
      </ToastProvider>
    </StoreProvider>
  );
}
