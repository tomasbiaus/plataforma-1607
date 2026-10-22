import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
import { LockInput } from './easyui/LockInput';
import { motionTransitions } from './lib/motion-tokens';
import { cn } from './lib/utils';
import { Logo, Btn } from './ui';
import { useStore } from './store';

/* Basado en el Login de EasyUI: tarjeta centrada, sin login social ni registro (las claves las da el estudio) */
export default function Login() {
  const { entrar: login } = useStore();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState(false);
  const [loading, setLoading] = useState(false);

  const entrar = async (mail: string) => {
    setLoading(true);
    const err = await login(mail, pass);
    setLoading(false);
    if (err) setError(err);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Escribí un email válido.');
    if (!pass) return setError('Escribí tu contraseña.');
    entrar(email);
  };

  return (
    <div className="min-h-[100dvh] gutter py-10 flex flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTransitions.springSmooth}
        className="relative w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-[0_20px_50px_-24px_rgba(26,26,26,.18)] overflow-hidden"
      >
        <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[#C74227]/[0.06] to-transparent blur-2xl" />

        <div className="relative flex flex-col items-center text-center mb-7">
          <Logo className="w-[72px] mb-5" />
          <h1 className="text-[22px] font-bold tracking-[-0.03em]">Ingresá a tu proyecto</h1>
          <p className="text-[13px] text-text-muted mt-1.5 max-w-[30ch]">Con el email y la contraseña que te pasó el estudio.</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -6, height: 0 }} transition={motionTransitions.springSnappy} className="overflow-hidden">
              <div className="mb-5 p-3 rounded-lg bg-[#FBEAE5] text-[#9E321C] text-[12px] flex gap-2 text-left">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={submit} className="relative space-y-4" noValidate>
          <LockInput id="login-email" label="Email" type="email" placeholder="nombre@marca.com" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} leftIcon={<Mail className="size-4" />} />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-pass" className="text-sm font-medium tracking-tight">Contraseña</label>
              <button type="button" onClick={() => setAviso(!aviso)} className="text-[11px] text-text-muted hover:text-text-primary">¿La olvidaste?</button>
            </div>
            <div className="relative">
              <LockInput id="login-pass" type={ver ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" value={pass} onChange={(e) => { setPass(e.target.value); setError(null); }} leftIcon={<Lock className="size-4" />} className="pr-10" />
              <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-text-subtle hover:text-text-primary">
                {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {aviso && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={motionTransitions.springGentle} className="overflow-hidden text-[12px] text-text-secondary">
                  <span className="flex gap-1.5 pt-1"><Info className="size-3.5 shrink-0 mt-0.5 text-text-subtle" />Escribinos a <span className="select-all text-text-primary">hola@1607studio.com</span> y te mandamos una nueva.</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>


          <Btn type="submit" className="w-full !h-11 !rounded-lg mt-2" disabled={loading}>
            {loading ? (
              <motion.span className="size-4 rounded-full border-2 border-white/30 border-t-white" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
            ) : (
              <>Entrar <ArrowRight className="size-4" /></>
            )}
          </Btn>
        </form>

        <p className="relative mt-6 pt-5 border-t border-border text-center text-[12px] text-text-muted">
          ¿Todavía no tenés acceso? Te lo da el equipo de 1607.
        </p>
      </motion.div>

    </div>
  );
}
