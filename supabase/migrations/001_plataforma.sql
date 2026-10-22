-- ============================================================================
-- Plataforma 1607 · esquema, seguridad (RLS) y lógica del servidor
-- Se corre una sola vez en Supabase: SQL Editor → pegar → Run.
-- Roles: admin (Tomás) · equipo (Matías, Camila) · cliente (cada marca).
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null,              -- slug: meso, jack, pepecafe…
  nombre text not null,
  color text not null default '#A9A79E',
  creado timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nombre text not null default '',
  rol text not null default 'cliente' check (rol in ('admin', 'equipo', 'cliente')),
  rol_texto text not null default '',      -- "Director creativo", "Diseño gráfico"…
  iniciales text not null default '',
  color text not null default '#8C8B84',
  cliente_id uuid references public.clientes (id) on delete set null,
  creado timestamptz not null default now()
);

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nombre text not null,
  rubro text not null default '',
  servicio text not null default 'Identidad visual',
  plan text not null default '',
  etapa int not null default 0 check (etapa between 0 and 6),   -- 6 = terminado
  inicio date,
  entrega_final date,
  hito_titulo text not null default '',
  hito_fecha date,
  ronda_actual int,
  ronda_total int,
  colores text[] not null default array['#E9E6DF', '#2B2B2B', '#C74227'],
  creado timestamptz not null default now()
);

create table public.proyecto_equipo (
  proyecto_id uuid references public.proyectos (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  primary key (proyecto_id, profile_id)
);

create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  titulo text not null,
  etapa text not null,
  estado text not null default 'interno' check (estado in ('interno', 'enviado', 'aprobado', 'cambios')),
  fecha date,
  nota text,
  preview text not null default 'brief',
  orden int not null default 0,
  creado timestamptz not null default now()
);

create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.entregas (id) on delete cascade,
  nombre text not null,
  tipo text not null default 'PDF',
  peso text not null default '',
  storage_path text,                       -- ruta en el bucket "entregas"
  creado timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.entregas (id) on delete cascade,
  autor_id uuid references public.profiles (id) on delete set null,
  autor_nombre text not null,
  texto text not null,
  creado timestamptz not null default now()
);

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  proyecto_id uuid references public.proyectos (id) on delete cascade,
  titulo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'curso', 'hecha')),
  prioridad text check (prioridad in ('alta', 'media', 'baja')),
  inicio date,
  fin date,
  equipo text[] not null default '{}',
  etapa text,
  privada boolean not null default false,  -- solo la ve el admin (ej. cobros)
  plantilla boolean not null default false,
  notion boolean not null default false,
  notas text,
  checklist jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  creado_por uuid references public.profiles (id) on delete set null,
  creado timestamptz not null default now()
);

create table public.tarea_responsables (
  tarea_id uuid references public.tareas (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  primary key (tarea_id, profile_id)
);

create table public.tarea_historial (
  id bigint generated always as identity primary key,
  tarea_id uuid not null references public.tareas (id) on delete cascade,
  quien uuid references public.profiles (id) on delete set null,
  tipo text not null default 'persona' check (tipo in ('persona', 'cliente', 'auto')),
  texto text not null,
  creado timestamptz not null default now()
);

create table public.actividad (
  id bigint generated always as identity primary key,
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  quien uuid references public.profiles (id) on delete set null,
  tipo text not null default 'persona' check (tipo in ('persona', 'cliente', 'auto')),
  texto text not null,
  creado timestamptz not null default now()
);

create table public.automatizaciones (
  id text primary key,
  activa boolean not null default true
);
insert into public.automatizaciones (id) values ('concepto'), ('cambios'), ('etapa'), ('saldo');

-- Finanzas (solo admin con Números desbloqueado)
create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  orden int not null,
  concepto text not null,
  pct int not null,
  monto numeric(12, 2) not null,
  estado text not null check (estado in ('pagado', 'pendiente', 'futuro')),
  detalle text not null default '',
  pagado_el date
);

