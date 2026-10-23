-- Datos reales del estudio (22/10/2026). Se corre UNA vez, después de la migración
-- y después de crear los 3 usuarios del equipo en Authentication → Users.
-- (Equivale a `npm run setup`, pero sin terminal.)

do $$
begin
  if (select count(*) from auth.users where email in ('tomibiaus@gmail.com','theliodesigner@gmail.com','camimendiondo@gmail.com')) < 3 then
    raise exception 'Primero creá los 3 usuarios (tomibiaus@gmail.com, theliodesigner@gmail.com, camimendiondo@gmail.com) en Authentication → Users → Add user';
  end if;
  if exists (select 1 from public.proyectos) then
    raise exception 'Los datos ya estaban cargados. No hace falta correr esto de nuevo.';
  end if;
end $$;

-- Equipo
insert into public.profiles (id, email, nombre, rol, rol_texto, iniciales, color)
select u.id, u.email, t.nombre, t.rol, t.rol_texto, t.iniciales, t.color
from auth.users u join (values
  ('tomibiaus@gmail.com', 'Tomás', 'admin', 'Director creativo', 'TB', '#1A1A1A'),
  ('theliodesigner@gmail.com', 'Matías', 'equipo', 'Diseño gráfico', 'MA', '#C74227'),
  ('camimendiondo@gmail.com', 'Camila', 'equipo', 'Social media + DG', 'CA', '#8C8B84')
) t(email, nombre, rol, rol_texto, iniciales, color) on t.email = u.email
on conflict (id) do update set nombre = excluded.nombre, rol = excluded.rol, rol_texto = excluded.rol_texto,
  iniciales = excluded.iniciales, color = excluded.color, cliente_id = null;

-- Clientes
insert into public.clientes (clave, nombre, color) values
  ('meso', 'Meso taller de pan', '#C9A227'), ('manki', 'Manki Producciones', '#7D7C76'), ('jack', 'Jack Tower', '#4B9A6A'),
  ('guido', 'Dr. Guido D''Amico', '#3E5C8A'), ('munika', 'Munika', '#9067C6'), ('pepecafe', 'Lo de Pepe Café', '#D9739B'),
  ('pepetostador', 'Lo de Pepe Tostador', '#4E86C6'), ('ibera', 'Instituto Iberá', '#C74227'), ('nobu', 'NOBU', '#D9822B')
on conflict (clave) do nothing;

-- Proyectos (etapas estimadas: se ajustan desde la plataforma)
create temp table px (clave text, nombre text, rubro text, plan text, etapa int, total numeric, pagadas int,
  equipo text[], dis text, pe_monto numeric, pe_pagado numeric, hito text, ronda int, colores text[]);
insert into px values
  ('meso',   'Rebranding Meso',              'Taller de pan',      'Brand Core',      0, 1900, 1, '{tomas,matias}', 'matias', 420, 0,   'Conversación inicial',                 1, '{#E9DFC9,#3B2A1E,#C74227}'),
  ('manki',  'Marca electrónica Manki',      'Música electrónica', 'Brand Core',      2, 1800, 0, '{tomas,matias}', 'matias', 450, 0,   'Presentación de conceptos',            1, '{#111111,#D9FF3F,#F2F2F2}'),
  ('jack',   'Identidad Jack Tower',         '',                   'A medida',        3, 1200, 1, '{camila}',       'camila', 350, 175, 'Presentación de propuestas gráficas', 1, '{#0F2A2E,#C9B88A,#F4F1EA}'),
  ('guido',  'Identidad Dr. D''Amico',       'Salud',              'Brand Essential', 6, 1400, 3, '{matias,tomas}', 'matias', 350, 350, 'Proyecto entregado',                   null, '{#1E3A5F,#9CC3D5,#FFFFFF}'),
  ('munika', 'Identidad y packaging Munika', 'Gastronomía',        'Brand Core',      6, 1800, 3, '{matias}',       'matias', 450, 450, 'Proyecto entregado',                   null, '{#F6C8B4,#2B2B2B,#FFF7EE}');

create temp table quien (k text, email text);
insert into quien values ('tomas', 'tomibiaus@gmail.com'), ('matias', 'theliodesigner@gmail.com'), ('camila', 'camimendiondo@gmail.com');

insert into public.proyectos (clave, cliente_id, nombre, rubro, plan, etapa, hito_titulo, ronda_actual, ronda_total, colores)
select px.clave, c.id, px.nombre, px.rubro, px.plan, px.etapa, px.hito, px.ronda, case when px.ronda is null then null else 2 end, px.colores
from px join public.clientes c on c.clave = px.clave;

