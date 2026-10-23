-- Notificaciones: campanita en la plataforma + avisos a Slack
-- Avisa cuando: te asignan una tarea, te cambian una tarea (estado, fechas, prioridad),
-- y cuando un cliente aprueba o pide cambios.

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  para uuid not null references public.profiles (id) on delete cascade,
  tipo text not null,                     -- asignada | cambio | cliente
  texto text not null,
  detalle text,
  actor uuid references public.profiles (id) on delete set null,
  proyecto_id uuid references public.proyectos (id) on delete cascade,
  tarea_id uuid references public.tareas (id) on delete cascade,
  leida boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists notificaciones_para_idx on public.notificaciones (para, creado desc);
alter table public.notificaciones enable row level security;
grant select, update, delete on public.notificaciones to authenticated;
create policy "cada uno ve sus avisos" on public.notificaciones for select to authenticated using (para = auth.uid());
create policy "cada uno marca sus avisos" on public.notificaciones for update to authenticated using (para = auth.uid()) with check (para = auth.uid());
create policy "cada uno borra sus avisos" on public.notificaciones for delete to authenticated using (para = auth.uid());

-- Configuración de Slack (solo el admin)
create table if not exists public.avisos_config (
  id int primary key default 1 check (id = 1),
  slack_url text,
  sitio text not null default 'https://plataforma-1607.vercel.app'
);
insert into public.avisos_config (id) values (1) on conflict do nothing;
alter table public.avisos_config enable row level security;
grant select on public.avisos_config to authenticated;
create policy "admin ve avisos" on public.avisos_config for select to authenticated using (public.es_admin());

-- Para enviar a Slack desde la base
do $$ begin
  create extension if not exists pg_net;
exception when others then raise notice 'pg_net no disponible: los avisos a Slack quedan desactivados';
end $$;

create or replace function public._actor_nombre() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nombre from public.profiles where id = auth.uid() and rol in ('admin', 'equipo')), 'Automatización')
$$;

create or replace function public._slack(texto text) returns void
language plpgsql security definer set search_path = public as $$
declare url text;
begin
  select slack_url into url from public.avisos_config where id = 1;
  if url is null or url = '' then return; end if;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := ''{"Content-Type":"application/json"}''::jsonb)'
      using url, jsonb_build_object('text', texto);
  exception when others then
    raise notice 'No se pudo avisar a Slack: %', sqlerrm;
  end;
end $$;

create or replace function public._notificar(destino uuid, tipo_ text, texto_ text, detalle_ text, proyecto uuid, tarea uuid)
returns void language plpgsql security definer set search_path = public as $$
declare previa uuid;
begin
  if destino is null or destino = auth.uid() then return; end if;
  if not exists (select 1 from public.profiles where id = destino and rol in ('admin', 'equipo')) then return; end if;
  -- el mismo aviso repetido en pocos segundos (doble clic) no se duplica
  select id into previa from public.notificaciones
    where para = destino and texto = texto_ and creado > now() - interval '20 seconds' limit 1;
  if previa is not null then return; end if;
  insert into public.notificaciones (para, tipo, texto, detalle, actor, proyecto_id, tarea_id)
    values (destino, tipo_, texto_, detalle_, auth.uid(), proyecto, tarea);
end $$;

create or replace function public._cliente_de(t public.tareas) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nombre from public.clientes where id = t.cliente_id), '')
$$;

-- 1) Te asignan una tarea
create or replace function public._aviso_asignada() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.tareas; quien text; para_nombre text; cli text;
begin
  select * into t from public.tareas where id = new.tarea_id;
  if t is null or t.archivada then return new; end if;
  -- las tareas que crea la plantilla de "Nuevo proyecto" no avisan una por una
  if t.plantilla and t.creado > now() - interval '30 seconds' then return new; end if;
  -- si ya estaba asignada (se reescriben responsables) no avisa de nuevo
  if exists (select 1 from public.notificaciones where para = new.profile_id and tarea_id = t.id and tipo = 'asignada') then return new; end if;
  quien := public._actor_nombre();
  cli := public._cliente_de(t);
  perform public._notificar(new.profile_id, 'asignada',
    case when quien = 'Automatización' then 'Nueva tarea para vos: ' || t.titulo else quien || ' te asignó: ' || t.titulo end,
    nullif(cli, ''), t.proyecto_id, t.id);
  if new.profile_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) and not t.privada then
    select nombre into para_nombre from public.profiles where id = new.profile_id;
    perform public._slack(':pushpin: *' || quien || '* le asignó a *' || coalesce(para_nombre, '?') || '*: ' || t.titulo
      || case when cli <> '' then ' · _' || cli || '_' else '' end);
  end if;
  return new;