create table public.cobros_extra (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  concepto text not null,
  monto numeric(12, 2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  detalle text not null default '',
  pagado_el date
);

create table public.pagos_equipo (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  monto numeric(12, 2) not null default 0,
  pagado numeric(12, 2) not null default 0,
  pagado_el date,
  unique (proyecto_id)
);

create table public.ajustes_numeros (
  id int primary key default 1 check (id = 1),
  pct_equipo int not null default 25,
  plan_anual jsonb not null default '{}'::jsonb
);
insert into public.ajustes_numeros (id) values (1);

-- Contraseña de Números: nunca se lee desde la app, solo a través de funciones
create table public.numeros_clave (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hash text not null,
  fallos int not null default 0,
  bloqueado_hasta timestamptz
);
create table public.numeros_sesiones (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expira timestamptz not null
);

create index on public.proyectos (cliente_id);
create index on public.entregas (proyecto_id);
create index on public.tareas (proyecto_id);
create index on public.tareas (cliente_id);
create index on public.actividad (proyecto_id, creado desc);

-- ---------------------------------------------------------------------------
-- Funciones de permisos
-- ---------------------------------------------------------------------------

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.profiles where id = auth.uid()
$$;
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.es_equipo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('admin', 'equipo') from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.mi_cliente() returns uuid
language sql stable security definer set search_path = public as $$
  select cliente_id from public.profiles where id = auth.uid() and rol = 'cliente'
$$;
create or replace function public.numeros_abierto() returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_admin() and exists (
    select 1 from public.numeros_sesiones where user_id = auth.uid() and expira > now()
  )
$$;

-- Perfil automático al crear un usuario (rol cliente sin marca = no ve nada hasta que lo asignes)
create or replace function public.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.nuevo_usuario();

-- Nadie puede cambiarse el rol ni la marca a sí mismo
create or replace function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = consola de Supabase o script con service key
  if auth.uid() is not null and not public.es_admin() and (new.rol is distinct from old.rol or new.cliente_id is distinct from old.cliente_id) then
    raise exception 'No tenés permiso para cambiar roles';
  end if;
  return new;
end $$;
create trigger proteger_perfil before update on public.profiles
  for each row execute function public.proteger_perfil();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.clientes enable row level security;
alter table public.profiles enable row level security;
alter table public.proyectos enable row level security;
alter table public.proyecto_equipo enable row level security;
alter table public.entregas enable row level security;
alter table public.archivos enable row level security;
alter table public.feedback enable row level security;
alter table public.tareas enable row level security;
alter table public.tarea_responsables enable row level security;
alter table public.tarea_historial enable row level security;
alter table public.actividad enable row level security;
alter table public.automatizaciones enable row level security;
alter table public.cuotas enable row level security;
alter table public.cobros_extra enable row level security;
alter table public.pagos_equipo enable row level security;
alter table public.ajustes_numeros enable row level security;
alter table public.numeros_clave enable row level security;     -- sin políticas: inaccesible
alter table public.numeros_sesiones enable row level security;  -- sin políticas: inaccesible

-- clientes
create policy "equipo ve y edita clientes" on public.clientes for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
create policy "cliente ve su marca" on public.clientes for select to authenticated
  using (id = public.mi_cliente());

-- profiles
create policy "equipo ve perfiles" on public.profiles for select to authenticated
  using (public.es_equipo() or id = auth.uid() or rol in ('admin', 'equipo'));
create policy "cada uno edita su perfil" on public.profiles for update to authenticated
  using (id = auth.uid() or public.es_admin()) with check (id = auth.uid() or public.es_admin());

-- proyectos
create policy "equipo gestiona proyectos" on public.proyectos for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
create policy "cliente ve su proyecto" on public.proyectos for select to authenticated
  using (cliente_id = public.mi_cliente());

create policy "equipo gestiona asignaciones" on public.proyecto_equipo for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
create policy "cliente ve su equipo" on public.proyecto_equipo for select to authenticated
  using (exists (select 1 from public.proyectos p where p.id = proyecto_id and p.cliente_id = public.mi_cliente()));

-- entregas: el cliente solo ve lo enviado; responde por función
create policy "equipo gestiona entregas" on public.entregas for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
create policy "cliente ve entregas enviadas" on public.entregas for select to authenticated
  using (estado <> 'interno' and exists (select 1 from public.proyectos p where p.id = proyecto_id and p.cliente_id = public.mi_cliente()));

create policy "equipo gestiona archivos" on public.archivos for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
create policy "cliente ve archivos enviados" on public.archivos for select to authenticated
  using (exists (select 1 from public.entregas e join public.proyectos p on p.id = e.proyecto_id
                 where e.id = entrega_id and e.estado <> 'interno' and p.cliente_id = public.mi_cliente()));

create policy "equipo ve feedback" on public.feedback for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
create policy "cliente ve su feedback" on public.feedback for select to authenticated
  using (exists (select 1 from public.entregas e join public.proyectos p on p.id = e.proyecto_id
                 where e.id = entrega_id and e.estado <> 'interno' and p.cliente_id = public.mi_cliente()));

-- tareas: solo el equipo; las privadas solo el admin
create policy "equipo ve tareas" on public.tareas for select to authenticated
  using (public.es_equipo() and (not privada or public.es_admin()));
create policy "equipo crea tareas" on public.tareas for insert to authenticated
  with check (public.es_equipo() and (not privada or public.es_admin()));
create policy "equipo edita tareas" on public.tareas for update to authenticated
  using (public.es_equipo() and (not privada or public.es_admin()))
  with check (public.es_equipo() and (not privada or public.es_admin()));
create policy "equipo borra tareas" on public.tareas for delete to authenticated
  using (public.es_equipo() and (not privada or public.es_admin()));

create policy "equipo gestiona responsables" on public.tarea_responsables for all to authenticated
  using (public.es_equipo() and exists (select 1 from public.tareas t where t.id = tarea_id))
  with check (public.es_equipo());
create policy "equipo ve historial" on public.tarea_historial for select to authenticated
  using (public.es_equipo() and exists (select 1 from public.tareas t where t.id = tarea_id));
create policy "equipo escribe historial" on public.tarea_historial for insert to authenticated
  with check (public.es_equipo() and quien = auth.uid());

create policy "equipo ve actividad" on public.actividad for select to authenticated using (public.es_equipo());
create policy "equipo escribe actividad" on public.actividad for insert to authenticated
  with check (public.es_equipo() and quien = auth.uid());

create policy "equipo ve automatizaciones" on public.automatizaciones for select to authenticated using (public.es_equipo());
create policy "admin cambia automatizaciones" on public.automatizaciones for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- finanzas: admin + Números desbloqueado
create policy "numeros cuotas" on public.cuotas for all to authenticated
  using (public.numeros_abierto()) with check (public.numeros_abierto());
create policy "numeros cobros extra" on public.cobros_extra for all to authenticated
  using (public.numeros_abierto()) with check (public.numeros_abierto());
create policy "numeros pagos equipo" on public.pagos_equipo for all to authenticated
  using (public.numeros_abierto()) with check (public.numeros_abierto());
create policy "numeros ajustes" on public.ajustes_numeros for all to authenticated
  using (public.numeros_abierto()) with check (public.numeros_abierto());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on public.numeros_clave, public.numeros_sesiones from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Números: contraseña aparte, verificada en el servidor
-- ---------------------------------------------------------------------------

create or replace function public.numeros_estado() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tiene_clave', exists (select 1 from public.numeros_clave where user_id = auth.uid()),
    'abierto', public.numeros_abierto()
  ) where public.es_admin()
