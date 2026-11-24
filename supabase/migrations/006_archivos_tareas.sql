-- Archivos adjuntos en los pedidos (tareas): se guardan en el bucket "entregas" bajo tareas/<tarea_id>/
-- y la lista va en la misma tarea, así hereda sus permisos (las privadas solo las ve el admin).
alter table public.tareas add column if not exists archivos jsonb not null default '[]'::jsonb;
