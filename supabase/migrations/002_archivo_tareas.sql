-- Archivo de tareas: las terminadas se pueden mandar al archivo para que no molesten en las vistas
alter table public.tareas add column if not exists archivada boolean not null default false;
create index if not exists tareas_archivada_idx on public.tareas (archivada);
