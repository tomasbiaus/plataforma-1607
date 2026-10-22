// Carga inicial de la plataforma 1607 (se corre UNA vez, después de la migración).
// Crea los usuarios del equipo y carga clientes, proyectos, tareas y números reales.
//
//   1. Copiá .env.example a .env y completá las 3 variables
//   2. npm install
//   3. npm run setup
//
// Las contraseñas iniciales se imprimen al final: compartilas y que cada uno la cambie.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.env.VITE_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) { console.error('Faltan VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env'); process.exit(1); }
const db = createClient(url, service, { auth: { persistSession: false } });

const clave = () => randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
const ok = (r, que) => { if (r.error) { console.error('Error en', que, '→', r.error.message); process.exit(1); } return r.data; };

// ---------------------------------------------------------------- equipo
const EQUIPO = [
  { key: 'tomas', email: 'tomibiaus@gmail.com', nombre: 'Tomás', rol: 'admin', rol_texto: 'Director creativo', iniciales: 'TB', color: '#1A1A1A' },
  { key: 'matias', email: 'theliodesigner@gmail.com', nombre: 'Matías', rol: 'equipo', rol_texto: 'Diseño gráfico', iniciales: 'MA', color: '#C74227' },
  { key: 'camila', email: 'camimendiondo@gmail.com', nombre: 'Camila', rol: 'equipo', rol_texto: 'Social media + DG', iniciales: 'CA', color: '#8C8B84' },
];
const ids = {};
const credenciales = [];
const { data: lista } = await db.auth.admin.listUsers({ perPage: 1000 });
for (const p of EQUIPO) {
  let u = lista.users.find((x) => x.email === p.email);
  if (!u) {
    const pass = clave();
    const r = await db.auth.admin.createUser({ email: p.email, password: pass, email_confirm: true, user_metadata: { nombre: p.nombre } });
    u = ok(r, 'crear ' + p.email).user;
    credenciales.push({ email: p.email, pass });
  }
  ids[p.key] = u.id;
  ok(await db.from('profiles').upsert({ id: u.id, email: p.email, nombre: p.nombre, rol: p.rol, rol_texto: p.rol_texto, iniciales: p.iniciales, color: p.color }), 'perfil ' + p.email);
}

// ---------------------------------------------------------------- clientes
const CLIENTES = [
  ['meso', 'Meso taller de pan', '#C9A227'], ['manki', 'Manki Producciones', '#7D7C76'], ['jack', 'Jack Tower', '#4B9A6A'],
  ['guido', "Dr. Guido D'Amico", '#3E5C8A'], ['munika', 'Munika', '#9067C6'], ['pepecafe', 'Lo de Pepe Café', '#D9739B'],
  ['pepetostador', 'Lo de Pepe Tostador', '#4E86C6'], ['ibera', 'Instituto Iberá', '#C74227'], ['nobu', 'NOBU', '#D9822B'],
];
const cli = {};
for (const [clave_, nombre, color] of CLIENTES) {
  const r = ok(await db.from('clientes').upsert({ clave: clave_, nombre, color }, { onConflict: 'clave' }).select('id').single(), 'cliente ' + clave_);
  cli[clave_] = r.id;
}

