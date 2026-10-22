import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  // Se ve en la consola si faltan las variables de entorno en Vercel
  console.error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'falta-clave', {
  auth: { persistSession: true, autoRefreshToken: true },
});
