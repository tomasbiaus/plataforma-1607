-- Etapas propias por proyecto (ej. Manki: Naming → Diseño). Sin etapas propias = las 6 de siempre.
alter table public.proyectos add column if not exists etapas text[];

create or replace function public._etapas(p public.proyectos) returns text[]
language sql immutable as $$
  select case when p.etapas is null or cardinality(p.etapas) = 0
    then array['Brief', 'Research', 'Concepto', 'Diseño', 'Revisiones', 'Entrega'] else p.etapas end
$$;

-- la etapa puede ir de 0 a la cantidad de etapas (= terminado)
alter table public.proyectos drop constraint if exists proyectos_etapa_check;
alter table public.proyectos add constraint proyectos_etapa_check
  check (etapa >= 0 and etapa <= coalesce(nullif(cardinality(etapas), 0), 6));

create or replace function public._mover_etapa(p uuid, nueva int) returns void
language plpgsql security definer set search_path = public as $$
declare anterior int; nom text; admin_id uuid; pr public.proyectos; n int; ultima text;
begin
  select * into pr from public.proyectos where id = p;
  n := cardinality(public._etapas(pr));
  ultima := (public._etapas(pr))[n];
  nueva := greatest(0, least(n, nueva));
  anterior := pr.etapa;
  select nombre into nom from public.clientes where id = pr.cliente_id;
  update public.proyectos set etapa = nueva where id = p;
  -- llega a la última etapa: tarea privada de cobrar el saldo
  if nueva = n - 1 and anterior < n - 1 and public._auto('saldo') then
    for admin_id in select id from public.profiles where rol = 'admin' loop
      perform public._nueva_tarea(p, 'Cobrar saldo (25%) antes de la entrega final', admin_id, 'alta',
        current_date + 2, null, array['Brand Strategist'], null, true, null, 'Llega a ' || ultima);
    end loop;
    perform public._actividad(p, nom || ' llegó a ' || ultima || ': tarea de cobrar el saldo creada', 'auto');
  end if;
end $$;

create or replace function public.mover_etapa(p uuid, nueva int) returns void
language plpgsql security definer set search_path = public as $$
declare pr public.proyectos; et text[];
begin
  if not public.es_equipo() then raise exception 'Sin permiso'; end if;
  perform public._mover_etapa(p, nueva);
  select * into pr from public.proyectos where id = p;
  et := public._etapas(pr);
  perform public._actividad(p, 'pasó el proyecto a ' || coalesce(et[pr.etapa + 1], 'Terminado'));
end $$;

-- Cambiar las etapas de un proyecto (solo equipo). Si la etapa actual ya no existe, queda en la última.
create or replace function public.cambiar_etapas(p uuid, nuevas text[], etapa_actual int default null) returns void
language plpgsql security definer set search_path = public as $$
declare limpias text[];
begin
  if not public.es_equipo() then raise exception 'Sin permiso'; end if;
  select array_agg(trim(x)) into limpias from unnest(nuevas) x where trim(x) <> '';
  if limpias is null or cardinality(limpias) = 0 then raise exception 'El proyecto necesita al menos una etapa'; end if;
  update public.proyectos set etapa = 0, etapas = limpias where id = p;
  update public.proyectos set etapa = greatest(0, least(cardinality(limpias), coalesce(etapa_actual, 0))) where id = p;
  perform public._actividad(p, 'cambió las etapas del proyecto: ' || array_to_string(limpias, ' → '));
end $$;
grant execute on function public.cambiar_etapas(uuid, text[], int) to authenticated;

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
  if aprobar and e.etapa = 'Concepto' and (public._etapas(p))[p.etapa + 1] = 'Concepto' and public._auto('concepto') then
    update public.entregas set estado = 'interno'
      where proyecto_id = p.id and etapa = 'Concepto' and estado = 'enviado' and id <> entrega;
    perform public._mover_etapa(p.id, p.etapa + 1);
    perform public._nueva_tarea(p.id, 'Arrancar sistema visual sobre ' || e.titulo, dis, 'alta', current_date, current_date + 5,
      array['Design'], 'Diseño', false, null, 'Concepto aprobado');
    for admin_id in select id from public.profiles where rol = 'admin' loop
      perform public._nueva_tarea(p.id, 'Cobrar segunda cuota (25%)', admin_id, 'alta', current_date + 3, null,
        array['Brand Strategist'], null, true, null, 'Concepto aprobado');
    end loop;
    perform public._actividad(p.id, nom || ' eligió ' || e.titulo || ': el proyecto pasó a ' || coalesce((public._etapas(p))[p.etapa + 2], 'la etapa siguiente'), 'auto');
  end if;
  if not aprobar and public._auto('cambios') then
    perform public._nueva_tarea(p.id, 'Aplicar cambios en ' || e.titulo, dis, 'alta', current_date, current_date + 2,
      array['Design'], (public._etapas(p))[least(p.etapa, cardinality(public._etapas(p)) - 1) + 1], false,
      'Lo que pidió ' || nom || ': “' || coalesce(texto, '') || '”', 'Cambios pedidos');
    perform public._actividad(p.id, nom || ' pidió cambios: tarea creada para diseño', 'auto');
  end if;
end $$;

create or replace function public.estado_tarea(tarea uuid, nuevo text) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tareas; p public.proyectos; etapas text[];
  etiqueta text;
begin
  select * into t from public.tareas where id = tarea;
  if t is null or not public.es_equipo() or (t.privada and not public.es_admin()) then raise exception 'Sin permiso'; end if;
  update public.tareas set estado = nuevo where id = tarea;
  etiqueta := case nuevo when 'pendiente' then 'Sin empezar' when 'curso' then 'En curso' else 'Hecho' end;
  insert into public.tarea_historial (tarea_id, quien, texto) values (tarea, auth.uid(), 'pasó la tarea a ' || etiqueta);

  if nuevo = 'hecha' and t.proyecto_id is not null and t.etapa is not null and public._auto('etapa') then
    select * into p from public.proyectos where id = t.proyecto_id;
    etapas := public._etapas(p);
    if p.etapa < cardinality(etapas) and etapas[p.etapa + 1] = t.etapa
       and not exists (select 1 from public.tareas x where x.proyecto_id = p.id and x.etapa = t.etapa and x.estado <> 'hecha') then
      perform public._mover_etapa(p.id, p.etapa + 1);
      perform public._actividad(p.id, 'se terminó ' || t.etapa || ', el proyecto avanzó de etapa', 'auto');
    end if;
  end if;
end $$;

revoke execute on function public._mover_etapa(uuid, int) from public, anon, authenticated;