// ---------------------------------------------------------------- proyectos (datos reales al 22/10/2026)
// Etapas estimadas: ajustalas desde la plataforma con "Pasar a…"
const ENTREGAS_BASE = [['Brief estratégico', 'Brief', 'interno', 'brief'], ['Concepto A', 'Concepto', 'interno', 'conceptoA'], ['Concepto B', 'Concepto', 'interno', 'conceptoB'], ['Manual de marca', 'Entrega', 'interno', 'manual']];
const PROYECTOS = [
  { clave: 'meso', cliente: 'meso', nombre: 'Rebranding Meso', rubro: 'Taller de pan', plan: 'Brand Core', etapa: 0, total: 1900, pagadas: 1,
    equipo: ['tomas', 'matias'], disenador: 'matias', pagoEquipo: { monto: 420, pagado: 0 }, ronda: [1, 2], colores: ['#E9DFC9', '#3B2A1E', '#C74227'],
    hito: 'Conversación inicial', entregas: ENTREGAS_BASE },
  { clave: 'manki', cliente: 'manki', nombre: 'Marca electrónica Manki', rubro: 'Música electrónica', plan: 'Brand Core', etapa: 2, total: 1800, pagadas: 0,
    equipo: ['tomas', 'matias'], disenador: 'matias', pagoEquipo: null, ronda: [1, 2], colores: ['#111111', '#D9FF3F', '#F2F2F2'],
    hito: 'Presentación de conceptos', entregas: ENTREGAS_BASE },
  { clave: 'jack', cliente: 'jack', nombre: 'Identidad Jack Tower', rubro: '', plan: 'A medida', etapa: 3, total: 1200, pagadas: 1,
    equipo: ['camila'], disenador: 'camila', pagoEquipo: { monto: 350, pagado: 175 }, ronda: [1, 2], colores: ['#0F2A2E', '#C9B88A', '#F4F1EA'],
    hito: 'Presentación de propuestas gráficas', entregas: [['Propuestas gráficas', 'Diseño', 'interno', 'papeleria']] },
  { clave: 'guido', cliente: 'guido', nombre: "Identidad Dr. D'Amico", rubro: 'Salud', plan: 'Brand Essential', etapa: 6, total: 1400, pagadas: 3,
    equipo: ['matias', 'tomas'], disenador: 'matias', pagoEquipo: 'completo', colores: ['#1E3A5F', '#9CC3D5', '#FFFFFF'],
    hito: 'Proyecto entregado', entregas: [] },
  { clave: 'munika', cliente: 'munika', nombre: 'Identidad y packaging Munika', rubro: 'Gastronomía', plan: 'Brand Core', etapa: 6, total: 1800, pagadas: 3,
    equipo: ['matias'], disenador: 'matias', pagoEquipo: 'completo', colores: ['#F6C8B4', '#2B2B2B', '#FFF7EE'],
    hito: 'Proyecto entregado', entregas: [] },
];
const { data: existentes } = await db.from('proyectos').select('clave');
const proy = {};
for (const p of PROYECTOS) {
  if (existentes?.some((x) => x.clave === p.clave)) { console.log('Ya existe el proyecto', p.clave, '— lo salteo'); continue; }
  const r = ok(await db.from('proyectos').insert({
    clave: p.clave, cliente_id: cli[p.cliente], nombre: p.nombre, rubro: p.rubro, plan: p.plan, etapa: p.etapa,
    hito_titulo: p.hito, ronda_actual: p.ronda?.[0] ?? null, ronda_total: p.ronda?.[1] ?? null, colores: p.colores,
  }).select('id').single(), 'proyecto ' + p.clave);
  proy[p.clave] = r.id;
  ok(await db.from('proyecto_equipo').insert(p.equipo.map((k) => ({ proyecto_id: r.id, profile_id: ids[k] }))), 'equipo ' + p.clave);
  if (p.entregas.length) ok(await db.from('entregas').insert(p.entregas.map(([titulo, etapa, estado, preview], i) => ({ proyecto_id: r.id, titulo, etapa, estado, preview, orden: i + 1 }))), 'entregas ' + p.clave);
  const cuotas = [['Anticipo', 50, 'Al aceptar la propuesta'], ['Segunda cuota', 25, 'Al aprobar la propuesta de concepto'], ['Saldo', 25, 'Antes de la entrega final']];
  ok(await db.from('cuotas').insert(cuotas.map(([concepto, pct, detalle], i) => ({
    proyecto_id: r.id, orden: i + 1, concepto, pct, monto: (p.total * pct) / 100,
    estado: i < p.pagadas ? 'pagado' : i === p.pagadas ? 'pendiente' : 'futuro', detalle: i < p.pagadas ? 'Pagado' : detalle,
  }))), 'cuotas ' + p.clave);
  if (p.pagoEquipo) {
    const monto = p.pagoEquipo === 'completo' ? Math.round(p.total * 0.25) : p.pagoEquipo.monto;
    const pagado = p.pagoEquipo === 'completo' ? monto : p.pagoEquipo.pagado;
    ok(await db.from('pagos_equipo').insert({ proyecto_id: r.id, profile_id: ids[p.disenador], monto, pagado }), 'pago equipo ' + p.clave);
  } else {
    ok(await db.from('pagos_equipo').insert({ proyecto_id: r.id, profile_id: ids[p.disenador], monto: Math.round(p.total * 0.25), pagado: 0 }), 'pago equipo ' + p.clave);
  }
}

// ---------------------------------------------------------------- cobros sueltos
const { data: extras } = await db.from('cobros_extra').select('id').eq('cliente_id', cli.nobu);
if (!extras?.length) ok(await db.from('cobros_extra').insert({ cliente_id: cli.nobu, concepto: 'Saldo pendiente', monto: 350, detalle: 'Falta cobrar' }), 'NOBU');

// ---------------------------------------------------------------- tareas que estaban en Notion
const { count } = await db.from('tareas').select('id', { count: 'exact', head: true }).eq('notion', true);
if (!count) {
  const NOTION = [
    ['pepecafe', null, 'Menú evento (Figma)', ['matias'], 'hecha', 'alta', '2026-10-15', ['Design']],
    ['pepecafe', null, 'Carrusel Pepe', ['matias'], 'hecha', 'alta', '2026-10-15', ['Design']],
    ['pepetostador', null, 'Propuesta lanzamiento Honduras', ['camila', 'tomas'], 'pendiente', null, '2026-10-07', ['Brand Strategist']],
    ['pepecafe', null, 'Propuesta general Sensación de verano', ['tomas', 'camila', 'matias'], 'pendiente', null, '2026-10-07', ['Brand Strategist']],
    ['meso', 'meso', 'Brochure de curso v1', ['matias'], 'hecha', null, '2026-10-01', ['Design']],
    ['jack', 'jack', 'Propuestas gráficas Jack', ['tomas', 'camila'], 'curso', 'alta', '2026-09-16', ['Design']],
    ['manki', 'manki', 'Presentación moodboards y naming', ['tomas', 'matias'], 'hecha', null, null, []],
    ['guido', 'guido', 'Recetario Guido', ['camila'], 'hecha', 'alta', null, []],
    ['ibera', null, 'Brochure curso', ['camila'], 'hecha', null, null, []],
  ];
  const { data: todos } = await db.from('proyectos').select('id, clave');
  const pid = Object.fromEntries((todos ?? []).map((x) => [x.clave, x.id]));
  for (const [c, p, titulo, quien, estado, prioridad, inicio, equipo] of NOTION) {
    const t = ok(await db.from('tareas').insert({ cliente_id: cli[c], proyecto_id: p ? pid[p] : null, titulo, estado, prioridad, inicio, equipo, notion: true }).select('id').single(), 'tarea ' + titulo);
    ok(await db.from('tarea_responsables').insert(quien.map((k) => ({ tarea_id: t.id, profile_id: ids[k] }))), 'responsables ' + titulo);
  }
}

console.log('\n✓ Listo. Datos cargados.');
if (credenciales.length) {
  console.log('\nContraseñas iniciales (pasáselas a cada uno y que la cambien):');
  for (const c of credenciales) console.log(`  ${c.email}  →  ${c.pass}`);
}
