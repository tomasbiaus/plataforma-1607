// Crea un acceso (usuario + contraseña) para un cliente o alguien del equipo.
// Solo lo puede usar el admin. Corre en Vercel con la service key, que nunca llega al navegador.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL!;
const anon = process.env.VITE_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!url || !anon || !service) return res.status(500).json({ error: 'Faltan variables de entorno en Vercel' });

  // 1) ¿Quién llama? Tiene que ser el admin logueado
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sin sesión' });
  const publico = createClient(url, anon, { auth: { persistSession: false } });
  const { data: quien, error: errQuien } = await publico.auth.getUser(token);
  if (errQuien || !quien.user) return res.status(401).json({ error: 'Sesión inválida' });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: perfil } = await admin.from('profiles').select('rol').eq('id', quien.user.id).single();
  if (perfil?.rol !== 'admin') return res.status(403).json({ error: 'Solo el admin puede crear accesos' });

  // 2) Datos del nuevo acceso
  const { email, password, nombre, rol = 'cliente', cliente_id = null, rol_texto = '', iniciales = '', color } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });
  if (!password || String(password).length < 8) return res.status(400).json({ error: 'La contraseña tiene que tener al menos 8 caracteres' });
  if (!['cliente', 'equipo'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  if (rol === 'cliente' && !cliente_id) return res.status(400).json({ error: 'Falta el cliente' });

  // 3) Crear el usuario (confirmado, con la contraseña que pone el estudio)
  const { data: creado, error } = await admin.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password: String(password),
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error) {
    const msg = /already|registered|exists/i.test(error.message) ? 'Ya existe una cuenta con ese email' : error.message;
    return res.status(400).json({ error: msg });
  }

  const { error: errPerfil } = await admin.from('profiles').update({
    nombre: nombre || String(email).split('@')[0],
    rol,
    cliente_id: rol === 'cliente' ? cliente_id : null,
    rol_texto,
    iniciales: iniciales || String(nombre || email).slice(0, 2).toUpperCase(),
    ...(color ? { color } : {}),
  }).eq('id', creado.user.id);
  if (errPerfil) return res.status(500).json({ error: errPerfil.message });

  return res.status(200).json({ ok: true, id: creado.user.id });
}