insert into public.proyecto_equipo (proyecto_id, profile_id)
select p.id, pr.id from px join public.proyectos p on p.clave = px.clave
cross join unnest(px.equipo) e(k) join quien q on q.k = e.k join public.profiles pr on pr.email = q.email;

insert into public.entregas (proyecto_id, titulo, etapa, estado, preview, orden)
select p.id, e.t, e.et, 'interno', e.pv, e.o from public.proyectos p,
  (values ('Brief estratégico', 'Brief', 'brief', 1), ('Concepto A', 'Concepto', 'conceptoA', 2),
          ('Concepto B', 'Concepto', 'conceptoB', 3), ('Manual de marca', 'Entrega', 'manual', 4)) e(t, et, pv, o)
where p.clave in ('meso', 'manki');
insert into public.entregas (proyecto_id, titulo, etapa, estado, preview, orden)
select id, 'Propuestas gráficas', 'Diseño', 'interno', 'papeleria', 1 from public.proyectos where clave = 'jack';

-- Cobros: anticipo 50% / segunda cuota 25% / saldo 25%
insert into public.cuotas (proyecto_id, orden, concepto, pct, monto, estado, detalle)
select p.id, q.o, q.c, q.pct, px.total * q.pct / 100,
  case when q.o <= px.pagadas then 'pagado' when q.o = px.pagadas + 1 then 'pendiente' else 'futuro' end,
  case when q.o <= px.pagadas then 'Pagado' else q.d end
from public.proyectos p join px on px.clave = p.clave,
  (values (1, 'Anticipo', 50, 'Al aceptar la propuesta'), (2, 'Segunda cuota', 25, 'Al aprobar la propuesta de concepto'),
          (3, 'Saldo', 25, 'Antes de la entrega final')) q(o, c, pct, d);

-- Pagos al equipo por branding
insert into public.pagos_equipo (proyecto_id, profile_id, monto, pagado)
select p.id, pr.id, px.pe_monto, px.pe_pagado
from px join public.proyectos p on p.clave = px.clave join quien q on q.k = px.dis join public.profiles pr on pr.email = q.email;

insert into public.cobros_extra (cliente_id, concepto, monto, detalle)
select id, 'Saldo pendiente', 350, 'Falta cobrar' from public.clientes where clave = 'nobu';

-- Tareas que estaban en Notion
create temp table tx (cli text, proy text, titulo text, resp text[], estado text, prioridad text, inicio date, equipo text[]);
insert into tx values
  ('pepecafe',     null,    'Menú evento (Figma)',                    '{matias}',              'hecha',     'alta', '2026-10-15', '{Design}'),
  ('pepecafe',     null,    'Carrusel Pepe',                          '{matias}',              'hecha',     'alta', '2026-10-15', '{Design}'),
  ('pepetostador', null,    'Propuesta lanzamiento Honduras',         '{camila,tomas}',        'pendiente', null,   '2026-10-07', '{Brand Strategist}'),
  ('pepecafe',     null,    'Propuesta general Sensación de verano',  '{tomas,camila,matias}', 'pendiente', null,   '2026-10-07', '{Brand Strategist}'),
  ('meso',         'meso',  'Brochure de curso v1',                   '{matias}',              'hecha',     null,   '2026-10-01', '{Design}'),
  ('jack',         'jack',  'Propuestas gráficas Jack',               '{tomas,camila}',        'curso',     'alta', '2026-09-16', '{Design}'),
  ('manki',        'manki', 'Presentación moodboards y naming',       '{tomas,matias}',        'hecha',     null,   null,         '{}'),
  ('guido',        'guido', 'Recetario Guido',                        '{camila}',              'hecha',     'alta', null,         '{}'),
  ('ibera',        null,    'Brochure curso',                         '{camila}',              'hecha',     null,   null,         '{}');

with nuevas as (
  insert into public.tareas (cliente_id, proyecto_id, titulo, estado, prioridad, inicio, equipo, notion)
  select c.id, p.id, tx.titulo, tx.estado, tx.prioridad, tx.inicio, tx.equipo, true
  from tx join public.clientes c on c.clave = tx.cli left join public.proyectos p on p.clave = tx.proy
  returning id, titulo
)
insert into public.tarea_responsables (tarea_id, profile_id)
select n.id, pr.id from nuevas n join tx on tx.titulo = n.titulo
cross join unnest(tx.resp) r(k) join quien q on q.k = r.k join public.profiles pr on pr.email = q.email;

select 'Listo: ' || (select count(*) from public.proyectos) || ' proyectos, ' || (select count(*) from public.tareas) || ' tareas, '
  || (select count(*) from public.profiles where rol in ('admin','equipo')) || ' personas del equipo' as resultado;