end $$;
drop trigger if exists aviso_asignada on public.tarea_responsables;
create trigger aviso_asignada after insert on public.tarea_responsables for each row execute function public._aviso_asignada();

-- 2) Te cambian una tarea (estado, fechas o prioridad)
create or replace function public._aviso_cambio() returns trigger
language plpgsql security definer set search_path = public as $$
declare cambios text[] := '{}'; r uuid; quien text; cli text; meses text[] := array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
begin
  if new.archivada then return new; end if;
  if new.estado is distinct from old.estado then
    cambios := cambios || ('la pasó a ' || case new.estado when 'pendiente' then 'Sin empezar' when 'curso' then 'En curso' else 'Hecho' end);
  end if;
  if new.inicio is distinct from old.inicio or new.fin is distinct from old.fin then
    cambios := cambios || case
      when new.inicio is null then 'le sacó la fecha'
      else 'cambió la fecha a ' || extract(day from new.inicio)::int || ' ' || meses[extract(month from new.inicio)::int]
        || coalesce(' → ' || extract(day from new.fin)::int || ' ' || meses[extract(month from new.fin)::int], '') end;
  end if;
  if new.prioridad is distinct from old.prioridad then
    cambios := cambios || coalesce('le puso prioridad ' || new.prioridad, 'le sacó la prioridad');
  end if;
  if cardinality(cambios) = 0 then return new; end if;
  quien := public._actor_nombre();
  cli := public._cliente_de(new);
  for r in select profile_id from public.tarea_responsables where tarea_id = new.id loop
    perform public._notificar(r, 'cambio', quien || ' ' || array_to_string(cambios, ' y ') || ': ' || new.titulo, nullif(cli, ''), new.proyecto_id, new.id);
  end loop;
  if new.estado = 'hecha' and old.estado <> 'hecha' and not new.privada then
    perform public._slack(':white_check_mark: *' || quien || '* terminó: ' || new.titulo || case when cli <> '' then ' · _' || cli || '_' else '' end);
  end if;
  return new;
end $$;
drop trigger if exists aviso_cambio on public.tareas;
create trigger aviso_cambio after update on public.tareas for each row execute function public._aviso_cambio();

-- 3) El cliente aprueba o pide cambios (se dispara con su comentario)
create or replace function public._aviso_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
declare e public.entregas; p public.proyectos; cli text; aprobo boolean; r uuid; titulo text; sitio text;
begin
  if not exists (select 1 from public.profiles where id = new.autor_id and rol = 'cliente') then return new; end if;
  select * into e from public.entregas where id = new.entrega_id;
  select * into p from public.proyectos where id = e.proyecto_id;
  select nombre into cli from public.clientes where id = p.cliente_id;
  aprobo := e.estado = 'aprobado';
  titulo := case when aprobo then cli || ' aprobó ' || e.titulo else cli || ' pidió cambios en ' || e.titulo end;
  for r in select profile_id from public.proyecto_equipo where proyecto_id = p.id
           union select id from public.profiles where rol = 'admin' loop
    perform public._notificar(r, 'cliente', titulo, nullif(new.texto, case when aprobo then 'Aprobado.' else 'Pidió cambios.' end), p.id, null);
  end loop;
  select a.sitio into sitio from public.avisos_config a where id = 1;
  perform public._slack(case when aprobo then ':tada: ' else ':pencil2: ' end || '*' || titulo || '* (' || p.nombre || ')'
    || case when coalesce(new.texto, '') not in ('', 'Aprobado.', 'Pidió cambios.') then E'\n> ' || replace(new.texto, E'\n', E'\n> ') else '' end
    || E'\n<' || coalesce(sitio, '') || '|Abrir la plataforma>');
  return new;
end $$;
drop trigger if exists aviso_cliente on public.feedback;
create trigger aviso_cliente after insert on public.feedback for each row execute function public._aviso_cliente();

-- Slack: guardar y probar (solo admin)
create or replace function public.avisos_slack(url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el admin'; end if;
  if url is not null and url <> '' and url !~ '^https://hooks\.slack\.com/' then raise exception 'Ese link no parece de Slack (tiene que empezar con https://hooks.slack.com/)'; end if;
  update public.avisos_config set slack_url = nullif(url, '') where id = 1;
end $$;

create or replace function public.avisos_probar() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el admin'; end if;
  perform public._slack(':wave: La plataforma de 1607 ya está conectada a este canal.');
end $$;

revoke execute on function public._slack(text), public._notificar(uuid, text, text, text, uuid, uuid), public._actor_nombre(),
  public._cliente_de(public.tareas) from public, anon, authenticated;

-- Tiempo real para la campanita
do $$ begin
  alter publication supabase_realtime add table public.notificaciones;
exception when others then raise notice 'realtime: %', sqlerrm;
end $$;