$$;

create or replace function public.numeros_crear_clave(clave text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el admin puede usar Números'; end if;
  if exists (select 1 from public.numeros_clave where user_id = auth.uid()) then raise exception 'Ya tenés una contraseña'; end if;
  if length(clave) < 6 then raise exception 'Usá al menos 6 caracteres'; end if;
  insert into public.numeros_clave (user_id, hash) values (auth.uid(), extensions.crypt(clave, extensions.gen_salt('bf')));
  insert into public.numeros_sesiones (user_id, expira) values (auth.uid(), now() + interval '5 minutes')
    on conflict (user_id) do update set expira = excluded.expira;
  return true;
end $$;

create or replace function public.numeros_abrir(clave text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.numeros_clave;
begin
  if not public.es_admin() then raise exception 'Solo el admin puede usar Números'; end if;
  select * into r from public.numeros_clave where user_id = auth.uid();
  if r is null then return json_build_object('ok', false, 'motivo', 'sin_clave'); end if;
  if r.bloqueado_hasta is not null and r.bloqueado_hasta > now() then
    return json_build_object('ok', false, 'motivo', 'bloqueado', 'hasta', r.bloqueado_hasta);
  end if;
  if extensions.crypt(clave, r.hash) = r.hash then
    update public.numeros_clave set fallos = 0, bloqueado_hasta = null where user_id = auth.uid();
    insert into public.numeros_sesiones (user_id, expira) values (auth.uid(), now() + interval '5 minutes')
      on conflict (user_id) do update set expira = excluded.expira;
    return json_build_object('ok', true);
  end if;
  update public.numeros_clave
    set fallos = fallos + 1,
        bloqueado_hasta = case when fallos + 1 >= 5 then now() + interval '15 minutes' else null end
    where user_id = auth.uid();
  return json_build_object('ok', false, 'motivo', 'incorrecta', 'restantes', greatest(0, 4 - r.fallos));
end $$;

create or replace function public.numeros_mantener() returns boolean
language sql security definer set search_path = public as $$
  update public.numeros_sesiones set expira = now() + interval '5 minutes'
  where user_id = auth.uid() and expira > now() and public.es_admin()
  returning true
$$;

create or replace function public.numeros_cerrar() returns void
language sql security definer set search_path = public as $$
  delete from public.numeros_sesiones where user_id = auth.uid()
$$;

create or replace function public.numeros_cambiar_clave(actual text, nueva text) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.numeros_clave;
begin
  if not public.es_admin() then raise exception 'Solo el admin puede usar Números'; end if;
  if length(nueva) < 6 then raise exception 'Usá al menos 6 caracteres'; end if;
  select * into r from public.numeros_clave where user_id = auth.uid();
  if r is null or extensions.crypt(actual, r.hash) <> r.hash then raise exception 'La contraseña actual no es correcta'; end if;
  update public.numeros_clave set hash = extensions.crypt(nueva, extensions.gen_salt('bf')), fallos = 0, bloqueado_hasta = null
    where user_id = auth.uid();
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Lógica de proyectos y automatizaciones
-- ---------------------------------------------------------------------------

create or replace function public._auto(id text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select activa from public.automatizaciones a where a.id = _auto.id), false)
$$;

create or replace function public._actividad(p uuid, texto text, tipo text default 'persona') returns void
language sql security definer set search_path = public as $$
  insert into public.actividad (proyecto_id, quien, tipo, texto)
  values (p, case when tipo = 'persona' then auth.uid() else null end, tipo, texto)
$$;

create or replace function public._disenador(p uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select pe.profile_id from public.proyecto_equipo pe join public.profiles pr on pr.id = pe.profile_id
  where pe.proyecto_id = p order by (pr.rol = 'admin'), pr.nombre limit 1
$$;

create or replace function public._nueva_tarea(p_proyecto uuid, p_titulo text, p_quien uuid, p_prioridad text,
  p_inicio date, p_fin date, p_equipo text[], p_etapa text, p_privada boolean, p_notas text, p_origen text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid; c uuid;
begin
  select cliente_id into c from public.proyectos where id = p_proyecto;
  insert into public.tareas (cliente_id, proyecto_id, titulo, prioridad, inicio, fin, equipo, etapa, privada, notas)
  values (c, p_proyecto, p_titulo, p_prioridad, p_inicio, p_fin, p_equipo, p_etapa, p_privada, p_notas)
  returning id into t;
  if p_quien is not null then insert into public.tarea_responsables values (t, p_quien) on conflict do nothing; end if;
  insert into public.tarea_historial (tarea_id, tipo, texto) values (t, 'auto', 'creada por la automatización “' || p_origen || '”');
  return t;
end $$;

-- Cambia la etapa y dispara "llega a Entrega"
create or replace function public._mover_etapa(p uuid, nueva int) returns void
language plpgsql security definer set search_path = public as $$
declare anterior int; nom text; admin_id uuid;
  etapas text[] := array['Brief', 'Research', 'Concepto', 'Diseño', 'Revisiones', 'Entrega'];
begin
  nueva := greatest(0, least(6, nueva));
  select etapa, (select nombre from public.clientes where id = cliente_id) into anterior, nom from public.proyectos where id = p;
  update public.proyectos set etapa = nueva where id = p;
  if nueva = 5 and anterior < 5 and public._auto('saldo') then
    for admin_id in select id from public.profiles where rol = 'admin' loop
      perform public._nueva_tarea(p, 'Cobrar saldo (25%) antes de la entrega final', admin_id, 'alta',
        current_date + 2, null, array['Brand Strategist'], null, true, null, 'Llega a Entrega');
    end loop;
    perform public._actividad(p, nom || ' llegó a Entrega: tarea de cobrar el saldo creada', 'auto');
  end if;
end $$;

create or replace function public.mover_etapa(p uuid, nueva int) returns void
language plpgsql security definer set search_path = public as $$
declare etapas text[] := array['Brief', 'Research', 'Concepto', 'Diseño', 'Revisiones', 'Entrega', 'Terminado'];
begin
  if not public.es_equipo() then raise exception 'Sin permiso'; end if;
  perform public._mover_etapa(p, nueva);
  perform public._actividad(p, 'pasó el proyecto a ' || etapas[greatest(0, least(6, nueva)) + 1]);
end $$;

-- El cliente aprueba o pide cambios en una entrega enviada
create or replace function public.responder_entrega(entrega uuid, aprobar boolean, texto text default null) returns void
language plpgsql security definer set search_path = public as $$
declare e public.entregas; p public.proyectos; nom text; autor text; dis uuid; admin_id uuid; quien_tipo text;
begin
  select * into e from public.entregas where id = entrega;
  if e is null then raise exception 'Entrega inexistente'; end if;
  select * into p from public.proyectos where id = e.proyecto_id;
  if not (public.es_equipo() or p.cliente_id = public.mi_cliente()) then raise exception 'Sin permiso'; end if;
  if e.estado <> 'enviado' then raise exception 'Esta entrega no está esperando respuesta'; end if;
  select nombre into nom from public.clientes where id = p.cliente_id;
  quien_tipo := case when public.es_equipo() then 'persona' else 'cliente' end;
  autor := case when quien_tipo = 'cliente' then nom else (select nombre from public.profiles where id = auth.uid()) end;

  update public.entregas set estado = case when aprobar then 'aprobado' else 'cambios' end where id = entrega;
  insert into public.feedback (entrega_id, autor_id, autor_nombre, texto)
    values (entrega, auth.uid(), autor, coalesce(nullif(texto, ''), case when aprobar then 'Aprobado.' else 'Pidió cambios.' end));
  perform public._actividad(p.id, case when aprobar then autor || ' aprobó ' || e.titulo else autor || ' pidió cambios en ' || e.titulo end, quien_tipo);

  dis := public._disenador(p.id);
  if aprobar and e.etapa = 'Concepto' and p.etapa = 2 and public._auto('concepto') then
    update public.entregas set estado = 'interno'
      where proyecto_id = p.id and etapa = 'Concepto' and estado = 'enviado' and id <> entrega;
    perform public._mover_etapa(p.id, 3);
    perform public._nueva_tarea(p.id, 'Arrancar sistema visual sobre ' || e.titulo, dis, 'alta', current_date, current_date + 5,
      array['Design'], 'Diseño', false, null, 'Concepto aprobado');
    for admin_id in select id from public.profiles where rol = 'admin' loop
      perform public._nueva_tarea(p.id, 'Cobrar segunda cuota (25%)', admin_id, 'alta', current_date + 3, null,
        array['Brand Strategist'], null, true, null, 'Concepto aprobado');
    end loop;
    perform public._actividad(p.id, nom || ' eligió ' || e.titulo || ': el proyecto pasó a Diseño', 'auto');
  end if;
  if not aprobar and public._auto('cambios') then
    perform public._nueva_tarea(p.id, 'Aplicar cambios en ' || e.titulo, dis, 'alta', current_date, current_date + 2,
      array['Design'], (array['Brief', 'Research', 'Concepto', 'Diseño', 'Revisiones', 'Entrega'])[least(p.etapa, 5) + 1], false,
      'Lo que pidió ' || nom || ': “' || coalesce(texto, '') || '”', 'Cambios pedidos');
    perform public._actividad(p.id, nom || ' pidió cambios: tarea creada para diseño', 'auto');
  end if;
end $$;

-- Cambiar estado de una tarea (con historial y "etapa completa")
create or replace function public.estado_tarea(tarea uuid, nuevo text) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tareas; p public.proyectos; etapas text[] := array['Brief', 'Research', 'Concepto', 'Diseño', 'Revisiones', 'Entrega'];
  etiqueta text;
begin
  select * into t from public.tareas where id = tarea;
  if t is null or not public.es_equipo() or (t.privada and not public.es_admin()) then raise exception 'Sin permiso'; end if;
  update public.tareas set estado = nuevo where id = tarea;
  etiqueta := case nuevo when 'pendiente' then 'Sin empezar' when 'curso' then 'En curso' else 'Hecho' end;
  insert into public.tarea_historial (tarea_id, quien, texto) values (tarea, auth.uid(), 'pasó la tarea a ' || etiqueta);

  if nuevo = 'hecha' and t.proyecto_id is not null and t.etapa is not null and public._auto('etapa') then
    select * into p from public.proyectos where id = t.proyecto_id;
    if p.etapa < 6 and etapas[p.etapa + 1] = t.etapa
       and not exists (select 1 from public.tareas x where x.proyecto_id = p.id and x.etapa = t.etapa and x.estado <> 'hecha') then
      perform public._mover_etapa(p.id, p.etapa + 1);
      perform public._actividad(p.id, 'se terminó ' || t.etapa || ', el proyecto avanzó de etapa', 'auto');
    end if;
  end if;
end $$;

-- Nuevo proyecto desde la plantilla (lo puede crear cualquiera del equipo; las cuotas se crean igual)
create or replace function public.crear_proyecto(datos json) returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid; p uuid; total numeric; t json; nueva uuid; clave_c text;
begin
  if not public.es_equipo() then raise exception 'Sin permiso'; end if;
  clave_c := datos ->> 'clave';
  insert into public.clientes (clave, nombre, color) values (clave_c, datos ->> 'cliente', coalesce(datos ->> 'color', '#B5651D'))
    on conflict (clave) do update set nombre = excluded.nombre returning id into c;
  total := (datos ->> 'total')::numeric;
  insert into public.proyectos (clave, cliente_id, nombre, servicio, plan, etapa, inicio, entrega_final, hito_titulo, hito_fecha, ronda_actual, ronda_total)
  values (clave_c, c, 'Identidad ' || (datos ->> 'cliente'), 'Identidad visual', datos ->> 'plan', 0,
          (datos ->> 'inicio')::date, (datos ->> 'inicio')::date + 42, 'Conversación inicial', (datos ->> 'inicio')::date, 1, 2)
  returning id into p;
  insert into public.proyecto_equipo select p, x::uuid from json_array_elements_text(datos -> 'equipo') x on conflict do nothing;
  insert into public.entregas (proyecto_id, titulo, etapa, preview, orden) values
    (p, 'Brief estratégico', 'Brief', 'brief', 1), (p, 'Concepto A', 'Concepto', 'conceptoA', 2),
    (p, 'Concepto B', 'Concepto', 'conceptoB', 3), (p, 'Manual de marca', 'Entrega', 'manual', 4);
  insert into public.cuotas (proyecto_id, orden, concepto, pct, monto, estado, detalle) values
    (p, 1, 'Anticipo', 50, total * 0.5, 'pendiente', 'Al aceptar la propuesta'),
    (p, 2, 'Segunda cuota', 25, total * 0.25, 'futuro', 'Al aprobar la propuesta de concepto'),
    (p, 3, 'Saldo', 25, total * 0.25, 'futuro', 'Antes de la entrega final');
  insert into public.pagos_equipo (proyecto_id, profile_id, monto)
    select p, public._disenador(p), round(total * (select pct_equipo from public.ajustes_numeros where id = 1) / 100.0)
    where public._disenador(p) is not null;
  for t in select * from json_array_elements(datos -> 'tareas') loop
    insert into public.tareas (cliente_id, proyecto_id, titulo, prioridad, inicio, fin, equipo, etapa, plantilla, creado_por)
    values (c, p, t ->> 'titulo', t ->> 'prioridad', (t ->> 'inicio')::date, nullif(t ->> 'fin', '')::date,
            array(select json_array_elements_text(t -> 'equipo')), t ->> 'etapa', true, auth.uid())
    returning id into nueva;
    insert into public.tarea_responsables values (nueva, (t ->> 'quien')::uuid) on conflict do nothing;
    insert into public.tarea_historial (tarea_id, quien, texto) values (nueva, auth.uid(), 'creada desde la plantilla Nuevo proyecto');
  end loop;
  perform public._actividad(p, 'creó el proyecto con la plantilla ' || (datos ->> 'plan'));
  return p;
end $$;

-- Las funciones internas no se pueden llamar desde la app
revoke execute on function public._auto(text), public._actividad(uuid, text, text), public._disenador(uuid),
  public._nueva_tarea(uuid, text, uuid, text, date, date, text[], text, boolean, text, text),
  public._mover_etapa(uuid, int) from public, anon, authenticated;
revoke execute on function public.nuevo_usuario(), public.proteger_perfil() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Archivos (Storage): bucket privado "entregas"; ruta = <proyecto_id>/<entrega_id>/<archivo>
-- ---------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('entregas', 'entregas', false) on conflict (id) do nothing;
    execute $p$ create policy "equipo sube y ve archivos" on storage.objects for all to authenticated
      using (bucket_id = 'entregas' and public.es_equipo()) with check (bucket_id = 'entregas' and public.es_equipo()) $p$;
    execute $p$ create policy "cliente descarga lo enviado" on storage.objects for select to authenticated
      using (bucket_id = 'entregas' and exists (
        select 1 from public.archivos a join public.entregas e on e.id = a.entrega_id join public.proyectos p on p.id = e.proyecto_id
        where a.storage_path = name and e.estado <> 'interno' and p.cliente_id = public.mi_cliente())) $p$;
  end if;
end $$;
