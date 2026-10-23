// Genera una contraseña nueva para alguien del equipo o un cliente (por si la perdió).
// Solo el admin. La contraseña se crea acá en el servidor y se devuelve una sola vez.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

const url = process.env.VITE_SUPABASE_URL!;
const anon = process.env.VITE_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const LETRAS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const nueva = () => Array.from({ length: 12 }, () => LETRAS[randomInt(LETRAS.length)]).join('');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!url || !anon || !service) return res.status(500).json({ error: 'Faltan variables de entorno en Vercel' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sin sesión' });
  const publico = createClient(url, anon, { auth: { persistSession: false } });
  const { data: quien, error: errQuien } = await publico.auth.getUser(token);
  if (errQuien || !quien.user) return res.status(401).json({ error: 'Sesión inválida' });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: yo } = await admin.from('profiles').select('rol').eq('id', quien.user.id).single();
  if (yo?.rol !== 'admin') return res.status(403).json({ error: 'Solo el admin puede generar contraseñas' });

  const { id } = req.body ?? {};
  if (!id) return res.status(400).json({ error: 'Falta la persona' });
  const { data: destino } = await admin.from('profiles').select('id, email, rol, nombre').eq('id', id).single();
  if (!destino) return res.status(404).json({ error: 'No encontré esa cuenta' });
  if (destino.rol === 'admin') return res.status(400).json({ error: 'Tu propia contraseña cambiala desde Mi cuenta' });

  const password = nueva();
  const { error } = await admin.auth.admin.updateUserById(destino.id, { password });
  if (error) return res.status(500).json({ error: error.message });
  // al entrar con esta, la plataforma le pide que elija la suya
  await admin.from('profiles').update({ debe_cambiar_clave: true }).eq('id', destino.id);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, email: destino.email, nombre: destino.nombre, password });
}
